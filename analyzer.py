from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

app = FastAPI(title="가맹점 댓글 분석 API")

# CORS 설정
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
        # 클라이언트는 분석 요청 시 모델에 따라 동적으로 생성하거나 여기서 미리 생성
        # 편의상 여기서 생성하되, 키가 유효하지 않으면 실제 호출 시 에러 발생
        self.anthropic = anthropic.Anthropic(api_key=api_key) if api_key else None

    def identify_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        cols = df.columns.tolist()
        mapping = {}
        
        # 가맹점명
        for c in cols:
            if any(k in str(c) for k in ['가맹점', '지점', '매장', 'Store', 'Branch']):
                mapping['franchise'] = c
                break
        
        # 작성일
        for c in cols:
            if any(k in str(c) for k in ['작성일', '날짜', 'Date', 'Time']):
                mapping['date'] = c
                break
                
        # 별점
        for c in cols:
            if any(k in str(c) for k in ['별점', '점수', 'Rating', 'Score', '평점']):
                mapping['rating'] = c
                break
                
        # 댓글 내용 (한국어 중심, 없으면 중국어)
        for c in cols:
            c_str = str(c)
            if any(k in c_str for k in ['댓글내용(한글)', '한글댓글', 'Korean Comment']):
                mapping['comment_ko'] = c
            if any(k in c_str for k in ['댓글내용(중국어)', '중국어댓글', 'Chinese Comment']):
                mapping['comment_zh'] = c
            if any(k in c_str for k in ['답글내용(한글)', '한글답글', 'Reply']):
                mapping['reply_ko'] = c

        if 'comment_ko' not in mapping and 'comment_zh' not in mapping:
            for c in cols:
                if any(k in str(c) for k in ['댓글', 'Content', 'Comment', 'Review']):
                    mapping['comment'] = c
                    break
        
        if 'comment' not in mapping:
            mapping['comment'] = mapping.get('comment_ko', mapping.get('comment_zh', cols[3] if len(cols)>3 else cols[0]))
        
        # 기본값 설정
        if 'franchise' not in mapping: mapping['franchise'] = cols[0]
        if 'date' not in mapping: mapping['date'] = cols[1] if len(cols)>1 else cols[0]
        if 'rating' not in mapping: mapping['rating'] = cols[2] if len(cols)>2 else cols[0]
        if 'comment' not in mapping: mapping['comment'] = cols[3] if len(cols)>3 else cols[0]
        
        return mapping

    def get_basic_stats(self, df: pd.DataFrame, date_col: str, rating_col: str) -> Dict[str, Any]:
        try:
            df[date_col] = pd.to_datetime(df[date_col])
            total_comments = len(df)
            rating_avg = round(df[rating_col].mean(), 2)
            
            # 일 평균 계산
            days = (df[date_col].max() - df[date_col].min()).days + 1
            daily_avg = round(total_comments / days, 1) if days > 0 else total_comments
            
            # 가장 많이 달린 날 Top 3
            top_dates_df = df[date_col].dt.date.value_counts().head(3)
            top_dates = [{"date": str(date), "count": int(count)} for date, count in top_dates_df.items()]
            
            return {
                "total_comments": total_comments,
                "rating_avg": rating_avg,
                "daily_avg": daily_avg,
                "top_dates": top_dates,
                "sentiment_dist": self.calculate_sentiment_dist(df, rating_col)
            }
        except:
            return {
                "total_comments": len(df), 
                "rating_avg": 0, 
                "daily_avg": 0, 
                "top_dates": [],
                "sentiment_dist": {"positive": 0, "neutral": 0, "negative": 0}
            }

    def calculate_sentiment_dist(self, df: pd.DataFrame, rating_col: str) -> Dict[str, int]:
        total = len(df)
        if total == 0: return {"positive": 0, "neutral": 0, "negative": 0}
        
        # 규칙: 5~4 긍정, 3.5~3 중립 (3이하 부정 규칙과 충돌하므로 3.5만 중립 또는 3초과 4미만), 3이하 부정
        # 해석: Positive >= 4.0, Negative <= 3.0, Neutral = 나머지 (3.0 < x < 4.0)
        pos = len(df[df[rating_col] >= 4.0])
        neg = len(df[df[rating_col] <= 3.0])
        neu = total - pos - neg
        
        return {
            "positive": round((pos / total) * 100, 1),
            "neutral": round((neu / total) * 100, 1),
            "negative": round((neg / total) * 100, 1)
        }

    
    def analyze_comments(self, comments: List[str], franchise: str, month: str, stats: Dict, model: str) -> Dict:
        prompt = f"""
# Role: 전문 데이터 분석가 및 CS 컨설턴트
당신은 식당 고객 리뷰를 분석하여 사장님을 위한 '고객 리뷰 분석 리포트'를 작성하는 전문가입니다. 제공된 데이터를 바탕으로 다음의 엄격한 규칙을 준수하여 리포트를 작성하세요.

# Core Rules (언어 및 분석 범위):
1. **언어 제한**: '주의 필요 댓글' 섹션의 **[중국어 원문]**을 제외한 리포트의 모든 텍스트(제목, 분석 내용, 제안, 번역, 답글 등)는 반드시 **한글로만 작성**해야 합니다.
2. **주의 필요 댓글 전수 분석**: 별점이 3점 이하인 모든 리뷰를 누락 없이 '주의 필요 댓글' 섹션에 포함해야 합니다.

# Task Details:
1. **전체 통계 및 분위기**:
    - 총 리뷰 수({stats['total_comments']}건), 일평균 리뷰 수({stats['daily_avg']}건), 리뷰 최다 발생 TOP 3 날짜를 고려합니다.
    - 긍정/중립/부정 비율을 계산하고 전체적인 여론을 요약합니다.
2. **긍정 및 개선 분석**:
    - 고객이 칭찬한 요소 4가지(맛, 분위기, 서비스, 위치 등)를 정리합니다.
    - 아쉬운 점을 정리하되, '사장님을 위한 제안'은 제외합니다.
3. **핵심 인사이트 및 실행 계획**:
    - 사장님이 가장 주목해야 할 핵심 인사이트(문제의 원인이나 숨겨진 기회)를 1~2문장으로 도출합니다.
    - 주요 키워드 7개를 해시태그(#)와 함께 설명합니다. 각 키워드의 설명(desc)은 한글로 최소 15자 이상, 최대 25자 이하로 작성하세요.
    - 다음 달을 위해 우선순위가 높은 순서대로 5가지 구체적인 실행 계획을 제시합니다.

[분석할 고객 리뷰 목록]
{chr(10).join([f"- {c}" for c in comments[:150]])}

# Output Format (JSON Only):
{{
  "summary": "리뷰 평가 요약 (고객의 감정과 여론을 중심으로 한 한 줄 요약)",
  "insight": "핵심 인사이트 (사장님을 위한 전략적 시사점이 담긴 1~2문장 요약)",
  "sentiment": {{
    "positive": 긍정 비율(0-100),
    "neutral": 중립 비율(0-100),
    "negative": 부정 비율(0-100)
  }},
  "pros": [
    {{"title": "칭찬 키워드", "content": "상세 설명 (반드시 한국어로 번역/요약)"}},
    ... (4개)
  ],
  "cons": [
    {{"title": "아쉬운 점 키워드", "content": "상세 설명 (반드시 한국어로 번역/요약)"}},
    ... (4개)
  ],
  "keywords": [
    {{"tag": "키워드", "is_positive": true/false, "desc": "간결한 설명 (최소 15자 이상, 최대 25자 이하)"}},
    ... (7개)
  ],
  "action_plan": [
    "구체적인 실행 계획 1 (우선순위 높음)",
    ... (5개)
  ]
}}
JSON만 출력하세요.
"""
        try:
            content = ""
            if model.startswith("gpt"):
                # OpenAI 사용
                client = openai.OpenAI(api_key=self.api_key)
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful data analyst. Respond only in JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content
            else:
                # Anthropic 사용
                response = self.anthropic.messages.create(
                    model=model,
                    max_tokens=4000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = response.content[0].text
            
            # JSON 파싱 공통 로직
            start = content.find('{')
            end = content.rfind('}')
            if start != -1 and end != -1:
                return json.loads(content[start:end+1])
            else:
                raise Exception("JSON 형식을 찾을 수 없습니다.")

        except Exception as e:
            raise Exception(f"AI 분석 실패 ({model}): {str(e)}")

@app.post("/api/prepare")
async def prepare_analysis(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        analyzer = CommentAnalyzer("") # API 키 불필요 (메타데이터용)
        mapping = analyzer.identify_columns(df)
        
        # 가맹점 및 월 목록
        # 날짜 컬럼 정규화
        date_col = mapping.get('date')
        if not date_col or date_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"날짜 컬럼을 찾을 수 없습니다. (발견된 컬럼: {df.columns.tolist()})")
            
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])
        
        if df.empty:
            raise HTTPException(status_code=400, detail="유효한 날짜 데이터가 없습니다.")
            
        franchise_col = mapping.get('franchise')
        if not franchise_col or franchise_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"가맹점 컬럼을 찾을 수 없습니다. (발견된 컬럼: {df.columns.tolist()})")

        franchises = sorted(df[franchise_col].unique().astype(str).tolist())
        months = sorted(df[date_col].dt.strftime('%Y-%m').unique().tolist(), reverse=True)
        
        return {
            "franchises": franchises,
            "months": months,
            "mapping": mapping
        }
    except Exception as e:
        print(f"Error in /api/prepare: {str(e)}")
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {str(e)}")

