import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extractJourneyElementsStream } from '../services/openai-stream.js';
import type { User, Phase, Context, JourneyNode, JourneyEdge, Intersection, Journey } from '../types/journey.js';

const router = Router();

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

function calculatePhaseWidth(phase: Phase): number {
  const nameWidth = phase.name.length * CHAR_WIDTH + 60;
  return Math.max(MIN_PHASE_WIDTH, nameWidth);
}

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

// POST /api/journeys/stream - SSE 스트리밍 여정 생성
router.post('/stream', async (req: Request, res: Response) => {
  const { scenario, title } = req.body;

  if (!scenario || scenario.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Scenario text is required',
    });
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // 부분 데이터 저장
  let users: User[] = [];
  let phases: Phase[] = [];
  let contexts: Context[] = [];
  let nodes: JourneyNode[] = [];
  let edges: JourneyEdge[] = [];
  let intersections: Intersection[] = [];
  
  const cellCounts = new Map<string, number>();
  const journeyId = uuidv4();

  const sendEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    sendEvent('start', { journeyId, title: title || 'New Journey Map' });

    await extractJourneyElementsStream(scenario, (type, data) => {
      switch (type) {
        case 'users': {
          const rawUsers = data as Array<{ name: string; type: string; description: string }>;
          users = rawUsers.map((u, idx) => ({
            ...u,
            id: `user-${idx}`,
            type: u.type as User['type'],
            color: USER_COLORS[idx % USER_COLORS.length],
          }));
          sendEvent('users', users);
          break;
        }
        
        case 'phases': {
          const rawPhases = data as Array<{ name: string; order: number; duration: string }>;
          phases = rawPhases.map((p, idx) => ({
            ...p,
            id: `phase-${idx}`,
          }));
          sendEvent('phases', phases);
          break;
        }
        
        case 'contexts': {
          const rawContexts = data as Array<{ name: string; description: string; order: number }>;
          contexts = rawContexts.map((c, idx) => ({
            ...c,
            id: `context-${idx}`,
          }));
          sendEvent('contexts', contexts);
          break;
        }
        
        case 'nodes': {
          const rawNodes = data as Array<{
            userName: string;
            phaseName: string;
            contextName: string;
            action: string;
            emotion: string;
            emotionScore: number;
            painPoint: string;
            opportunity: string;
          }>;
          
          // 레이아웃 계산
          const layout = calculateLayout(phases, contexts);
          
          console.log('Processing nodes, users:', users.length, 'phases:', phases.length, 'contexts:', contexts.length);
          
          // 먼저 셀별로 그룹핑
          const cellGroupsTemp = new Map<string, Array<{ raw: typeof rawNodes[0], idx: number }>>();
          rawNodes.forEach((n, idx) => {
            const phaseIdx = findIndexByName(phases, n.phaseName);
            const contextIdx = findIndexByName(contexts, n.contextName);
            const cellKey = `${phaseIdx}-${contextIdx}`;
            if (!cellGroupsTemp.has(cellKey)) {
              cellGroupsTemp.set(cellKey, []);
            }
            cellGroupsTemp.get(cellKey)!.push({ raw: n, idx });
          });
          
          // 원형 배치로 위치 계산
          nodes = rawNodes.map((n, idx) => {
            const userIdx = findIndexByName(users, n.userName);
            const phaseIdx = findIndexByName(phases, n.phaseName);
            const contextIdx = findIndexByName(contexts, n.contextName);
            
            console.log(`Node ${idx}: user="${n.userName}"→${userIdx}, phase="${n.phaseName}"→${phaseIdx}, context="${n.contextName}"→${contextIdx}`);
            
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
            const x = circularPos.x - 60;
            const y = circularPos.y - 30;
            
            console.log(`  Position: x=${x}, y=${y} (cell total: ${totalInCell})`);
            
            return {
              ...n,
              id: `node-${idx}`,
              userId: `user-${userIdx}`,
              phaseId: `phase-${phaseIdx}`,
              contextId: `context-${contextIdx}`,
              emotion: n.emotion as JourneyNode['emotion'],
              position: { x, y },
            };
          });
          sendEvent('nodes', nodes);
          break;
        }
        
        case 'edges': {
          const rawEdges = data as Array<{ fromNodeIndex: number; toNodeIndex: number; description: string }>;
          edges = rawEdges.map((e, idx) => ({
            id: `edge-${idx}`,
            fromNodeId: `node-${e.fromNodeIndex}`,
            toNodeId: `node-${e.toNodeIndex}`,
            description: e.description,
          }));
          sendEvent('edges', edges);
          break;
        }
        
        case 'intersections': {
          const rawIntersections = data as Array<{
            phaseName: string;
            contextName: string;
            userNames: string[];
            description: string;
          }>;
          
          intersections = rawIntersections.map((i, idx) => {
            const phaseIdx = findIndexByName(phases, i.phaseName);
            const contextIdx = findIndexByName(contexts, i.contextName);
            
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
          sendEvent('intersections', intersections);
          break;
        }
        
        case 'complete': {
          const now = new Date().toISOString();
          const journey: Journey = {
            id: journeyId,
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
          sendEvent('complete', journey);
          res.end();
          break;
        }
        
        case 'error': {
          sendEvent('error', data);
          res.end();
          break;
        }
      }
    });

  } catch (error) {
    console.error('Streaming journey creation error:', error);
    sendEvent('error', { message: 'Journey creation failed' });
    res.end();
  }
});

export default router;
