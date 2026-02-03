import { v4 as uuidv4 } from 'uuid';
import type { 
  Journey, 
  Phase, 
  Touchpoint, 
  PhysicalEvidence, 
  UserAction, 
  Connection,
  Actor,
  CreateJourneyRequest 
} from '../types/journey.js';
import { extractJourneyElements } from './openai.js';

// 임시 저장소 (추후 DB로 교체)
const journeyStore = new Map<string, Journey>();

// Actor별 색상 팔레트
const ACTOR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

// 터치포인트 위치 자동 계산 (Swimlane 기반)
function calculatePositions(
  touchpoints: Omit<Touchpoint, 'id' | 'position'>[],
  phases: Phase[],
  actors: Actor[]
): { x: number; y: number }[] {
  const phaseOrder = new Map(phases.map(p => [p.name, p.order]));
  const actorOrder = new Map(actors.map(a => [a.name, a.order]));
  
  // 각 Actor/Phase 조합에서 몇 번째 터치포인트인지 추적
  const cellCounts = new Map<string, number>();

  return touchpoints.map(tp => {
    // X축: Phase 순서에 따라 배치
    const phaseIdx = phaseOrder.get(tp.phaseId) ?? 0;
    
    // 같은 셀에 여러 터치포인트가 있을 경우 X 오프셋 추가
    const cellKey = `${tp.actorId}-${tp.phaseId}`;
    const cellCount = cellCounts.get(cellKey) ?? 0;
    cellCounts.set(cellKey, cellCount + 1);
    
    const x = phaseIdx * 280 + 150 + (cellCount * 30);

    // Y축: Actor Swimlane에 따라 배치
    const actorIdx = actorOrder.get(tp.actorId) ?? 0;
    const y = actorIdx * 180 + 120;

    return { x, y };
  });
}

// 시나리오로부터 여정 생성
export async function createJourneyFromScenario(
  request: CreateJourneyRequest
): Promise<Journey> {
  const { scenario, title } = request;

  // GPT-5.2로 요소 추출
  const extracted = await extractJourneyElements(scenario);

  // Actor 생성 (색상 할당)
  const actors: Actor[] = extracted.actors.map((a, idx) => ({
    ...a,
    id: `actor-${idx}`,
    color: ACTOR_COLORS[idx % ACTOR_COLORS.length],
  }));

  // Phase 생성
  const phases: Phase[] = extracted.phases.map((p, idx) => ({
    ...p,
    id: `phase-${idx}`,
  }));

  // 위치 계산 (Swimlane 기반)
  const positions = calculatePositions(extracted.touchpoints, phases, actors);

  // Touchpoint 생성
  const touchpoints: Touchpoint[] = extracted.touchpoints.map((tp, idx) => ({
    ...tp,
    id: `tp-${idx}`,
    actorId: `actor-${actors.findIndex(a => a.name === tp.actorId)}`,
    phaseId: `phase-${phases.findIndex(p => p.name === tp.phaseId)}`,
    position: positions[idx],
  }));

  // Physical Evidence 생성
  const physicalEvidences: PhysicalEvidence[] = extracted.physicalEvidences.map((pe, idx) => ({
    ...pe,
    id: `pe-${idx}`,
  }));

  // User Action 생성
  const userActions: UserAction[] = extracted.userActions.map((ua, idx) => ({
    ...ua,
    id: `ua-${idx}`,
  }));

  // Connection 생성
  const connections: Connection[] = extracted.suggestedConnections.map((conn, idx) => ({
    id: `conn-${idx}`,
    fromTouchpointId: `tp-${conn.fromIndex}`,
    toTouchpointId: `tp-${conn.toIndex}`,
  }));

  // 전체 Journey 생성
  const now = new Date().toISOString();
  const journey: Journey = {
    id: uuidv4(),
    title: title || 'New Journey Map',
    description: `${scenario.substring(0, 100)}...`,
    scenario,
    actors,
    phases,
    touchpoints,
    physicalEvidences,
    userActions,
    connections,
    createdAt: now,
    updatedAt: now,
  };

  // 저장
  journeyStore.set(journey.id, journey);

  return journey;
}

// 여정 조회
export function getJourney(id: string): Journey | undefined {
  return journeyStore.get(id);
}

// 여정 목록 조회
export function getAllJourneys(): Journey[] {
  return Array.from(journeyStore.values());
}

// 여정 업데이트 (편집)
export function updateJourney(id: string, updates: Partial<Journey>): Journey | undefined {
  const journey = journeyStore.get(id);
  if (!journey) return undefined;

  const updated: Journey = {
    ...journey,
    ...updates,
    id, // ID는 변경 불가
    updatedAt: new Date().toISOString(),
  };

  journeyStore.set(id, updated);
  return updated;
}

// 여정 삭제
export function deleteJourney(id: string): boolean {
  return journeyStore.delete(id);
}
