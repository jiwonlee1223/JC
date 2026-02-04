import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { extractJourneyElementsStream } from '../_lib/openai-stream';
import { USER_COLORS, findIndexByName, calculateLayout, calculateCircularPosition, CIRCULAR_RADIUS, MIN_PHASE_WIDTH, MIN_CONTEXT_HEIGHT, LABEL_OFFSET_X, LABEL_OFFSET_Y } from '../_lib/journey-utils';
import type { Journey, User, Phase, Context, JourneyNode, JourneyEdge, Intersection } from '../_lib/types';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { scenario, title } = req.body;
  if (!scenario?.trim()) return res.status(400).json({ success: false, error: 'Scenario text is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let users: User[] = [], phases: Phase[] = [], contexts: Context[] = [], nodes: JourneyNode[] = [], edges: JourneyEdge[] = [], intersections: Intersection[] = [];
  const journeyId = uuidv4();

  const sendEvent = (type: string, data: unknown) => res.write(`data: ${JSON.stringify({ type, data })}\n\n`);

  try {
    sendEvent('start', { journeyId, title: title || 'New Journey Map' });

    await extractJourneyElementsStream(scenario, (type, data) => {
      switch (type) {
        case 'users':
          users = (data as Array<{ name: string; type: string; description: string }>).map((u, idx) => ({ ...u, id: `user-${idx}`, type: u.type as User['type'], color: USER_COLORS[idx % USER_COLORS.length] }));
          sendEvent('users', users);
          break;
        case 'phases':
          phases = (data as Array<{ name: string; order: number; duration: string }>).map((p, idx) => ({ ...p, id: `phase-${idx}` }));
          sendEvent('phases', phases);
          break;
        case 'contexts':
          contexts = (data as Array<{ name: string; description: string; order: number }>).map((c, idx) => ({ ...c, id: `context-${idx}` }));
          sendEvent('contexts', contexts);
          break;
        case 'nodes': {
          const rawNodes = data as Array<{ userName: string; phaseName: string; contextName: string; action: string; emotion: string; emotionScore: number; painPoint: string; opportunity: string }>;
          const layout = calculateLayout(phases, contexts);
          const cellGroupsTemp = new Map<string, Array<{ raw: typeof rawNodes[0], idx: number }>>();
          rawNodes.forEach((n, idx) => {
            const cellKey = `${findIndexByName(phases, n.phaseName)}-${findIndexByName(contexts, n.contextName)}`;
            if (!cellGroupsTemp.has(cellKey)) cellGroupsTemp.set(cellKey, []);
            cellGroupsTemp.get(cellKey)!.push({ raw: n, idx });
          });
          nodes = rawNodes.map((n, idx) => {
            const userIdx = findIndexByName(users, n.userName);
            const phaseIdx = findIndexByName(phases, n.phaseName);
            const contextIdx = findIndexByName(contexts, n.contextName);
            const cellKey = `${phaseIdx}-${contextIdx}`;
            const cellNodes = cellGroupsTemp.get(cellKey) || [];
            const nodeIndexInCell = cellNodes.findIndex(cn => cn.idx === idx);
            const baseX = layout.phasePositions[phaseIdx] ?? (phaseIdx * 200 + LABEL_OFFSET_X);
            const baseY = layout.contextPositions[contextIdx] ?? (contextIdx * 150 + LABEL_OFFSET_Y);
            const centerX = baseX + (layout.phaseWidths[phaseIdx] ?? MIN_PHASE_WIDTH) / 2;
            const centerY = baseY + (layout.contextHeights[contextIdx] ?? MIN_CONTEXT_HEIGHT) / 2;
            const circularPos = calculateCircularPosition(centerX, centerY, nodeIndexInCell, cellNodes.length, CIRCULAR_RADIUS);
            return { ...n, id: `node-${idx}`, userId: `user-${userIdx}`, phaseId: `phase-${phaseIdx}`, contextId: `context-${contextIdx}`, emotion: n.emotion as JourneyNode['emotion'], position: { x: circularPos.x - 60, y: circularPos.y - 30 } };
          });
          sendEvent('nodes', nodes);
          break;
        }
        case 'edges':
          edges = (data as Array<{ fromNodeIndex: number; toNodeIndex: number; description: string }>).map((e, idx) => ({ id: `edge-${idx}`, fromNodeId: `node-${e.fromNodeIndex}`, toNodeId: `node-${e.toNodeIndex}`, description: e.description }));
          sendEvent('edges', edges);
          break;
        case 'intersections': {
          const rawIntersections = data as Array<{ phaseName: string; contextName: string; userNames: string[]; description: string }>;
          intersections = rawIntersections.map((i, idx) => {
            const phaseIdx = findIndexByName(phases, i.phaseName);
            const contextIdx = findIndexByName(contexts, i.contextName);
            const nodeIds = nodes.filter(n => n.phaseId === `phase-${phaseIdx}` && n.contextId === `context-${contextIdx}`).map(n => n.id);
            return { id: `intersection-${idx}`, phaseId: `phase-${phaseIdx}`, contextId: `context-${contextIdx}`, nodeIds, description: i.description };
          });
          sendEvent('intersections', intersections);
          break;
        }
        case 'complete': {
          const now = new Date().toISOString();
          const journey: Journey = { id: journeyId, title: title || 'New Journey Map', description: `${scenario.substring(0, 100)}...`, scenario, users, phases, contexts, nodes, edges, intersections, createdAt: now, updatedAt: now };
          sendEvent('complete', journey);
          res.end();
          break;
        }
        case 'error':
          sendEvent('error', data);
          res.end();
          break;
      }
    });
  } catch (error) {
    console.error('Streaming error:', error);
    sendEvent('error', { message: 'Journey creation failed' });
    res.end();
  }
}