@app.post("/api/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    franchise: str = Form(...),
    month: str = Form(...),
    api_key: str = Form(...),
    model: str = Form("gpt-4o-mini")
):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    analyzer = CommentAnalyzer(api_key)
    mapping = analyzer.identify_columns(df)
    
    # 필터링
    df[mapping['date']] = pd.to_datetime(df[mapping['date']], errors='coerce')
    mask = (df[mapping['franchise']] == franchise) & (df[mapping['date']].dt.strftime('%Y-%m') == month)
    filtered_df = df[mask]
    
    if filtered_df.empty:
        raise HTTPException(status_code=404, detail="해당 조건의 데이터가 없습니다.")
        
    stats = analyzer.get_basic_stats(filtered_df, mapping['date'], mapping['rating'])
    
    # 부정 리뷰 (별점 3점 이하)
    neg_mask = filtered_df[mapping['rating']] <= 3
    # 상세 필드 추출 (중국어원문, 한글번역, 한글답글 포함)
    detail_cols = [mapping['date'], mapping['rating']]
    if 'comment_zh' in mapping: detail_cols.append(mapping['comment_zh'])
    if 'comment_ko' in mapping: detail_cols.append(mapping['comment_ko'])
    if 'reply_ko' in mapping: detail_cols.append(mapping['reply_ko'])
    
    neg_reviews = filtered_df[mask & neg_mask][detail_cols].head(10).to_dict('records')
    
    final_neg_reviews = []
    for _, row in filtered_df[neg_mask].head(10).iterrows():
        final_neg_reviews.append({
            "date": str(row.get(mapping['date'], '')),
            "rating": float(row.get(mapping['rating'], 0)),
            "content_zh": str(row.get(mapping.get('comment_zh'), '')) if mapping.get('comment_zh') else "",
            "content_ko": str(row.get(mapping.get('comment_ko'), '')) if mapping.get('comment_ko') else "",
            "reply_ko": str(row.get(mapping.get('reply_ko'), '')) if mapping.get('reply_ko') else ""
        })

    comments = filtered_df[mapping['comment']].tolist()
    # model 파라미터에 따라 함수 내부에서 분기 처리됨
    ai_result = analyzer.analyze_comments(comments, franchise, month, stats, model)
    
    # AI 결과의 sentiment 값을 실제 통계 기반 값으로 덮어쓰기 (강제 적용)
    if 'sentiment_dist' in stats:
        if 'sentiment' not in ai_result: ai_result['sentiment'] = {}
        ai_result['sentiment']['positive'] = stats['sentiment_dist']['positive']
        ai_result['sentiment']['neutral'] = stats['sentiment_dist']['neutral']
        ai_result['sentiment']['negative'] = stats['sentiment_dist']['negative']

    return {
        "analysis": ai_result,
        "stats": stats,
        "neg_reviews": final_neg_reviews,
        "meta": {"franchise": franchise, "month": month}
    }

# --- 프론트엔드 서빙 설정 (배포용) ---
# dist 폴더가 존재할 경우 (빌드된 상태) 정적 파일 서빙
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API 요청은 제외하고 index.html 반환
        if full_path.startswith("api"):
            raise HTTPException(status_code=404)
        return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
