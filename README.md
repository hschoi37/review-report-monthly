# RE-REPORT | AI 가맹점 리뷰 분석 시스템

> Next.js 14 + Python API Routes를 활용한 통합 리뷰 분석 플랫폼

## 🚀 주요 기능

- **엑셀 파일 자동 파싱**: 가맹점, 날짜, 별점, 댓글 컬럼 자동 인식
- **AI 기반 분석**: OpenAI GPT-4o-mini를 활용한 고급 감정 분석
- **실시간 리포트 생성**: 긍정/부정 요소, 키워드, 실행방안 자동 도출
- **인라인 편집**: 생성된 리포트를 바로 수정 가능
- **PNG/PDF 내보내기**: html2canvas와 jsPDF로 고품질 리포트 다운로드
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원

## 🏗️ 기술 스택

### 프론트엔드
- **Next.js 14** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** - 부드러운 애니메이션
- **Recharts** - 데이터 시각화
- **html2canvas & jsPDF** - 리포트 내보내기

### 백엔드
- **Python 3.9+** (Vercel Serverless Functions)
- **pandas & openpyxl** - 엑셀 데이터 처리
- **OpenAI Python SDK** - AI 분석

### 배포
- **Vercel** - 프론트엔드 + 백엔드 통합 배포

## 📦 설치 방법

### 1. 의존성 설치

```bash
# Node.js 패키지 설치
npm install

# Python 패키지 설치 (로컬 테스트용)
pip install -r api/requirements.txt
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

`.env.local` 파일 내용 (선택사항):
```env
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

> **참고**: API 키는 UI에서 직접 입력할 수도 있습니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 🌐 Vercel 배포

### 방법 1: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### 방법 2: GitHub 연동

1. 코드를 GitHub 저장소에 푸시
2. [Vercel](https://vercel.com)에서 저장소 연결
3. 자동 배포 완료

### 환경 변수 설정 (Vercel)

Vercel 대시보드 → Settings → Environment Variables:
- `NEXT_PUBLIC_OPENAI_API_KEY` (선택사항)

## 📚 프로젝트 구조

```
/
├── app/
│   ├── components/
│   │   ├── Sidebar.tsx          # API 키 입력, 설정
│   │   ├── FileUpload.tsx       # 엑셀 파일 업로드
│   │   ├── AnalysisForm.tsx     # 가맹점/월 선택
│   │   ├── ReportView.tsx       # 분석 결과 표시
│   │   └── LoadingSpinner.tsx   # 로딩 화면
│   ├── lib/
│   │   └── utils.ts             # 유틸리티 함수
│   ├── types/
│   │   └── index.ts             # TypeScript 타입 정의
│   ├── globals.css              # 전역 스타일
│   ├── layout.tsx               # 레이아웃
│   └── page.tsx                 # 메인 페이지
├── api/
│   ├── prepare.py               # 파일 분석 API
│   ├── analyze.py               # AI 분석 API
│   └── requirements.txt         # Python 패키지
├── public/                      # 정적 파일
├── next.config.js               # Next.js 설정
├── tailwind.config.ts           # Tailwind 설정
├── vercel.json                  # Vercel 배포 설정
└── README.md                    # 문서
```

## 🔧 API 엔드포인트

### POST /api/prepare
엑셀 파일에서 가맹점 목록과 월 정보를 추출합니다.

**요청**:
- `file`: 엑셀 파일 (.xlsx, .xls)

**응답**:
```json
{
  "franchises": ["가맹점1", "가맹점2", ...],
  "months": ["2024-12", "2024-11", ...],
  "mapping": {
    "franchise": "가맹점명",
    "date": "작성일",
    ...
  }
}
```

### POST /api/analyze
선택한 가맹점과 월에 대한 AI 분석을 수행합니다.

**요청**:
- `file`: 엑셀 파일
- `franchise`: 가맹점명
- `month`: 월 (YYYY-MM)
- `api_key`: OpenAI API 키
- `model`: AI 모델 (기본: gpt-4o-mini)

**응답**:
```json
{
  "analysis": {
    "summary": "...",
    "insight": "...",
    "sentiment": { "positive": 70, "neutral": 20, "negative": 10 },
    "pros": [...],
    "cons": [...],
    "keywords": [...],
    "action_plan": [...]
  },
  "stats": {
    "total_comments": 150,
    "rating_avg": 4.5,
    "daily_avg": 5.0,
    "top_dates": [...]
  },
  "neg_reviews": [...],
  "meta": { "franchise": "...", "month": "..." }
}
```

## 📊 데이터 형식

### 엑셀 파일 요구사항

업로드할 엑셀 파일은 다음 컬럼을 포함해야 합니다 (정확한 이름은 자동 인식):

- **가맹점/지점/매장**: 가맹점 식별자
- **작성일/날짜/Date**: 리뷰 작성 날짜
- **별점/점수/Rating**: 평점 (숫자)
- **댓글내용**: 리뷰 본문

선택적 컬럼:
- **댓글내용(한글)**: 한글 번역
- **댓글내용(중국어)**: 원문
- **답글내용(한글)**: 가맹점 답글

## 🎨 디자인 시스템

- **주요 색상**: Blue (#315ae7), Slate, Rose
- **폰트**: 시스템 기본 폰트 스택
- **애니메이션**: Framer Motion
- **차트**: Recharts (Pie Chart)

## 🔒 보안

- API 키는 클라이언트 측에서 localStorage에 저장 (필요시 제거 가능)
- Vercel Serverless Functions에서 API 호출 처리
- CORS 자동 처리

## 🐛 문제 해결

### Python API가 작동하지 않는 경우

1. `vercel.json`에서 Python runtime 설정 확인
2. `api/requirements.txt` 파일이 존재하는지 확인
3. Vercel 로그 확인: `vercel logs`

### 파일 업로드 오류

1. 파일 크기 제한 확인 (Vercel: 4.5MB)
2. 엑셀 파일 형식 확인 (.xlsx, .xls)
3. 브라우저 콘솔에서 에러 메시지 확인

## 📝 라이선스

MIT License

## 👨‍💻 개발자

RE-REPORT Team | 2025

---

**문의사항**이 있으시면 이슈를 등록해주세요.
