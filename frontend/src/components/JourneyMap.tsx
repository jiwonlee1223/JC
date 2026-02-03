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
import ActorLabelNode from './nodes/ActorLabelNode';
import type { Journey, Touchpoint } from '../types/journey';

// 커스텀 노드 타입 등록
const nodeTypes = {
  touchpoint: TouchpointNode,
  phaseLabel: PhaseLabelNode,
  actorLabel: ActorLabelNode,
};

interface TouchpointNodeData extends Touchpoint {
  actorColor?: string;
  actorName?: string;
}

interface JourneyMapProps {
  journey: Journey;
  onJourneyUpdate: (journey: Journey) => void;
}

export function JourneyMap({ journey, onJourneyUpdate }: JourneyMapProps) {
  // Actor 맵 생성
  const actorMap = useMemo(() => {
    return new Map(journey.actors.map(a => [a.id, a]));
  }, [journey.actors]);

  // 모든 노드 생성 (Phase 레이블 + Actor 레이블 + Touchpoint)
  const buildNodes = useCallback((): Node[] => {
    const nodes: Node[] = [];

    // Phase 레이블 노드 (상단에 배치)
    journey.phases.forEach((phase, idx) => {
      nodes.push({
        id: `phase-label-${phase.id}`,
        type: 'phaseLabel',
        position: { x: idx * 280 + 150, y: 20 },
        data: { name: phase.name, duration: phase.duration },
        draggable: false,
        selectable: false,
      });
    });

    // Actor 레이블 노드 (좌측에 배치)
    journey.actors.forEach((actor) => {
      nodes.push({
        id: `actor-label-${actor.id}`,
        type: 'actorLabel',
        position: { x: 20, y: actor.order * 180 + 100 },
        data: { name: actor.name, type: actor.type, color: actor.color || '#6b7280' },
        draggable: false,
        selectable: false,
      });
    });

    // Touchpoint 노드
    journey.touchpoints.forEach((tp) => {
      const actor = actorMap.get(tp.actorId);
      const nodeData: TouchpointNodeData = {
        ...tp,
        actorColor: actor?.color,
        actorName: actor?.name,
      };
      nodes.push({
        id: tp.id,
        type: 'touchpoint',
        position: tp.position,
        data: nodeData as unknown as Record<string, unknown>,
        draggable: true,
      });
    });

    return nodes;
  }, [journey.phases, journey.actors, journey.touchpoints, actorMap]);

  // Connection을 Edge로 변환
  const buildEdges = useCallback((): Edge[] => {
    return journey.connections.map((conn) => {
      // 연결의 시작점 Actor 색상 사용
      const fromTp = journey.touchpoints.find(tp => tp.id === conn.fromTouchpointId);
      const actor = fromTp ? actorMap.get(fromTp.actorId) : null;
      const edgeColor = actor?.color || '#6b7280';

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
  }, [journey.connections, journey.touchpoints, actorMap]);

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

  // 노드 드래그 종료 시 위치 업데이트 (Touchpoint만)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Touchpoint 노드만 업데이트 (레이블 노드 제외)
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
    if (node.type === 'actorLabel') {
      const data = node.data as Record<string, unknown>;
      return (data.color as string) || '#6b7280';
    }
    const data = node.data as Record<string, unknown>;
    return (data.actorColor as string) || '#6b7280';
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
