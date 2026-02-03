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
import type { Journey, Touchpoint } from '../types/journey';

// 커스텀 노드 타입 등록
const nodeTypes = {
  touchpoint: TouchpointNode,
  phaseLabel: PhaseLabelNode,
  contextLabel: ContextLabelNode,
};

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

  // 모든 노드 생성
  const buildNodes = useCallback((): Node[] => {
    const nodes: Node[] = [];

    // Phase 레이블 노드 (상단) - 컴팩트 모드 기준 간격
    journey.phases.forEach((phase, idx) => {
      nodes.push({
        id: `phase-label-${phase.id}`,
        type: 'phaseLabel',
        position: { x: idx * 200 + 160, y: 20 },
        data: { name: phase.name, duration: phase.duration },
        draggable: false,
        selectable: false,
      });
    });

    // Context 레이블 노드 (좌측) - 컴팩트 모드 기준 간격
    journey.contexts.forEach((context, idx) => {
      nodes.push({
        id: `context-label-${context.id}`,
        type: 'contextLabel',
        position: { x: 20, y: idx * 150 + 100 },
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
    journey.touchpoints.forEach((tp, idx) => {
      const context = contextMap.get(tp.contextId);
      const artifact = artifactMap.get(tp.artifactId);
      
      // contextId에서 인덱스 추출 (context-0 → 0)
      const contextIdx = tp.contextId ? parseInt(tp.contextId.replace('context-', '')) || 0 : 0;
      // phaseId에서 인덱스 추출 (phase-0 → 0)
      const phaseIdx = tp.phaseId ? parseInt(tp.phaseId.replace('phase-', '')) || 0 : 0;
      
      // 위치가 없거나 잘못된 경우 계산 (컴팩트 모드 기준 간격)
      const position = tp.position && tp.position.x !== undefined && tp.position.y !== undefined
        ? tp.position
        : { x: phaseIdx * 200 + 180, y: contextIdx * 150 + 120 };
      
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
  }, [journey.phases, journey.contexts, journey.touchpoints, contextMap, artifactMap]);

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
