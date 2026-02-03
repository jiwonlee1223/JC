// 백엔드와 동일한 타입 정의 (프론트엔드용)

export interface Actor {
  id: string;
  name: string;
  type: 'human' | 'robot' | 'system';
  color?: string;
  order: number;
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  duration?: string;
}

export interface Touchpoint {
  id: string;
  actorId: string;
  phaseId: string;
  channel: string;
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

export interface PhysicalEvidence {
  id: string;
  touchpointId: string;
  type: 'digital' | 'physical' | 'human';
  description: string;
}

export interface UserAction {
  id: string;
  touchpointId: string;
  description: string;
  thoughts?: string;
  feelings?: string;
}

export interface Connection {
  id: string;
  fromTouchpointId: string;
  toTouchpointId: string;
  label?: string;
}

export interface Journey {
  id: string;
  title: string;
  description?: string;
  scenario: string;
  actors: Actor[];
  phases: Phase[];
  touchpoints: Touchpoint[];
  physicalEvidences: PhysicalEvidence[];
  userActions: UserAction[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}
