import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extractJourneyElementsStream } from '../services/openai-stream.js';
import type { Phase, Context, Artifact, Touchpoint, Connection, Journey } from '../types/journey.js';

const router = Router();

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
  
  // 부분 매칭 시도 (포함 관계)
  idx = items.findIndex(item => 
    item.name.includes(searchName) || searchName.includes(item.name)
  );
  if (idx !== -1) return idx;
  
  // 첫 번째 요소 반환 (fallback)
  return 0;
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
  let phases: Phase[] = [];
  let contexts: Context[] = [];
  let artifacts: Artifact[] = [];
  let touchpoints: Touchpoint[] = [];
  let connections: Connection[] = [];
  
  const cellCounts = new Map<string, number>();
  const journeyId = uuidv4();

  const sendEvent = (type: string, data: unknown) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    sendEvent('start', { journeyId, title: title || 'New Journey Map' });

    await extractJourneyElementsStream(scenario, (type, data) => {
      switch (type) {
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
            color: CONTEXT_COLORS[idx % CONTEXT_COLORS.length],
          }));
          sendEvent('contexts', contexts);
          break;
        }
        
        case 'artifacts': {
          const rawArtifacts = data as Array<{ name: string; type: string; description: string }>;
          artifacts = rawArtifacts.map((a, idx) => ({
            ...a,
            id: `artifact-${idx}`,
            type: a.type as 'tangible' | 'intangible',
          }));
          sendEvent('artifacts', artifacts);
          break;
        }
        
        case 'touchpoints': {
          const rawTouchpoints = data as Array<{
            phaseId: string;
            contextId: string;
            artifactId: string;
            action: string;
            emotion: string;
            emotionScore: number;
            painPoint: string;
            opportunity: string;
          }>;
          
          console.log('Processing touchpoints, phases:', phases.length, 'contexts:', contexts.length);
          
          touchpoints = rawTouchpoints.map((tp, idx) => {
            // 이름으로 인덱스 찾기
            const phaseIdx = findIndexByName(phases, tp.phaseId);
            const contextIdx = findIndexByName(contexts, tp.contextId);
            const artifactIdx = findIndexByName(artifacts, tp.artifactId);
            
            console.log(`Touchpoint ${idx}: phase="${tp.phaseId}"→${phaseIdx}, context="${tp.contextId}"→${contextIdx}`);
            
            // 셀 카운트 (같은 위치에 여러 터치포인트 처리)
            const cellKey = `${contextIdx}-${phaseIdx}`;
            const cellCount = cellCounts.get(cellKey) ?? 0;
            cellCounts.set(cellKey, cellCount + 1);
            
            // 위치 계산
            const x = phaseIdx * 280 + 180 + (cellCount * 50);
            const y = contextIdx * 180 + 120;
            
            console.log(`  Position: x=${x}, y=${y}`);
            
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
          sendEvent('touchpoints', touchpoints);
          break;
        }
        
        case 'suggestedConnections': {
          const rawConns = data as Array<{ fromIndex: number; toIndex: number; label: string }>;
          connections = rawConns.map((conn, idx) => ({
            id: `conn-${idx}`,
            fromTouchpointId: `tp-${conn.fromIndex}`,
            toTouchpointId: `tp-${conn.toIndex}`,
            label: conn.label,
          }));
          sendEvent('connections', connections);
          break;
        }
        
        case 'complete': {
          const now = new Date().toISOString();
          const journey: Journey = {
            id: journeyId,
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
