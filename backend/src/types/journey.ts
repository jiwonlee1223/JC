// 사용자 여정 지도 데이터 타입 정의

// Actor (여정의 주체 - 사람, 로봇, 시스템 등)
export interface Actor {
  id: string;
  name: string;           // 예: "작업자", "행낭로봇", "관리자"
  type: 'human' | 'robot' | 'system';  // 주체 유형
  color?: string;         // 시각화용 색상
  order: number;          // Y축 순서 (Swimlane 배치)
}

// 시간 단계 (Temporal Phase)
export interface Phase {
  id: string;
  name: string;           // 예: "준비", "작업", "자재요청", "완료"
  order: number;          // 순서
  duration?: string;      // 예: "1-2일", "즉시"
}

// 터치포인트 (고객 접점)
export interface Touchpoint {
  id: string;
  actorId: string;        // 이 터치포인트의 주체 (Actor)
  phaseId: string;        // 속한 Phase
  channel: string;        // 채널: "태블릿", "MES", "충전스테이션" 등
  action: string;         // 행동
  emotion: 'positive' | 'neutral' | 'negative';  // 상태
  emotionScore: number;   // -1 ~ 1 (상태 점수)
  painPoint?: string;     // 문제점
  opportunity?: string;   // 개선 기회
  position: {
    x: number;            // Grid X 위치 (Phase 기반)
    y: number;            // Grid Y 위치 (Actor Swimlane 기반)
  };
}

// 물리적 증거 (Physical Evidence)
export interface PhysicalEvidence {
  id: string;
  touchpointId: string;   // 연결된 터치포인트
  type: 'digital' | 'physical' | 'human';  // 유형
  description: string;    // 설명
}

// 사용자 행동 (User Action)
export interface UserAction {
  id: string;
  touchpointId: string;
  description: string;    // 행동 설명
  thoughts?: string;      // 사용자 생각
  feelings?: string;      // 사용자 감정
}

// 연결선 (Touchpoint 간 연결)
export interface Connection {
  id: string;
  fromTouchpointId: string;
  toTouchpointId: string;
  label?: string;
}

// 전체 여정 지도
export interface Journey {
  id: string;
  title: string;
  description?: string;
  scenario: string;       // 원본 시나리오 텍스트
  actors: Actor[];        // 여정의 주체들 (다중 Actor 지원)
  phases: Phase[];
  touchpoints: Touchpoint[];
  physicalEvidences: PhysicalEvidence[];
  userActions: UserAction[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}

// GPT-5.2 추출 결과
export interface ExtractionResult {
  actors: Omit<Actor, 'id'>[];
  phases: Omit<Phase, 'id'>[];
  touchpoints: Omit<Touchpoint, 'id' | 'position'>[];
  physicalEvidences: Omit<PhysicalEvidence, 'id'>[];
  userActions: Omit<UserAction, 'id'>[];
  suggestedConnections: { fromIndex: number; toIndex: number }[];
}

// API 요청/응답 타입
export interface CreateJourneyRequest {
  scenario: string;
  title?: string;
  persona?: string;
}

export interface CreateJourneyResponse {
  success: boolean;
  journey?: Journey;
  error?: string;
}
