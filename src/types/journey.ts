// User (행위자) - 작업자, AGV, 시스템 등
export interface User {
  id: string;
  name: string;           // "작업자 A", "AGV-01"
  type: 'human' | 'robot' | 'system' | 'other';
  color: string;          // 고유 색상 "#3b82f6"
  description?: string;   // 역할 설명
}

// Phase (시간축)
export interface Phase {
  id: string;
  name: string;
  order: number;
  duration?: string;
}

// Context (공간축/환경)
export interface Context {
  id: string;
  name: string;
  description?: string;
  order: number;
}

// Node = User의 특정 시점 상태
export interface JourneyNode {
  id: string;
  userId: string;         // 어떤 User인지
  phaseId: string;        // 어느 Phase에
  contextId: string;      // 어느 Context에
  action: string;         // 무엇을 하는지
  emotion: 'positive' | 'neutral' | 'negative';
  emotionScore: number;   // -1 ~ 1
  painPoint?: string;
  opportunity?: string;
  position?: { x: number; y: number };
}

// Connector = Node 간 이동/전환
export interface JourneyConnector {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  description: string;    // "~를 하기 위해 ~로 이동함"
}

// 접점 = 여러 User가 만나는 지점
export interface Intersection {
  id: string;
  phaseId: string;
  contextId: string;
  nodeIds: string[];      // 만나는 Node들의 ID
  description?: string;   // 접점에서 일어나는 상호작용
}

// Journey = 전체 그래프
export interface Journey {
  id: string;
  title: string;
  description?: string;
  scenario: string;
  users: User[];
  phases: Phase[];
  contexts: Context[];
  nodes: JourneyNode[];
  connectors: JourneyConnector[];
  intersections: Intersection[];
  createdAt: string;
  updatedAt: string;
}

// API 요청 타입
export interface CreateJourneyRequest {
  scenario: string;
  title?: string;
}

// API 응답 타입
export interface CreateJourneyResponse {
  success: boolean;
  journey?: Journey;
  error?: string;
}
