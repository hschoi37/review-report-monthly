from http.server import BaseHTTPRequestHandler
import json
import io
import pandas as pd
from typing import Dict, Any
import cgi
from urllib.parse import parse_qs

class CommentAnalyzer:
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
            
            # Get the uploaded file
            if 'file' not in form:
                self.send_error(400, "No file uploaded")
                return
            
            file_item = form['file']
            if not file_item.file:
                self.send_error(400, "Invalid file")
                return
            
            # Read file content
            file_content = file_item.file.read()
            
            # Parse Excel file
            df = pd.read_excel(io.BytesIO(file_content))
            
            # Identify columns
            analyzer = CommentAnalyzer()
            mapping = analyzer.identify_columns(df)
            
            # Extract date column
            date_col = mapping.get('date')
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=[date_col])
            
            # Get unique franchises and months
            franchises = sorted(df[mapping['franchise']].unique().astype(str).tolist())
            months = sorted(df[date_col].dt.strftime('%Y-%m').unique().tolist(), reverse=True)
            
            # Prepare response
            response = {
                "franchises": franchises,
                "months": months,
                "mapping": mapping
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

