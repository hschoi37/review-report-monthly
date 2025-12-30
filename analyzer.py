from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import pandas as pd
import io
import os
import json
import anthropic
import openai
from typing import Dict, List, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# 표준 FastAPI 설정
app = FastAPI(title="가맹점 댓글 분석 API")

# CORS 설정 (모든 도메인 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommentAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.anthropic = anthropic.Anthropic(api_key=api_key) if api_key else None

    def identify_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        cols = df.columns.tolist()
        mapping = {}
        for c in cols:
            c_s = str(c).strip()
            if any(k in c_s for k in ['가맹점', '지점', '매장', 'Store', 'Branch']): mapping['franchise'] = c
            if any(k in c_s for k in ['작성일', '날짜', 'Date', 'Time']): mapping['date'] = c
            if any(k in c_s for k in ['별점', '점수', 'Rating', 'Score', '평점']): mapping['rating'] = c
            if any(k in c_s for k in ['댓글내용(한글)', '한글댓글', 'Korean Comment']): mapping['comment_ko'] = c
            if any(k in c_s for k in ['댓글내용(중국어)', '중국어댓글', 'Chinese Comment']): mapping['comment_zh'] = c
            if any(k in c_s for k in ['답글내용(한글)', '한글답글', 'Reply']): mapping['reply_ko'] = c

        if 'comment_ko' not in mapping and 'comment_zh' not in mapping:
            for c in cols:
                if any(k in str(c) for k in ['댓글', 'Content', 'Comment', 'Review']):
                    mapping['comment'] = c
                    break
        
        if 'comment' not in mapping:
            mapping['comment'] = mapping.get('comment_ko', mapping.get('comment_zh', cols[3] if len(cols)>3 else cols[0]))
        
        if 'franchise' not in mapping: mapping['franchise'] = cols[0]
        if 'date' not in mapping: mapping['date'] = cols[1] if len(cols)>1 else cols[0]
        if 'rating' not in mapping: mapping['rating'] = cols[2] if len(cols)>2 else cols[0]
        return mapping

    def get_basic_stats(self, df: pd.DataFrame, date_col: str, rating_col: str) -> Dict[str, Any]:
        try:
            df[date_col] = pd.to_datetime(df[date_col])
            total = len(df)
            avg = round(df[rating_col].mean(), 2)
            days = (df[date_col].max() - df[date_col].min()).days + 1
            daily = round(total / days, 1) if days > 0 else total
            top_dates = [{"date": str(d), "count": int(c)} for d, c in df[date_col].dt.date.value_counts().head(3).items()]
            return {"total_comments": total, "rating_avg": avg, "daily_avg": daily, "top_dates": top_dates, "sentiment_dist": self.calculate_sentiment_dist(df, rating_col)}
        except:
            return {"total_comments": len(df), "rating_avg": 0, "daily_avg": 0, "top_dates": [], "sentiment_dist": {"positive": 0, "neutral": 0, "negative": 0}}

    def calculate_sentiment_dist(self, df: pd.DataFrame, rating_col: str) -> Dict[str, int]:
        total = len(df)
        if total == 0: return {"positive": 0, "neutral": 0, "negative": 0}
        pos = len(df[df[rating_col] >= 4.0])
        neg = len(df[df[rating_col] <= 3.0])
        neu = total - pos - neg
        return {"positive": round((pos/total)*100, 1), "neutral": round((neu/total)*100, 1), "negative": round((neg/total)*100, 1)}

    def analyze_comments(self, comments: List[str], franchise: str, month: str, stats: Dict, model: str) -> Dict:
        prompt = f"""당신은 전문 데이터 분석가입니다. 다음 리뷰 데이터를 분석하여 JSON으로 응답하세요.
        모든 텍스트는 반드시 한글로 작성하세요.
        중요: 키워드 설명(desc)은 한글 15~25자 내외로 작성하세요.
        데이터: {chr(10).join([f"- {c}" for c in comments[:150]])}
        형식: {{ "summary": "...", "insight": "...", "sentiment": {{ "positive": 0, "neutral": 0, "negative": 0 }}, "pros": [ {{ "title": "...", "content": "..." }} ], "cons": [ {{ "title": "...", "content": "..." }} ], "keywords": [ {{ "tag": "키워드", "is_positive": true, "desc": "15-25자 설명" }} ], "action_plan": ["..."] }}
        """
        try:
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            raise Exception(f"AI 분석 실패: {str(e)}")

# --- API 서버 기능 (우선순위 1등) ---

@app.post("/api/prepare")
async def prepare_analysis(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        analyzer = CommentAnalyzer("")
        mapping = analyzer.identify_columns(df)
        date_col = mapping.get('date')
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])
        franchises = sorted(df[mapping['franchise']].unique().astype(str).tolist())
        months = sorted(df[date_col].dt.strftime('%Y-%m').unique().tolist(), reverse=True)
        return {"franchises": franchises, "months": months, "mapping": mapping}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/api/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    franchise: str = Form(...),
    month: str = Form(...),
    api_key: str = Form(...),
    model: str = Form("gpt-4o-mini")
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        analyzer = CommentAnalyzer(api_key)
        mapping = analyzer.identify_columns(df)
        df[mapping['date']] = pd.to_datetime(df[mapping['date']], errors='coerce')
        mask = (df[mapping['franchise']].astype(str) == franchise) & (df[mapping['date']].dt.strftime('%Y-%m') == month)
        filtered_df = df[mask]
        if filtered_df.empty: return JSONResponse(status_code=404, content={"detail": "데이터 없음"})
        stats = analyzer.get_basic_stats(filtered_df, mapping['date'], mapping['rating'])
        neg_reviews = []
        for _, row in filtered_df[filtered_df[mapping['rating']] <= 3].head(10).iterrows():
            neg_reviews.append({
                "date": str(row.get(mapping['date'], '')),
                "rating": float(row.get(mapping['rating'], 0)),
                "content_zh": str(row.get(mapping.get('comment_zh'), '')) if mapping.get('comment_zh') else "",
                "content_ko": str(row.get(mapping.get('comment_ko'), '')) if mapping.get('comment_ko') else "",
                "reply_ko": str(row.get(mapping.get('reply_ko'), '')) if mapping.get('reply_ko') else ""
            })
        ai_result = analyzer.analyze_comments(filtered_df[mapping['comment']].tolist(), franchise, month, stats, model)
        ai_result['sentiment'] = stats['sentiment_dist']
        return {"analysis": ai_result, "stats": stats, "neg_reviews": neg_reviews, "meta": {"franchise": franchise, "month": month}}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

# --- 프론트엔드 화면 전송 기능 (나머지 모든 경우) ---

if os.path.exists("dist"):
    # /assets 폴더는 직접 서빙
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    # 그 외의 모든 요청(GET)은 index.html을 보여줌
    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        # API 경로로 잘못 들어온 GET 요청은 여기서 차단
        if full_path.startswith("api"):
            return JSONResponse(status_code=404, content={"detail": "API는 POST 방식만 지원합니다."})
        return FileResponse("dist/index.html")
    
    # 루트 경로 접속 시
    @app.get("/")
    async def root():
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    # Railway에서 할당해주는 PORT 사용
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
