import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  type Connection,
  type Edge,
  type Node,
  type OnReconnect,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import UserNode from './nodes/UserNode';
import PhaseLabelNode from './nodes/PhaseLabelNode';
import ContextLabelNode from './nodes/ContextLabelNode';
import IntersectionNode from './nodes/IntersectionNode';
import type { Journey, JourneyNode, Phase, Context, User } from '../types/journey';

// 커스텀 노드 타입 등록
const nodeTypes = {
  userNode: UserNode,
  phaseLabel: PhaseLabelNode,
  contextLabel: ContextLabelNode,
  intersection: IntersectionNode,
};

// 동적 간격 계산 상수
const MIN_PHASE_WIDTH = 250;
const MIN_CONTEXT_HEIGHT = 200;
const CHAR_WIDTH = 10;
const LINE_HEIGHT = 30;
const PHASE_PADDING = 100;
const CONTEXT_PADDING = 80;
const LABEL_OFFSET_X = 180;
const LABEL_OFFSET_Y = 100;

// 원형 배치 상수
const CIRCULAR_RADIUS = 70;  // 원형 배치 반지름
const INTERSECTION_NODE_SIZE = 60;  // 접점 노드 크기

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
  return Math.max(MIN_CONTEXT_HEIGHT, totalLines * LINE_HEIGHT + 80);
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

// 위치에서 Phase 인덱스 찾기
function findPhaseIndex(
  x: number,
  phasePositions: number[],
  phaseWidths: number[]
): number {
  // 노드 중심 위치 보정 (노드 너비/2 ≈ 60)
  const centerX = x + 60;
  
  for (let i = 0; i < phasePositions.length; i++) {
    const start = phasePositions[i];
    const end = start + phaseWidths[i] + PHASE_PADDING;
    if (centerX >= start && centerX < end) {
      return i;
    }
  }
  
  // 범위 밖이면 가장 가까운 Phase 반환
  if (centerX < phasePositions[0]) return 0;
  return phasePositions.length - 1;
}

