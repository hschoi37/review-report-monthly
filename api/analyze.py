from http.server import BaseHTTPRequestHandler
import json
import io
import pandas as pd
import openai
from typing import Dict, List, Any
import cgi
import os

class CommentAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def identify_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        cols = df.columns.tolist()
        mapping = {}
        for c in cols:
            c_s = str(c).strip()
            if any(k in c_s for k in ['가맹점', '지점', '매장']): 
                mapping['franchise'] = c
            if any(k in c_s for k in ['작성일', '날짜', 'Date']): 
                mapping['date'] = c
            if any(k in c_s for k in ['별점', '점수', 'Rating']): 
                mapping['rating'] = c
            if any(k in c_s for k in ['댓글내용(한글)', '한글댓글']): 
                mapping['comment_ko'] = c
            if any(k in c_s for k in ['댓글내용(중국어)', '중국어댓글']): 
                mapping['comment_zh'] = c
            if any(k in c_s for k in ['답글내용(한글)', '한글답글']): 
                mapping['reply_ko'] = c

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

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            
            if 'multipart/form-data' not in content_type:
                self.send_error(400, "Content-Type must be multipart/form-data")
                return
            
            # Parse the form data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': content_type,
                }
            )
            
            # Get form fields
            if 'file' not in form:
                self.send_error(400, "No file uploaded")
                return
            
            file_item = form['file']
            franchise = form.getvalue('franchise')
            month = form.getvalue('month')
            api_key = form.getvalue('api_key')
            model = form.getvalue('model', 'gpt-4o-mini')
            
            if not all([franchise, month, api_key]):
                self.send_error(400, "Missing required fields")
                return
            
            # Read file content
            file_content = file_item.file.read()
            
            # Parse Excel file
            df = pd.read_excel(io.BytesIO(file_content))
            
            # Analyze
            analyzer = CommentAnalyzer(api_key)
            mapping = analyzer.identify_columns(df)
            
            df[mapping['date']] = pd.to_datetime(df[mapping['date']], errors='coerce')
            mask = (df[mapping['franchise']].astype(str) == franchise) & (df[mapping['date']].dt.strftime('%Y-%m') == month)
            filtered_df = df[mask]
            
            if filtered_df.empty:
                self.send_error(404, "No data found for selected criteria")
                return
            
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
            
            response = {
                "analysis": ai_result,
                "stats": stats,
                "neg_reviews": neg_reviews,
                "meta": {"franchise": franchise, "month": month}
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

