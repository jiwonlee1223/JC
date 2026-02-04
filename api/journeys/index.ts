import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { extractJourneyElements } from '../lib/openai.js';
import { USER_COLORS, findIndexByName, calculateLayout, calculateCircularPosition, CIRCULAR_RADIUS, MIN_PHASE_WIDTH, MIN_CONTEXT_HEIGHT, LABEL_OFFSET_X, LABEL_OFFSET_Y } from '../lib/journey-utils.js';
import type { Journey, User, Phase, Context, JourneyNode, JourneyEdge, Intersection, CreateJourneyRequest, CreateJourneyResponse } from '../lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const request: CreateJourneyRequest = req.body;
      if (!request.scenario?.trim()) {
        return res.status(400).json({ success: false, error: '시나리오 텍스트를 입력해주세요.' } as CreateJourneyResponse);
      }

      const extracted = await extractJourneyElements(request.scenario);

      const users: User[] = extracted.users.map((u, idx) => ({ ...u, id: `user-${idx}`, type: u.type as User['type'], color: USER_COLORS[idx % USER_COLORS.length] }));
      const phases: Phase[] = extracted.phases.map((p, idx) => ({ ...p, id: `phase-${idx}` }));
      const contexts: Context[] = extracted.contexts.map((c, idx) => ({ ...c, id: `context-${idx}` }));

      const layout = calculateLayout(phases, contexts);

      const cellGroupsTemp = new Map<string, Array<{ raw: typeof extracted.nodes[0], idx: number }>>();
      extracted.nodes.forEach((n, idx) => {
        const cellKey = `${findIndexByName(phases, n.phaseName)}-${findIndexByName(contexts, n.contextName)}`;
        if (!cellGroupsTemp.has(cellKey)) cellGroupsTemp.set(cellKey, []);
        cellGroupsTemp.get(cellKey)!.push({ raw: n, idx });
      });

      const nodes: JourneyNode[] = extracted.nodes.map((n, idx) => {
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

      const edges: JourneyEdge[] = extracted.edges.map((e, idx) => ({ id: `edge-${idx}`, fromNodeId: `node-${e.fromNodeIndex}`, toNodeId: `node-${e.toNodeIndex}`, description: e.description }));

      const intersections: Intersection[] = extracted.intersections.map((i, idx) => {
        const phaseIdx = findIndexByName(phases, i.phaseName);
        const contextIdx = findIndexByName(contexts, i.contextName);
        const nodeIds = nodes.filter(n => n.phaseId === `phase-${phaseIdx}` && n.contextId === `context-${contextIdx}`).map(n => n.id);
        return { id: `intersection-${idx}`, phaseId: `phase-${phaseIdx}`, contextId: `context-${contextIdx}`, nodeIds, description: i.description };
      });

      const now = new Date().toISOString();
      const journey: Journey = { id: uuidv4(), title: request.title || 'New Journey Map', description: `${request.scenario.substring(0, 100)}...`, scenario: request.scenario, users, phases, contexts, nodes, edges, intersections, createdAt: now, updatedAt: now };

      return res.status(201).json({ success: true, journey } as CreateJourneyResponse);
    } catch (error) {
      console.error('Journey creation error:', error);
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : '여정 생성 중 오류가 발생했습니다.' } as CreateJourneyResponse);
    }
  }

  if (req.method === 'GET') {
    return res.json({ success: true, journeys: [] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
