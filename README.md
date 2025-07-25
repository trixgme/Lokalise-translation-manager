# Lokalise Translation Manager

Lokalise API를 활용한 AI 기반 번역 키 관리 시스템입니다. 번역 키를 추가하면 Lokalise AI 또는 OpenAI를 사용하여 자동으로 모든 지원 언어로 번역합니다.

## 주요 기능

- 🔑 번역 키 추가 및 관리
- 🤖 AI 자동 번역 (Lokalise AI + OpenAI 대체)
- 🌍 다국어 지원
- 📊 번역 현황 실시간 확인
- 💾 Lokalise 프로젝트와 실시간 동기화

## 설치 및 설정

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
`.env.local` 파일을 수정하여 다음 값들을 설정하세요:

```env
# Lokalise API Configuration
LOKALISE_API_TOKEN=your_lokalise_api_token_here
LOKALISE_PROJECT_ID=your_project_id_here

# OpenAI Configuration (for fallback translation)
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Lokalise 설정 방법

1. [Lokalise](https://lokalise.com/)에 로그인
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 설정에서 API 토큰 생성
4. 프로젝트 ID 확인 (URL에서 확인 가능)

### OpenAI 설정 방법

1. [OpenAI](https://openai.com/)에서 API 키 생성
2. `.env.local`에 API 키 추가

## 실행

개발 서버 실행:
```bash
npm run dev
```

프로덕션 빌드:
```bash
npm run build
npm start
```

## 사용 방법

1. **번역 키 추가**:
   - 키 이름 (예: `home.welcome.title`)
   - 설명 (선택사항)
   - 원본 텍스트 (영어)
   - AI 자동번역 옵션 선택

2. **자동 번역**:
   - AI 자동번역을 체크하면 모든 지원 언어로 자동 번역
   - Lokalise AI를 먼저 시도하고, 실패시 OpenAI로 대체

3. **번역 확인**:
   - 오른쪽 패널에서 번역된 내용 실시간 확인
   - 각 키별 번역 현황 표시

## API 엔드포인트

- `GET /api/keys` - 번역 키 목록 조회
- `POST /api/keys` - 새 번역 키 추가
- `POST /api/translate` - 특정 키들에 대한 번역 실행
- `GET /api/languages` - 지원 언어 목록 조회

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── keys/          # 키 관리 API
│   │   ├── translate/     # 번역 API
│   │   └── languages/     # 언어 목록 API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── TranslationKeyForm.tsx
│   └── TranslationList.tsx
├── lib/
│   ├── lokalise.ts       # Lokalise API 클라이언트
│   └── openai.ts         # OpenAI API 클라이언트
└── types/
    └── lokalise.ts       # TypeScript 타입 정의
```

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **APIs**: Lokalise API, OpenAI API
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS

## 주의사항

- Lokalise API 토큰과 OpenAI API 키를 안전하게 보관하세요
- API 사용량에 따른 비용이 발생할 수 있습니다
- 프로덕션 환경에서는 환경 변수를 안전하게 설정하세요

## 라이선스

ISC