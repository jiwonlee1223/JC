// Journey Creator 데이터 타입 정의
// 용어 체계: Phase (시간) × Context/Artifact (터치포인트)

// Phase: 시간 흐름에 따른 단계 (가로축)
export interface Phase {
  id: string;
  name: string;
  order: number;
  duration?: string;
}

// Context: 서비스 경험이 일어나는 물리적 공간/환경 (세로축)
export interface Context {
  id: string;
  name: string;
  description?: string;
  order: number;
  color?: string;
}

// Artifact: Context 내 구체적 접점 (Physical Evidence)
export interface Artifact {
  id: string;
  name: string;
  type: 'tangible' | 'intangible';
  description?: string;
}

// Touchpoint: 사용자 경험의 핵심 구성 요소
export interface Touchpoint {
  id: string;
  phaseId: string;
  contextId: string;
  artifactId: string;
  action: string;
  emotion: 'positive' | 'neutral' | 'negative';
  emotionScore: number;
  painPoint?: string;
  opportunity?: string;
  position: {
    x: number;
    y: number;
  };
}

// Connection: 터치포인트 간 연결
export interface Connection {
  id: string;
  fromTouchpointId: string;
  toTouchpointId: string;
  label?: string;
}

// Journey: 전체 여정 지도
export interface Journey {
  id: string;
  title: string;
  description?: string;
  scenario: string;
  phases: Phase[];
  contexts: Context[];
  artifacts: Artifact[];
  touchpoints: Touchpoint[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}
