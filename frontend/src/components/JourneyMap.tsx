import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import UserNode from './nodes/UserNode';
import PhaseLabelNode from './nodes/PhaseLabelNode';
import ContextLabelNode from './nodes/ContextLabelNode';
import type { Journey, JourneyNode, Phase, Context, User } from '../types/journey';

// 커스텀 노드 타입 등록
const nodeTypes = {
  userNode: UserNode,
  phaseLabel: PhaseLabelNode,
  contextLabel: ContextLabelNode,
};

// 동적 간격 계산 상수
const MIN_PHASE_WIDTH = 200;
const MIN_CONTEXT_HEIGHT = 150;
const CHAR_WIDTH = 10;
const LINE_HEIGHT = 30;
const PHASE_PADDING = 80;
const CONTEXT_PADDING = 60;
const LABEL_OFFSET_X = 180;
const LABEL_OFFSET_Y = 100;

// Phase 너비 계산 (텍스트 길이 기반)
function calculatePhaseWidth(phase: Phase): number {
  const nameWidth = phase.name.length * CHAR_WIDTH + 60;
  return Math.max(MIN_PHASE_WIDTH, nameWidth);
}

// Context 높이 계산 (텍스트 길이 기반)
function calculateContextHeight(context: Context): number {
  const nameLines = Math.ceil(context.name.length / 12);
  const descLines = context.description ? Math.ceil(context.description.length / 18) : 0;
  const totalLines = nameLines + descLines;
  return Math.max(MIN_CONTEXT_HEIGHT, totalLines * LINE_HEIGHT + 60);
}

// 누적 위치 계산
interface LayoutInfo {
  phasePositions: number[];
  phaseWidths: number[];
  contextPositions: number[];
  contextHeights: number[];
}

function calculateLayout(phases: Phase[], contexts: Context[]): LayoutInfo {
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

interface UserNodeData extends JourneyNode {
  user?: User;
}

interface JourneyMapProps {
  journey: Journey;
  onJourneyUpdate: (journey: Journey) => void;
}

export function JourneyMap({ journey, onJourneyUpdate }: JourneyMapProps) {
  // User 맵 생성
  const userMap = useMemo(() => {
    return new Map(journey.users.map(u => [u.id, u]));
  }, [journey.users]);

  // 동적 레이아웃 계산
  const layout = useMemo(() => {
    return calculateLayout(journey.phases, journey.contexts);
  }, [journey.phases, journey.contexts]);

  // 모든 노드 생성
  const buildNodes = useCallback((): Node[] => {
    const nodes: Node[] = [];
    const cellCurrentCounts = new Map<string, number>();

    // Phase 레이블 노드 (상단) - 동적 위치
    journey.phases.forEach((phase, idx) => {
      const x = layout.phasePositions[idx] ?? (idx * 200 + LABEL_OFFSET_X);
      nodes.push({
        id: `phase-label-${phase.id}`,
        type: 'phaseLabel',
        position: { x, y: 20 },
        data: { name: phase.name, duration: phase.duration },
        draggable: false,
        selectable: false,
      });
    });

    // Context 레이블 노드 (좌측) - 동적 위치
    journey.contexts.forEach((context, idx) => {
      const y = layout.contextPositions[idx] ?? (idx * 150 + LABEL_OFFSET_Y);
      nodes.push({
        id: `context-label-${context.id}`,
        type: 'contextLabel',
        position: { x: 20, y },
        data: { 
          name: context.name, 
          description: context.description,
          color: '#6b7280'  // Context는 회색 고정
        },
        draggable: false,
        selectable: false,
      });
    });

    // User 노드 (JourneyNode)
    journey.nodes.forEach((jNode) => {
      const user = userMap.get(jNode.userId);
      
      // phaseId에서 인덱스 추출
      const phaseIdx = jNode.phaseId ? parseInt(jNode.phaseId.replace('phase-', '')) || 0 : 0;
      // contextId에서 인덱스 추출
      const contextIdx = jNode.contextId ? parseInt(jNode.contextId.replace('context-', '')) || 0 : 0;
      
      // 셀 내 오프셋 계산 (같은 셀에 여러 노드가 있을 때)
      const cellKey = `${phaseIdx}-${contextIdx}`;
      const cellOffset = cellCurrentCounts.get(cellKey) || 0;
      cellCurrentCounts.set(cellKey, cellOffset + 1);
      
      // 동적 위치 계산
      const baseX = layout.phasePositions[phaseIdx] ?? (phaseIdx * 200 + LABEL_OFFSET_X);
      const baseY = layout.contextPositions[contextIdx] ?? (contextIdx * 150 + LABEL_OFFSET_Y);
      const position = jNode.position ?? { 
        x: baseX + 20 + (cellOffset * 50),
        y: baseY + 20 
      };
      
      const nodeData: UserNodeData = {
        ...jNode,
        user,
      };
      
      nodes.push({
        id: jNode.id,
        type: 'userNode',
        position,
        data: nodeData as unknown as Record<string, unknown>,
        draggable: true,
      });
    });

    return nodes;
  }, [journey.phases, journey.contexts, journey.nodes, userMap, layout]);

  // Edge를 ReactFlow Edge로 변환
  const buildEdges = useCallback((): Edge[] => {
    return journey.edges.map((jEdge) => {
      // fromNode의 User 색상 가져오기
      const fromNode = journey.nodes.find(n => n.id === jEdge.fromNodeId);
      const user = fromNode ? userMap.get(fromNode.userId) : null;
      const edgeColor = user?.color || '#6b7280';

      return {
        id: jEdge.id,
        source: jEdge.fromNodeId,
        target: jEdge.toNodeId,
        label: jEdge.description,
        type: 'smoothstep',
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#666' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      };
    });
  }, [journey.edges, journey.nodes, userMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges());

  // journey가 변경되면 노드/엣지 업데이트
  useEffect(() => {
    setNodes(buildNodes());
    setEdges(buildEdges());
  }, [journey, buildNodes, buildEdges, setNodes, setEdges]);

  // 새 연결 생성
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6b7280', strokeWidth: 2 },
      }, eds));
    },
    [setEdges]
  );

  // 노드 드래그 종료 시 위치 업데이트
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!node.id.startsWith('node-')) return;

      const updatedNodes = journey.nodes.map((jNode) =>
        jNode.id === node.id
          ? { ...jNode, position: { x: node.position.x, y: node.position.y } }
          : jNode
      );

      onJourneyUpdate({
        ...journey,
        nodes: updatedNodes,
      });
    },
    [journey, onJourneyUpdate]
  );

  // MiniMap 노드 색상
  const getNodeColor = useCallback((node: Node) => {
    if (node.type === 'phaseLabel') return '#e5e7eb';
    if (node.type === 'contextLabel') return '#9ca3af';
    const data = node.data as Record<string, unknown>;
    const user = data.user as User | undefined;
    return user?.color || '#6b7280';
  }, []);

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1d5db" />
        <Controls position="bottom-right" />
        <MiniMap 
          position="bottom-left"
          nodeColor={getNodeColor}
          maskColor="rgba(0,0,0,0.1)"
        />
      </ReactFlow>
    </div>
  );
}
