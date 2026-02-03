import { v4 as uuidv4 } from 'uuid';
import type { 
  Journey, 
  User,
  Phase, 
  Context,
  JourneyNode,
  JourneyEdge,
  Intersection,
  CreateJourneyRequest 
} from '../types/journey.js';
import { extractJourneyElements } from './openai.js';

// 임시 저장소 (추후 DB로 교체)
const journeyStore = new Map<string, Journey>();

// User별 색상 팔레트
const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
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

// 동적 레이아웃 계산 상수
const MIN_PHASE_WIDTH = 250;
const MIN_CONTEXT_HEIGHT = 200;
const CHAR_WIDTH = 10;
const LINE_HEIGHT = 30;
const PHASE_PADDING = 100;
const CONTEXT_PADDING = 80;
const LABEL_OFFSET_X = 180;
const LABEL_OFFSET_Y = 100;

// 원형 배치 상수
const CIRCULAR_RADIUS = 70;

// Phase 너비 계산
function calculatePhaseWidth(phase: Phase): number {
  const nameWidth = phase.name.length * CHAR_WIDTH + 60;
  return Math.max(MIN_PHASE_WIDTH, nameWidth);
}

// Context 높이 계산
function calculateContextHeight(context: Context): number {
  const nameLines = Math.ceil(context.name.length / 12);
  const descLines = context.description ? Math.ceil(context.description.length / 18) : 0;
  const totalLines = nameLines + descLines;
  return Math.max(MIN_CONTEXT_HEIGHT, totalLines * LINE_HEIGHT + 80);
}

// 원형 배치 위치 계산
function calculateCircularPosition(
  centerX: number,
  centerY: number,
  index: number,
  total: number,
  radius: number
): { x: number; y: number } {
  if (total === 1) {
    return { x: centerX, y: centerY };
  }
  const startAngle = -Math.PI / 2;
  const angle = startAngle + (2 * Math.PI / total) * index;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

// 레이아웃 정보 계산
function calculateLayout(phases: Phase[], contexts: Context[]) {
  const phaseWidths = phases.map(calculatePhaseWidth);
  const contextHeights = contexts.map(calculateContextHeight);
  
  const phasePositions: number[] = [];
  let currentX = LABEL_OFFSET_X;
  phaseWidths.forEach((width) => {
    phasePositions.push(currentX);
    currentX += width + PHASE_PADDING;
  });
  
  const contextPositions: number[] = [];
  let currentY = LABEL_OFFSET_Y;
  contextHeights.forEach((height) => {
    contextPositions.push(currentY);
    currentY += height + CONTEXT_PADDING;
  });
  
  return { phasePositions, phaseWidths, contextPositions, contextHeights };
}

// 시나리오로부터 여정 생성
export async function createJourneyFromScenario(
  request: CreateJourneyRequest
): Promise<Journey> {
  const { scenario, title } = request;

  // GPT-5.2로 요소 추출
  const extracted = await extractJourneyElements(scenario);

  // User 생성 (색상 할당)
  const users: User[] = extracted.users.map((u, idx) => ({
    ...u,
    id: `user-${idx}`,
    type: u.type as User['type'],
    color: USER_COLORS[idx % USER_COLORS.length],
  }));

  // Phase 생성
  const phases: Phase[] = extracted.phases.map((p, idx) => ({
    ...p,
    id: `phase-${idx}`,
  }));

  // Context 생성
  const contexts: Context[] = extracted.contexts.map((c, idx) => ({
    ...c,
    id: `context-${idx}`,
  }));

  // 레이아웃 계산
  const layout = calculateLayout(phases, contexts);

  // 먼저 셀별로 그룹핑
  const cellGroupsTemp = new Map<string, Array<{ raw: typeof extracted.nodes[0], idx: number }>>();
  extracted.nodes.forEach((n, idx) => {
    const phaseIdx = findIndexByName(phases, n.phaseName, 'phase');
    const contextIdx = findIndexByName(contexts, n.contextName, 'context');
    const cellKey = `${phaseIdx}-${contextIdx}`;
    if (!cellGroupsTemp.has(cellKey)) {
      cellGroupsTemp.set(cellKey, []);
    }
    cellGroupsTemp.get(cellKey)!.push({ raw: n, idx });
  });

  // Node 생성 (원형 배치)
  const nodes: JourneyNode[] = extracted.nodes.map((n, idx) => {
    const userIdx = findIndexByName(users, n.userName, 'user');
    const phaseIdx = findIndexByName(phases, n.phaseName, 'phase');
    const contextIdx = findIndexByName(contexts, n.contextName, 'context');
    
    const cellKey = `${phaseIdx}-${contextIdx}`;
    const cellNodes = cellGroupsTemp.get(cellKey) || [];
    const nodeIndexInCell = cellNodes.findIndex(cn => cn.idx === idx);
    const totalInCell = cellNodes.length;
    
    const baseX = layout.phasePositions[phaseIdx] ?? (phaseIdx * 200 + LABEL_OFFSET_X);
    const baseY = layout.contextPositions[contextIdx] ?? (contextIdx * 150 + LABEL_OFFSET_Y);
    const phaseWidth = layout.phaseWidths[phaseIdx] ?? MIN_PHASE_WIDTH;
    const contextHeight = layout.contextHeights[contextIdx] ?? MIN_CONTEXT_HEIGHT;
    
    // 셀 중심점
    const centerX = baseX + phaseWidth / 2;
    const centerY = baseY + contextHeight / 2;
    
    // 원형 배치
    const circularPos = calculateCircularPosition(centerX, centerY, nodeIndexInCell, totalInCell, CIRCULAR_RADIUS);
    
    return {
      ...n,
      id: `node-${idx}`,
      userId: `user-${userIdx}`,
      phaseId: `phase-${phaseIdx}`,
      contextId: `context-${contextIdx}`,
      emotion: n.emotion as JourneyNode['emotion'],
      position: { 
        x: circularPos.x - 60, 
        y: circularPos.y - 30 
      },
    };
  });

  // Edge 생성
  const edges: JourneyEdge[] = extracted.edges.map((e, idx) => ({
    id: `edge-${idx}`,
    fromNodeId: `node-${e.fromNodeIndex}`,
    toNodeId: `node-${e.toNodeIndex}`,
    description: e.description,
  }));

  // Intersection 생성
  const intersections: Intersection[] = extracted.intersections.map((i, idx) => {
    const phaseIdx = findIndexByName(phases, i.phaseName);
    const contextIdx = findIndexByName(contexts, i.contextName);
    
    // 해당 위치의 노드들 찾기
    const nodeIds = nodes
      .filter(n => n.phaseId === `phase-${phaseIdx}` && n.contextId === `context-${contextIdx}`)
      .map(n => n.id);
    
    return {
      id: `intersection-${idx}`,
      phaseId: `phase-${phaseIdx}`,
      contextId: `context-${contextIdx}`,
      nodeIds,
      description: i.description,
    };
  });

  // 전체 Journey 생성
  const now = new Date().toISOString();
  const journey: Journey = {
    id: uuidv4(),
    title: title || 'New Journey Map',
    description: `${scenario.substring(0, 100)}...`,
    scenario,
    users,
    phases,
    contexts,
    nodes,
    edges,
    intersections,
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
