// Journey Creator 데이터 타입 정의
// 새로운 용어 체계: Phase (시간) × Context/Artifact (터치포인트)

// 시간 단계 (가로축)
export interface Phase {
  id: string;
  name: string;           // 예: "준비", "작업", "점검", "완료"
  order: number;          // 순서
  duration?: string;      // 예: "30분", "1시간"
}

// Context: 서비스 경험이 일어나는 물리적 공간/환경 (세로축 기준)
export interface Context {
  id: string;
  name: string;           // 예: "공장 라인", "자재 창고", "휴게실"
  description?: string;   // 환경 설명
  order: number;          // 세로축 배치 순서
  color?: string;         // 시각화용 색상
}

// Artifact: Context 내 구체적 접점 (Physical Evidence)
export interface Artifact {
  id: string;
  name: string;           // 예: "웨어러블 로봇", "MES 앱", "충전 스테이션"
  type: 'tangible' | 'intangible';  // 유형/무형
  description?: string;
}

// Touchpoint: 사용자 경험의 핵심 구성 요소
// Phase(시간) × Context(공간) 교차점에 배치되는 경험 단위
export interface Touchpoint {
  id: string;
  phaseId: string;        // 속한 Phase (가로축)
  contextId: string;      // 속한 Context (세로축)
  artifactId: string;     // 사용되는 Artifact
  
  action: string;         // 사용자 행동/경험 설명
  emotion: 'positive' | 'neutral' | 'negative';  // 감정 상태
  emotionScore: number;   // -1 ~ 1 (감정 점수)
  
  painPoint?: string;     // 불편 사항
  opportunity?: string;   // 개선 기회
  
  position: {
    x: number;            // Grid X 위치
    y: number;            // Grid Y 위치
  };
}

// 터치포인트 간 연결 (흐름)
export interface Connection {
  id: string;
  fromTouchpointId: string;
  toTouchpointId: string;
  label?: string;         // 연결 설명 (예: "이동", "전달", "알림")
}

// 전체 여정 지도
export interface Journey {
  id: string;
  title: string;
  description?: string;
  scenario: string;       // 원본 시나리오 텍스트
  
  phases: Phase[];        // 시간 단계들 (가로축)
  contexts: Context[];    // 공간/환경들 (세로축)
  artifacts: Artifact[];  // 접점 요소들
  touchpoints: Touchpoint[];
  connections: Connection[];
  
  createdAt: string;
  updatedAt: string;
}

// GPT 추출 결과
export interface ExtractionResult {
  phases: Omit<Phase, 'id'>[];
  contexts: Omit<Context, 'id' | 'color'>[];
  artifacts: Omit<Artifact, 'id'>[];
  touchpoints: Omit<Touchpoint, 'id' | 'position'>[];
  suggestedConnections: { fromIndex: number; toIndex: number; label?: string }[];
}

// API 요청/응답 타입
export interface CreateJourneyRequest {
  scenario: string;
  title?: string;
}

export interface CreateJourneyResponse {
  success: boolean;
  journey?: Journey;
  error?: string;
}
