# Journey Creator

**사용자 여정 지도 자동화 도구** - User Journey Map Automation Tool

GPT-5.2를 활용하여 간단한 시나리오 텍스트로부터 사용자 여정 지도를 자동으로 생성하고 시각화합니다.

## 주요 기능

- **자동 추출**: 시나리오 텍스트에서 Touchpoint, User Action, Physical Evidence 자동 추출
- **시각화**: Spatiotemporal Grid 위에 그래프 형식으로 여정 시각화
- **편집 가능**: 드래그 앤 드롭으로 노드 위치 조정, 연결선 추가/삭제
- **감정 분석**: 각 터치포인트의 감정 상태 분석 및 표시

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Node.js, Express, TypeScript |
| Frontend | React 19, TypeScript, Vite |
| 시각화 | React Flow (@xyflow/react) |
| AI | OpenAI GPT-5.2 (Responses API) |
| 스타일링 | Tailwind CSS |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 파일을 열고 OpenAI API 키를 설정합니다:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 프로젝트 구조

```
journey-creator/
├── package.json          # 루트 (모노레포)
├── backend/
│   ├── src/
│   │   ├── index.ts      # Express 서버 진입점
│   │   ├── routes/       # API 라우트
│   │   ├── services/     # 비즈니스 로직
│   │   └── types/        # TypeScript 타입 정의
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx       # 메인 앱 컴포넌트
│   │   ├── components/   # React 컴포넌트
│   │   ├── api/          # API 클라이언트
│   │   └── types/        # TypeScript 타입 정의
│   └── package.json
└── README.md
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/journeys | 새 여정 생성 |
| GET | /api/journeys | 모든 여정 목록 조회 |
| GET | /api/journeys/:id | 특정 여정 조회 |
| PUT | /api/journeys/:id | 여정 업데이트 |
| DELETE | /api/journeys/:id | 여정 삭제 |

## 사용 예시

```
고객이 모바일 앱에서 신발을 검색하다가 마음에 드는 제품을 발견합니다.
리뷰를 확인하고 장바구니에 담지만, 가격이 비싸서 망설입니다.
며칠 후 할인 쿠폰 알림을 받고 기뻐하며 바로 구매합니다.
배송 조회를 자주 하다가 드디어 제품을 받고 만족스러운 언박싱 경험을 합니다.
SNS에 후기를 올리고 친구에게 추천합니다.
```

위와 같은 시나리오를 입력하면 GPT-5.2가 자동으로 분석하여:
- 5개 단계 (인지, 고려, 구매, 사용, 추천)
- 각 터치포인트의 채널, 행동, 감정
- Pain Point 및 개선 기회

를 추출하고 시각화합니다.

## 라이선스

MIT
