import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extractJourneyElementsStream } from '../services/openai-stream.js';
import type { Actor, Phase, Touchpoint, PhysicalEvidence, UserAction, Connection, Journey } from '../types/journey.js';

const router = Router();

// Actor별 색상 팔레트
const ACTOR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

// 터치포인트 위치 계산
function calculatePosition(
  touchpoint: { actorId: string; phaseId: string },
  actors: Actor[],
  phases: Phase[],
  existingCount: number
): { x: number; y: number } {
  const phaseOrder = new Map(phases.map(p => [p.name, p.order]));
  const actorOrder = new Map(actors.map(a => [a.name, a.order]));
  
  const phaseIdx = phaseOrder.get(touchpoint.phaseId) ?? 0;
  const actorIdx = actorOrder.get(touchpoint.actorId) ?? 0;
  
  const x = phaseIdx * 280 + 180 + (existingCount * 30);
  const y = actorIdx * 180 + 120;
  
  return { x, y };
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
  let actors: Actor[] = [];
  let phases: Phase[] = [];
  let touchpoints: Touchpoint[] = [];
  let physicalEvidences: PhysicalEvidence[] = [];
  let userActions: UserAction[] = [];
  let connections: Connection[] = [];
  
  // 같은 셀에 있는 터치포인트 카운트
  const cellCounts = new Map<string, number>();

  const journeyId = uuidv4();

  // SSE 이벤트 전송 헬퍼
  const sendEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    // 시작 이벤트
    sendEvent('start', { journeyId, title: title || 'New Journey Map' });

    await extractJourneyElementsStream(scenario, (type, data) => {
      switch (type) {
        case 'actors': {
          const rawActors = data as Array<{ name: string; type: string; order: number }>;
          actors = rawActors.map((a, idx) => ({
            ...a,
            id: `actor-${idx}`,
            type: a.type as 'human' | 'robot' | 'system',
            color: ACTOR_COLORS[idx % ACTOR_COLORS.length],
          }));
          sendEvent('actors', actors);
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
        
        case 'touchpoints': {
          const rawTouchpoints = data as Array<{
            actorId: string;
            phaseId: string;
            channel: string;
            action: string;
            emotion: string;
            emotionScore: number;
            painPoint: string;
            opportunity: string;
          }>;
          
          touchpoints = rawTouchpoints.map((tp, idx) => {
            const cellKey = `${tp.actorId}-${tp.phaseId}`;
            const cellCount = cellCounts.get(cellKey) ?? 0;
            cellCounts.set(cellKey, cellCount + 1);
            
            const position = calculatePosition(tp, actors, phases, cellCount);
            
            return {
              ...tp,
              id: `tp-${idx}`,
              actorId: `actor-${actors.findIndex(a => a.name === tp.actorId)}`,
              phaseId: `phase-${phases.findIndex(p => p.name === tp.phaseId)}`,
              emotion: tp.emotion as 'positive' | 'neutral' | 'negative',
              position,
            };
          });
          sendEvent('touchpoints', touchpoints);
          break;
        }
        
        case 'physicalEvidences': {
          const rawPE = data as Array<{ touchpointId: string; type: string; description: string }>;
          physicalEvidences = rawPE.map((pe, idx) => ({
            ...pe,
            id: `pe-${idx}`,
            type: pe.type as 'digital' | 'physical' | 'human',
          }));
          sendEvent('physicalEvidences', physicalEvidences);
          break;
        }
        
        case 'userActions': {
          const rawUA = data as Array<{ touchpointId: string; description: string; thoughts: string; feelings: string }>;
          userActions = rawUA.map((ua, idx) => ({
            ...ua,
            id: `ua-${idx}`,
          }));
          sendEvent('userActions', userActions);
          break;
        }
        
        case 'suggestedConnections': {
          const rawConns = data as Array<{ fromIndex: number; toIndex: number }>;
          connections = rawConns.map((conn, idx) => ({
            id: `conn-${idx}`,
            fromTouchpointId: `tp-${conn.fromIndex}`,
            toTouchpointId: `tp-${conn.toIndex}`,
          }));
          sendEvent('connections', connections);
          break;
        }
        
        case 'complete': {
          // 최종 Journey 객체 전송
          const now = new Date().toISOString();
          const journey: Journey = {
            id: journeyId,
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
