# 배포 가이드

## ✅ 프로젝트 완료 상태

모든 코드가 성공적으로 작성되고 빌드가 완료되었습니다!

## 🚀 Vercel 배포 방법

### 옵션 1: Vercel CLI (추천)

1. **Vercel CLI 설치**
```bash
npm i -g vercel
```

2. **로그인**
```bash
vercel login
```

3. **배포**
```bash
vercel
```

4. **프로덕션 배포**
```bash
vercel --prod
```

### 옵션 2: GitHub 연동 (자동 배포)

1. **GitHub 저장소 생성** 및 코드 푸시
```bash
git add .
git commit -m "Initial commit: Next.js review report app"
git push origin main
```

2. **Vercel 대시보드**에서:
   - New Project 클릭
   - GitHub 저장소 선택
   - 설정 확인 후 Deploy 클릭

3. **환경 변수 설정** (선택사항):
   - Settings → Environment Variables
   - `NEXT_PUBLIC_OPENAI_API_KEY` 추가 (사용자가 UI에서 입력할 수도 있음)

## 📝 배포 전 체크리스트

- [x] Next.js 프로젝트 초기화
- [x] Python API Routes 구현
- [x] 프론트엔드 컴포넌트 완성
- [x] Tailwind CSS 스타일링
- [x] vercel.json 설정
- [x] 빌드 테스트 통과
- [x] 개발 서버 실행 확인

## 🔧 로컬 테스트

### 개발 서버
```bash
npm run dev
```
→ http://localhost:3000 접속

### 프로덕션 빌드 테스트
```bash
npm run build
npm start
```

## 📦 Python API Routes 참고사항

Vercel은 `/api` 폴더의 Python 파일을 자동으로 Serverless Functions로 배포합니다.

**필요한 파일:**
- `api/prepare.py` - 파일 분석
- `api/analyze.py` - AI 분석
- `api/requirements.txt` - Python 패키지
- `vercel.json` - Python runtime 설정

## 🌐 배포 후 URL

배포가 완료되면 다음과 같은 URL을 받게 됩니다:
- `https://your-project.vercel.app`

## 🔐 환경 변수 (선택사항)

Vercel 대시보드에서 설정:
```
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

> **참고**: API 키는 UI에서도 입력할 수 있으므로 필수는 아닙니다.

## 📊 사용 방법

1. OpenAI API 키 입력 (왼쪽 사이드바)
2. 엑셀 파일 업로드
3. 가맹점과 월 선택
4. "분석 시작하기" 클릭
5. 결과 확인 및 편집
6. PNG/PDF로 다운로드

## 🐛 트러블슈팅

### Python API가 작동하지 않는 경우
- Vercel 로그 확인: `vercel logs`
- `api/requirements.txt` 확인
- `vercel.json`에서 Python runtime 설정 확인

### 파일 업로드 오류
- Vercel 기본 제한: 4.5MB
- 더 큰 파일이 필요한 경우 Vercel Pro 고려

### 빌드 오류
```bash
npm run build
```
로컬에서 빌드 테스트 후 오류 수정

## 📞 지원

문제가 발생하면:
1. GitHub Issues 등록
2. Vercel 로그 확인
3. 브라우저 개발자 도구 콘솔 확인

---

**축하합니다! 🎉**
프로젝트가 성공적으로 완료되었습니다.

