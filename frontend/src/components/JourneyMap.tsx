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

import TouchpointNode from './nodes/TouchpointNode';
import PhaseLabelNode from './nodes/PhaseLabelNode';
import ContextLabelNode from './nodes/ContextLabelNode';
import type { Journey, Touchpoint, Phase, Context } from '../types/journey';

// 커스텀 노드 타입 등록
const nodeTypes = {
  touchpoint: TouchpointNode,
  phaseLabel: PhaseLabelNode,
  contextLabel: ContextLabelNode,
};

// 동적 간격 계산 상수
const MIN_PHASE_WIDTH = 160;   // Phase 최소 너비
const MIN_CONTEXT_HEIGHT = 120; // Context 최소 높이
const CHAR_WIDTH = 8;          // 글자당 예상 너비 (px)
const LINE_HEIGHT = 24;        // 줄 높이 (px)
const PHASE_PADDING = 60;      // Phase 간 여백
const CONTEXT_PADDING = 40;    // Context 간 여백
const LABEL_OFFSET_X = 160;    // 레이블 영역 X 오프셋
const LABEL_OFFSET_Y = 80;     // 레이블 영역 Y 오프셋

// Phase 너비 계산 (텍스트 길이 기반)
function calculatePhaseWidth(phase: Phase): number {
  const nameWidth = phase.name.length * CHAR_WIDTH + 40;
  const durationWidth = phase.duration ? phase.duration.length * 6 + 20 : 0;
  return Math.max(MIN_PHASE_WIDTH, nameWidth + durationWidth);
}

// Context 높이 계산 (텍스트 길이 기반)
function calculateContextHeight(context: Context): number {
  const nameLines = Math.ceil(context.name.length / 15); // 약 15자당 1줄
  const descLines = context.description ? Math.ceil(context.description.length / 20) : 0;
  const totalLines = nameLines + descLines;
  return Math.max(MIN_CONTEXT_HEIGHT, totalLines * LINE_HEIGHT + 40);
}

// 누적 위치 계산
interface LayoutInfo {
  phasePositions: number[];   // 각 Phase의 X 시작 위치
  phaseWidths: number[];      // 각 Phase의 너비
  contextPositions: number[]; // 각 Context의 Y 시작 위치
  contextHeights: number[];   // 각 Context의 높이
}

function calculateLayout(phases: Phase[], contexts: Context[]): LayoutInfo {
  const phaseWidths = phases.map(calculatePhaseWidth);
  const contextHeights = contexts.map(calculateContextHeight);
  
  // 누적 X 위치 계산
  const phasePositions: number[] = [];
  let currentX = LABEL_OFFSET_X;
  phaseWidths.forEach((width) => {
    phasePositions.push(currentX);
    currentX += width + PHASE_PADDING;
  });
  
  // 누적 Y 위치 계산
  const contextPositions: number[] = [];
  let currentY = LABEL_OFFSET_Y;
  contextHeights.forEach((height) => {
    contextPositions.push(currentY);
    currentY += height + CONTEXT_PADDING;
  });
  
  return { phasePositions, phaseWidths, contextPositions, contextHeights };
}

interface TouchpointNodeData extends Touchpoint {
  contextColor?: string;
  contextName?: string;
  artifactName?: string;
  artifactType?: 'tangible' | 'intangible';
}

interface JourneyMapProps {
  journey: Journey;
  onJourneyUpdate: (journey: Journey) => void;
}

export function JourneyMap({ journey, onJourneyUpdate }: JourneyMapProps) {
  // Context 맵 생성
  const contextMap = useMemo(() => {
    return new Map(journey.contexts.map(c => [c.id, c]));
  }, [journey.contexts]);

  // Artifact 맵 생성
  const artifactMap = useMemo(() => {
    return new Map(journey.artifacts.map(a => [a.id, a]));
  }, [journey.artifacts]);

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
          color: context.color || '#6b7280' 
        },
        draggable: false,
        selectable: false,
      });
    });

    // Touchpoint 노드
    journey.touchpoints.forEach((tp) => {
      const context = contextMap.get(tp.contextId);
      const artifact = artifactMap.get(tp.artifactId);
      
      // contextId에서 인덱스 추출 (context-0 → 0)
      const contextIdx = tp.contextId ? parseInt(tp.contextId.replace('context-', '')) || 0 : 0;
      // phaseId에서 인덱스 추출 (phase-0 → 0)
      const phaseIdx = tp.phaseId ? parseInt(tp.phaseId.replace('phase-', '')) || 0 : 0;
      
      // 셀 내 오프셋 계산 (같은 셀에 여러 노드가 있을 때)
      const cellKey = `${contextIdx}-${phaseIdx}`;
      const cellOffset = cellCurrentCounts.get(cellKey) || 0;
      cellCurrentCounts.set(cellKey, cellOffset + 1);
      
      // 동적 위치 계산
      const baseX = layout.phasePositions[phaseIdx] ?? (phaseIdx * 200 + LABEL_OFFSET_X);
      const baseY = layout.contextPositions[contextIdx] ?? (contextIdx * 150 + LABEL_OFFSET_Y);
      const position = { 
        x: baseX + 20 + (cellOffset * 40),  // 셀 내 오프셋 적용
        y: baseY + 20 
      };
      
      const nodeData: TouchpointNodeData = {
        ...tp,
        contextColor: context?.color,
        contextName: context?.name,
        artifactName: artifact?.name,
        artifactType: artifact?.type,
      };
      nodes.push({
        id: tp.id,
        type: 'touchpoint',
        position,
        data: nodeData as unknown as Record<string, unknown>,
        draggable: true,
      });
    });

    return nodes;
  }, [journey.phases, journey.contexts, journey.touchpoints, contextMap, artifactMap, layout]);

  // Connection을 Edge로 변환
  const buildEdges = useCallback((): Edge[] => {
    return journey.connections.map((conn) => {
      const fromTp = journey.touchpoints.find(tp => tp.id === conn.fromTouchpointId);
      const context = fromTp ? contextMap.get(fromTp.contextId) : null;
      const edgeColor = context?.color || '#6b7280';

      return {
        id: conn.id,
        source: conn.fromTouchpointId,
        target: conn.toTouchpointId,
        label: conn.label,
        type: 'smoothstep',
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
      };
    });
  }, [journey.connections, journey.touchpoints, contextMap]);

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
      if (!node.id.startsWith('tp-')) return;

      const updatedTouchpoints = journey.touchpoints.map((tp) =>
        tp.id === node.id
          ? { ...tp, position: { x: node.position.x, y: node.position.y } }
          : tp
      );

      onJourneyUpdate({
        ...journey,
        touchpoints: updatedTouchpoints,
      });
    },
    [journey, onJourneyUpdate]
  );

  // MiniMap 노드 색상
  const getNodeColor = useCallback((node: Node) => {
    if (node.type === 'phaseLabel') return '#e5e7eb';
    if (node.type === 'contextLabel') {
      const data = node.data as Record<string, unknown>;
      return (data.color as string) || '#6b7280';
    }
    const data = node.data as Record<string, unknown>;
    return (data.contextColor as string) || '#6b7280';
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
