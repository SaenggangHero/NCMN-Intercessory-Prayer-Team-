# NCMN 참석 조사 홈페이지 - Firebase 실시간 버전

이 버전은 여러 사람이 제출해도 관리자 페이지에 실시간으로 반영됩니다.

## 1. Firebase 만들기
1. https://console.firebase.google.com 접속
2. 프로젝트 만들기
3. 왼쪽 메뉴에서 Firestore Database 만들기
4. 테스트 모드로 시작

## 2. 웹 앱 등록
1. Firebase 프로젝트 설정
2. 내 앱 → 웹 앱 추가
3. Firebase config 값 확인

## 3. `.env` 파일 만들기
이 폴더에 `.env.example` 파일이 있습니다.  
그 파일 이름을 `.env`로 바꾸고 Firebase 값을 넣어주세요.

예시:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 4. 로컬 실행
```bash
npm install
npm run dev
```

## 5. Vercel 배포
Vercel에 올릴 때는 Environment Variables에 위 Firebase 값을 그대로 넣어주세요.

## 관리자 로그인
- 아이디: 김영신
- 비밀번호: 1004

## 참고
앱 안의 관리자 비밀번호는 화면 보호용입니다.  
진짜 보안을 강화하려면 Firebase Authentication과 보안 규칙을 추가해야 합니다.
