// User (행위자) - 작업자, AGV, 시스템 등
export interface User {
  id: string;
  name: string;
  type: 'human' | 'robot' | 'system' | 'other';
  color: string;
  description?: string;
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
  userId: string;
  phaseId: string;
  contextId: string;
  action: string;
  emotion: 'positive' | 'neutral' | 'negative';
  emotionScore: number;
  painPoint?: string;
  opportunity?: string;
  position?: { x: number; y: number };
}

// Edge = Node 간 이동/전환
export interface JourneyEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  description: string;
}

// 접점 = 여러 User가 만나는 지점
export interface Intersection {
  id: string;
  phaseId: string;
  contextId: string;
  nodeIds: string[];
  description?: string;
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
  edges: JourneyEdge[];
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

// GPT 추출 결과 타입
export interface ExtractionResult {
  users: Array<{ name: string; type: string; description: string }>;
  phases: Array<{ name: string; order: number; duration: string }>;
  contexts: Array<{ name: string; description: string; order: number }>;
  nodes: Array<{
    userName: string;
    phaseName: string;
    contextName: string;
    action: string;
    emotion: string;
    emotionScore: number;
    painPoint: string;
    opportunity: string;
  }>;
  edges: Array<{ fromNodeIndex: number; toNodeIndex: number; description: string }>;
  intersections: Array<{
    phaseName: string;
    contextName: string;
    userNames: string[];
    description: string;
  }>;
}
