import { v4 as uuidv4 } from 'uuid';
import type { 
  Journey, 
  Phase, 
  Context,
  Artifact,
  Touchpoint, 
  Connection,
  CreateJourneyRequest 
} from '../types/journey.js';
import { extractJourneyElements } from './openai.js';

// 임시 저장소 (추후 DB로 교체)
const journeyStore = new Map<string, Journey>();

// Context별 색상 팔레트
const CONTEXT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

// 이름으로 인덱스 찾기 (유연한 매칭)
function findIndexByName(items: { name: string }[], searchName: string): number {
  // 정확한 매칭 시도
  let idx = items.findIndex(item => item.name === searchName);
  if (idx !== -1) return idx;
  
  // 부분 매칭 시도
  idx = items.findIndex(item => 
    item.name.includes(searchName) || searchName.includes(item.name)
  );
  if (idx !== -1) return idx;
  
  return 0;
}

// 시나리오로부터 여정 생성
export async function createJourneyFromScenario(
  request: CreateJourneyRequest
): Promise<Journey> {
  const { scenario, title } = request;

  // GPT-5.2로 요소 추출
  const extracted = await extractJourneyElements(scenario);

  // Phase 생성
  const phases: Phase[] = extracted.phases.map((p, idx) => ({
    ...p,
    id: `phase-${idx}`,
  }));

  // Context 생성 (색상 할당)
  const contexts: Context[] = extracted.contexts.map((c, idx) => ({
    ...c,
    id: `context-${idx}`,
    color: CONTEXT_COLORS[idx % CONTEXT_COLORS.length],
  }));

  // Artifact 생성
  const artifacts: Artifact[] = extracted.artifacts.map((a, idx) => ({
    ...a,
    id: `artifact-${idx}`,
  }));

  // 셀 카운트
  const cellCounts = new Map<string, number>();

  // Touchpoint 생성
  const touchpoints: Touchpoint[] = extracted.touchpoints.map((tp, idx) => {
    const phaseIdx = findIndexByName(phases, tp.phaseId);
    const contextIdx = findIndexByName(contexts, tp.contextId);
    const artifactIdx = findIndexByName(artifacts, tp.artifactId);
    
    const cellKey = `${contextIdx}-${phaseIdx}`;
    const cellCount = cellCounts.get(cellKey) ?? 0;
    cellCounts.set(cellKey, cellCount + 1);
    
    const x = phaseIdx * 280 + 180 + (cellCount * 50);
    const y = contextIdx * 180 + 120;

    return {
      ...tp,
      id: `tp-${idx}`,
      phaseId: `phase-${phaseIdx}`,
      contextId: `context-${contextIdx}`,
      artifactId: `artifact-${artifactIdx}`,
      emotion: tp.emotion as 'positive' | 'neutral' | 'negative',
      position: { x, y },
    };
  });

  // Connection 생성
  const connections: Connection[] = extracted.suggestedConnections.map((conn, idx) => ({
    id: `conn-${idx}`,
    fromTouchpointId: `tp-${conn.fromIndex}`,
    toTouchpointId: `tp-${conn.toIndex}`,
    label: conn.label,
  }));

  // 전체 Journey 생성
  const now = new Date().toISOString();
  const journey: Journey = {
    id: uuidv4(),
    title: title || 'New Journey Map',
    description: `${scenario.substring(0, 100)}...`,
    scenario,
    phases,
    contexts,
    artifacts,
    touchpoints,
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
    id,
    updatedAt: new Date().toISOString(),
  };

  journeyStore.set(id, updated);
  return updated;
}

// 여정 삭제
export function deleteJourney(id: string): boolean {
  return journeyStore.delete(id);
}