// 위치에서 Context 인덱스 찾기
function findContextIndex(
  y: number,
  contextPositions: number[],
  contextHeights: number[]
): number {
  // 노드 중심 위치 보정 (노드 높이/2 ≈ 30)
  const centerY = y + 30;
  
  for (let i = 0; i < contextPositions.length; i++) {
    const start = contextPositions[i];
    const end = start + contextHeights[i] + CONTEXT_PADDING;
    if (centerY >= start && centerY < end) {
      return i;
    }
  }
  
  // 범위 밖이면 가장 가까운 Context 반환
  if (centerY < contextPositions[0]) return 0;
  return contextPositions.length - 1;
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
  
  // 시작 각도를 -90도(위쪽)로 설정
  const startAngle = -Math.PI / 2;
  const angle = startAngle + (2 * Math.PI / total) * index;
  
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

interface UserNodeData extends JourneyNode {
  user?: User;
  onDelete?: (nodeId: string) => void;
  onUpdate?: (nodeId: string, updates: Partial<JourneyNode>) => void;
}

interface JourneyMapProps {
  journey: Journey;
  onJourneyUpdate: (journey: Journey) => void;
}

export function JourneyMap({ journey, onJourneyUpdate }: JourneyMapProps) {
  // 노드 삭제 핸들러
  const handleNodeDelete = useCallback((nodeId: string) => {
    // 해당 노드와 연결된 엣지도 함께 삭제
    const updatedNodes = journey.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = journey.edges.filter(
      e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId
    );
    // Intersection에서도 제거
    const updatedIntersections = journey.intersections.map(i => ({
      ...i,
      nodeIds: i.nodeIds.filter(id => id !== nodeId),
    })).filter(i => i.nodeIds.length > 0);

    onJourneyUpdate({
      ...journey,
      nodes: updatedNodes,
      edges: updatedEdges,
      intersections: updatedIntersections,
    });
  }, [journey, onJourneyUpdate]);

  // 노드 업데이트 핸들러 (텍스트 편집 등)
  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<JourneyNode>) => {
    const updatedNodes = journey.nodes.map(n =>
      n.id === nodeId ? { ...n, ...updates } : n
    );

    onJourneyUpdate({
      ...journey,
      nodes: updatedNodes,
    });
  }, [journey, onJourneyUpdate]);

  // 엣지 삭제 핸들러
  const handleEdgeDelete = useCallback((edgeId: string) => {
    const updatedEdges = journey.edges.filter(e => e.id !== edgeId);
    onJourneyUpdate({
      ...journey,
      edges: updatedEdges,
    });
  }, [journey, onJourneyUpdate]);
  // User 맵 생성
  const userMap = useMemo(() => {
    return new Map(journey.users.map(u => [u.id, u]));
  }, [journey.users]);

  // 동적 레이아웃 계산
  const layout = useMemo(() => {
    return calculateLayout(journey.phases, journey.contexts);
  }, [journey.phases, journey.contexts]);

  // 셀별 노드 그룹핑
  const cellGroups = useMemo(() => {
    const groups = new Map<string, JourneyNode[]>();
    
    journey.nodes.forEach((jNode) => {
      const phaseIdx = jNode.phaseId ? parseInt(jNode.phaseId.replace('phase-', '')) || 0 : 0;
      const contextIdx = jNode.contextId ? parseInt(jNode.contextId.replace('context-', '')) || 0 : 0;
      const cellKey = `${phaseIdx}-${contextIdx}`;
      
      if (!groups.has(cellKey)) {
        groups.set(cellKey, []);
      }
      groups.get(cellKey)!.push(jNode);
    });
    
    return groups;
  }, [journey.nodes]);

  // Intersection 셀 집합
  const intersectionCells = useMemo(() => {
    const cells = new Set<string>();
    
    journey.intersections.forEach((intersection) => {
      const phaseIdx = intersection.phaseId ? parseInt(intersection.phaseId.replace('phase-', '')) || 0 : 0;
      const contextIdx = intersection.contextId ? parseInt(intersection.contextId.replace('context-', '')) || 0 : 0;
      cells.add(`${phaseIdx}-${contextIdx}`);
    });
    
    return cells;
  }, [journey.intersections]);

  // 모든 노드 생성
  const buildNodes = useCallback((): Node[] => {
    const nodes: Node[] = [];

    // Phase 레이블 노드 (상단) - 동적 위치
    journey.phases.forEach((phase, idx) => {
      const x = layout.phasePositions[idx] ?? (idx * 200 + LABEL_OFFSET_X);
      nodes.push({
        id: `phase-label-${phase.id}`,
        type: 'phaseLabel',
        position: { x: x + 40, y: 20 },
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
        position: { x: 20, y: y + 40 },
        data: { 
          name: context.name, 
          description: context.description,
          color: '#6b7280'
        },
        draggable: false,
        selectable: false,
      });
    });

    // 셀별로 노드 배치
    cellGroups.forEach((cellNodes, cellKey) => {
      const [phaseIdxStr, contextIdxStr] = cellKey.split('-');
      const phaseIdx = parseInt(phaseIdxStr);
      const contextIdx = parseInt(contextIdxStr);
      
      const baseX = layout.phasePositions[phaseIdx] ?? (phaseIdx * 200 + LABEL_OFFSET_X);
      const baseY = layout.contextPositions[contextIdx] ?? (contextIdx * 150 + LABEL_OFFSET_Y);
      
      // 셀 중심점
      const phaseWidth = layout.phaseWidths[phaseIdx] ?? MIN_PHASE_WIDTH;
      const contextHeight = layout.contextHeights[contextIdx] ?? MIN_CONTEXT_HEIGHT;
      const centerX = baseX + phaseWidth / 2;
      const centerY = baseY + contextHeight / 2;
      
      const isIntersection = intersectionCells.has(cellKey);
      const nodeCount = cellNodes.length;
      
      // 여러 노드가 있거나 Intersection인 경우 원형 배치
      if (nodeCount > 1 || isIntersection) {
        // 접점 노드 추가 (중앙)
        if (isIntersection) {
          const intersection = journey.intersections.find(i => {
            const pIdx = parseInt(i.phaseId.replace('phase-', '')) || 0;
            const cIdx = parseInt(i.contextId.replace('context-', '')) || 0;
            return `${pIdx}-${cIdx}` === cellKey;
          });
          
          nodes.push({
            id: `intersection-${cellKey}`,
            type: 'intersection',
            position: { 
              x: centerX - INTERSECTION_NODE_SIZE / 2, 
              y: centerY - INTERSECTION_NODE_SIZE / 2 
            },
            data: { 
              userCount: nodeCount,
              description: intersection?.description,
            },
            draggable: false,
            selectable: true,
          });
        }
        
        // 노드들을 원형으로 배치
        cellNodes.forEach((jNode, idx) => {
          const user = userMap.get(jNode.userId);
          
          // 저장된 위치가 있으면 사용, 없으면 원형 배치 계산
          let position: { x: number; y: number };
          if (jNode.position) {
            position = jNode.position;
          } else {
            const circularPos = calculateCircularPosition(
              centerX, 
              centerY, 
              idx, 
              nodeCount, 
              CIRCULAR_RADIUS
            );
            // 노드 크기 보정 (대략 노드 너비/2)
            position = {
              x: circularPos.x - 60,
              y: circularPos.y - 30,
            };
          }
          
          const nodeData: UserNodeData = {
            ...jNode,
            user,
            onDelete: handleNodeDelete,
            onUpdate: handleNodeUpdate,
          };
          
          nodes.push({
            id: jNode.id,
            type: 'userNode',
            position,
            data: nodeData as unknown as Record<string, unknown>,
            draggable: true,
          });
        });
      } else {
        // 단일 노드는 중앙에 배치
        const jNode = cellNodes[0];
        const user = userMap.get(jNode.userId);
        
        const position = jNode.position ?? {
          x: centerX - 60,
          y: centerY - 30,
        };
        
        const nodeData: UserNodeData = {
          ...jNode,
          user,
          onDelete: handleNodeDelete,
          onUpdate: handleNodeUpdate,
        };
        
        nodes.push({
          id: jNode.id,
          type: 'userNode',
          position,
          data: nodeData as unknown as Record<string, unknown>,
          draggable: true,
        });
      }
    });

    return nodes;
  }, [journey.phases, journey.contexts, journey.intersections, cellGroups, intersectionCells, userMap, layout, handleNodeDelete, handleNodeUpdate]);

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
        type: 'default',  // Bezier 곡선
        animated: true,
        reconnectable: true, // 엣지 재연결 허용
        style: { 
          stroke: edgeColor, 
          strokeWidth: 2,
          strokeLinecap: 'round',
        },
        labelStyle: { fontSize: 10, fill: '#666' },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
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
      if (!params.source || !params.target) return;
      
      // 새 엣지 ID 생성
      const newEdgeId = `edge-${Date.now()}`;
      
      // Journey에 새 엣지 추가
      const newJourneyEdge = {
        id: newEdgeId,
        fromNodeId: params.source,
        toNodeId: params.target,
        description: '',
      };
      
      onJourneyUpdate({
        ...journey,
        edges: [...journey.edges, newJourneyEdge],
      });
    },
    [journey, onJourneyUpdate]
  );

  // 엣지 재연결
  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (!newConnection.source || !newConnection.target) return;
      
      // Journey에서 엣지 업데이트
      const updatedEdges = journey.edges.map(e =>
        e.id === oldEdge.id
          ? { ...e, fromNodeId: newConnection.source!, toNodeId: newConnection.target! }
          : e
      );
      
      onJourneyUpdate({
        ...journey,
        edges: updatedEdges,
      });
    },
    [journey, onJourneyUpdate]
  );

  // 엣지 클릭 시 삭제 (더블클릭)
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (confirm('Delete this connector?')) {
        handleEdgeDelete(edge.id);
      }
    },
    [handleEdgeDelete]
  );

  // 노드 삭제 (Delete 키)
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach(node => {
        if (node.id.startsWith('node-')) {
          handleNodeDelete(node.id);
        }
      });
    },
    [handleNodeDelete]
  );

  // 엣지 삭제 (Delete 키)
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const deletedIds = new Set(deletedEdges.map(e => e.id));
      const updatedEdges = journey.edges.filter(e => !deletedIds.has(e.id));
      
      onJourneyUpdate({
        ...journey,
        edges: updatedEdges,
      });
    },
    [journey, onJourneyUpdate]
  );

  // 노드 드래그 종료 시 위치, Phase/Context, Intersection 업데이트
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // userNode 타입만 처리 (레이블, intersection 제외)
      if (node.type !== 'userNode') return;

      // 해당 노드가 journey.nodes에 있는지 확인
      const existingNode = journey.nodes.find(n => n.id === node.id);
      if (!existingNode) return;

      // 새 위치에서 Phase/Context 인덱스 계산
      const newPhaseIdx = findPhaseIndex(node.position.x, layout.phasePositions, layout.phaseWidths);
      const newContextIdx = findContextIndex(node.position.y, layout.contextPositions, layout.contextHeights);
      
      // 새 phaseId, contextId 생성
      const newPhaseId = journey.phases[newPhaseIdx]?.id || existingNode.phaseId;
      const newContextId = journey.contexts[newContextIdx]?.id || existingNode.contextId;

      // 노드 업데이트 (위치 + Phase/Context)
      const updatedNodes = journey.nodes.map((jNode) =>
        jNode.id === node.id
          ? { 
              ...jNode, 
              position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
              phaseId: newPhaseId,
              contextId: newContextId,
            }
          : jNode
      );

      // Intersection 재계산
      const cellNodeMap = new Map<string, { phaseId: string; contextId: string; nodeIds: string[] }>();
      updatedNodes.forEach((jNode) => {
        const cellKey = `${jNode.phaseId}::${jNode.contextId}`; // :: 구분자 사용
        if (!cellNodeMap.has(cellKey)) {
          cellNodeMap.set(cellKey, { phaseId: jNode.phaseId, contextId: jNode.contextId, nodeIds: [] });
        }
        cellNodeMap.get(cellKey)!.nodeIds.push(jNode.id);
      });

      // 2개 이상의 노드가 있는 셀에 Intersection 생성
      const updatedIntersections = Array.from(cellNodeMap.values())
        .filter((cell) => cell.nodeIds.length >= 2)
        .map((cell) => {
          // 기존 Intersection 찾기
          const existingIntersection = journey.intersections.find(
            i => i.phaseId === cell.phaseId && i.contextId === cell.contextId
          );
          return {
            id: existingIntersection?.id || `intersection-${cell.phaseId}-${cell.contextId}`,
            phaseId: cell.phaseId,
            contextId: cell.contextId,
            nodeIds: cell.nodeIds,
            description: existingIntersection?.description,
          };
        });

      onJourneyUpdate({
        ...journey,
        nodes: updatedNodes,
        intersections: updatedIntersections,
      });
    },
    [journey, onJourneyUpdate, layout]
  );

  // MiniMap 노드 색상
  const getNodeColor = useCallback((node: Node) => {
    if (node.type === 'phaseLabel') return '#e5e7eb';
    if (node.type === 'contextLabel') return '#9ca3af';
    if (node.type === 'intersection') return '#a855f7';
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
        onReconnect={onReconnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onEdgeDoubleClick={onEdgeDoubleClick}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
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
