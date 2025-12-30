from fastapi import FastAPI, File, UploadFile, HTTPException, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.staticfiles import StaticFiles
import pandas as pd
import io
import os
import json
import openai
from typing import Dict, List, Any
from dotenv import load_dotenv

load_dotenv()

# FastAPI 앱 생성
app = FastAPI(title="가맹점 댓글 분석 API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 전용 라우터 생성
api_router = APIRouter(prefix="/api", tags=["api"])

# ASGI 미들웨어: API와 정적 파일 서빙 완전 분리
class StaticFilesMiddleware:
    """
    API 요청과 정적 파일 요청을 ASGI 레벨에서 분리하여
    FastAPI 라우팅 충돌을 근본적으로 해결하는 미들웨어
    """
    def __init__(self, app, static_dir="dist"):
        self.app = app
        self.static_dir = static_dir
        self.static_files = StaticFiles(directory=static_dir, html=True)
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope["path"]
            # /api로 시작하는 모든 요청은 FastAPI로 전달 (POST, GET 등 모든 메서드)
            if path.startswith("/api"):
                await self.app(scope, receive, send)
                return
            # 정적 파일이 존재하면 정적 파일 서빙
            if os.path.exists(self.static_dir):
                await self.static_files(scope, receive, send)
                return
        # 기타 요청은 FastAPI로 전달
        await self.app(scope, receive, send)

class CommentAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def identify_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        cols = df.columns.tolist()
        mapping = {}
        for c in cols:
            c_s = str(c).strip()
            if any(k in c_s for k in ['가맹점', '지점', '매장']): mapping['franchise'] = c
            if any(k in c_s for k in ['작성일', '날짜', 'Date']): mapping['date'] = c
            if any(k in c_s for k in ['별점', '점수', 'Rating']): mapping['rating'] = c
            if any(k in c_s for k in ['댓글내용(한글)', '한글댓글']): mapping['comment_ko'] = c
            if any(k in c_s for k in ['댓글내용(중국어)', '중국어댓글']): mapping['comment_zh'] = c
            if any(k in c_s for k in ['답글내용(한글)', '한글답글']): mapping['reply_ko'] = c

        if 'comment_ko' not in mapping and 'comment_zh' not in mapping:
            for c in cols:
                if any(k in str(c) for k in ['댓글', 'Content', 'Comment']):
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
            return {
                "total_comments": total,
                "rating_avg": avg,
                "daily_avg": daily,
                "top_dates": top_dates,
                "sentiment_dist": self.calculate_sentiment_dist(df, rating_col)
            }
        except:
            return {"total_comments": len(df), "rating_avg": 0, "daily_avg": 0, "top_dates": [], "sentiment_dist": {"positive": 0, "neutral": 0, "negative": 0}}

    def calculate_sentiment_dist(self, df: pd.DataFrame, rating_col: str) -> Dict[str, int]:
        total = len(df)
        if total == 0: return {"positive": 0, "neutral": 0, "negative": 0}
        pos = len(df[df[rating_col] >= 4.0])
        neg = len(df[df[rating_col] <= 3.0])
        neu = total - pos - neg
        return {
            "positive": round((pos/total)*100, 1),
            "neutral": round((neu/total)*100, 1),
            "negative": round((neg/total)*100, 1)
        }

    def analyze_comments(self, comments: List[str], franchise: str, month: str, stats: Dict, model: str) -> Dict:
        prompt = f"""당신은 전문 데이터 분석가입니다. 다음 리뷰 데이터를 분석하여 JSON으로 응답하세요.
모든 텍스트는 반드시 한글로 작성하세요. 키워드 설명(desc)은 한글 15~25자 내외로 작성하세요.
데이터: {chr(10).join([f"- {c}" for c in comments[:150]])}
형식: {{"summary": "...", "insight": "...", "sentiment": {{"positive": 0, "neutral": 0, "negative": 0}}, "pros": [{{"title": "...", "content": "..."}}], "cons": [{{"title": "...", "content": "..."}}], "keywords": [{{"tag": "키워드", "is_positive": true, "desc": "15-25자 설명"}}], "action_plan": ["..."]}}
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

# --- API 엔드포인트 (최우선 등록) ---

@api_router.post("/prepare")
async def prepare_analysis(file: UploadFile = File(...)):
    """파일에서 가맹점과 월 정보 추출"""
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
        raise HTTPException(status_code=500, detail=f"파일 처리 오류: {str(e)}")

@api_router.post("/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    franchise: str = Form(...),
    month: str = Form(...),
    api_key: str = Form(...),
    model: str = Form("gpt-4o-mini")
):
    """댓글 데이터 AI 분석"""
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        analyzer = CommentAnalyzer(api_key)
        mapping = analyzer.identify_columns(df)
        
        df[mapping['date']] = pd.to_datetime(df[mapping['date']], errors='coerce')
        mask = (df[mapping['franchise']].astype(str) == franchise) & (df[mapping['date']].dt.strftime('%Y-%m') == month)
        filtered_df = df[mask]
        
        if filtered_df.empty:
            raise HTTPException(status_code=404, detail="선택한 조건에 해당하는 데이터가 없습니다")
        
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
        
        return {
            "analysis": ai_result,
            "stats": stats,
            "neg_reviews": neg_reviews,
            "meta": {"franchise": franchise, "month": month}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"분석 오류: {str(e)}")

# API 라우터 등록
app.include_router(api_router)

# --- ASGI 미들웨어 적용 (정적 파일 서빙) ---
# 기존의 @app.get() 라우트 방식 대신 미들웨어를 사용하여 라우팅 충돌 완전 제거
if os.path.exists("dist"):
    app = StaticFilesMiddleware(app)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        forwarded_allow_ips="*",
        proxy_headers=True
    )
