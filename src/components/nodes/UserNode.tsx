import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { 
  User as UserIcon, 
  Bot, 
  Monitor,
  Circle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react';
import type { JourneyNode, User } from '../../types/journey';

// User 타입별 아이콘
const userTypeIcons = {
  human: <UserIcon className="w-4 h-4" />,
  robot: <Bot className="w-4 h-4" />,
  system: <Monitor className="w-4 h-4" />,
  other: <Circle className="w-4 h-4" />,
};

// 감정별 색상
const emotionColors = {
  positive: {
    bg: 'bg-green-50',
    indicator: 'bg-green-500',
    text: 'text-green-600',
  },
  neutral: {
    bg: 'bg-gray-50',
    indicator: 'bg-gray-400',
    text: 'text-gray-600',
  },
  negative: {
    bg: 'bg-red-50',
    indicator: 'bg-red-500',
    text: 'text-red-600',
  },
};

// 감정 이모지
const emotionEmoji = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
};

interface UserNodeData extends JourneyNode {
  user?: User;
  onDelete?: (nodeId: string) => void;
  onUpdate?: (nodeId: string, updates: Partial<JourneyNode>) => void;
}

interface UserNodeProps {
  data: UserNodeData;
  selected?: boolean;
}

function UserNode({ data, selected }: UserNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAction, setEditAction] = useState(data.action);
  const [editPainPoint, setEditPainPoint] = useState(data.painPoint || '');
  const [editOpportunity, setEditOpportunity] = useState(data.opportunity || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { setNodes } = useReactFlow();
  
  const colors = emotionColors[data.emotion] || emotionColors.neutral;
  const userColor = data.user?.color || '#6b7280';
  const userType = data.user?.type || 'other';
  const userName = data.user?.name || 'Unknown';

  // 편집 모드 시작 시 입력 필드 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 편집 모드 변경 시 노드 zIndex 업데이트
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === data.id
          ? { ...node, zIndex: isEditing ? 1000 : 0 }
          : node
      )
    );
  }, [isEditing, data.id, setNodes]);
  
  // 액션 텍스트 truncate
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // 삭제 핸들러
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete && confirm('Delete this node?')) {
      data.onDelete(data.id);
    }
  };

  // 편집 모드 시작
  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAction(data.action);
    setEditPainPoint(data.painPoint || '');
    setEditOpportunity(data.opportunity || '');
    setIsEditing(true);
    setIsExpanded(true);
  };

  // 편집 저장
  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdate) {
      data.onUpdate(data.id, {
        action: editAction,
        painPoint: editPainPoint || undefined,
        opportunity: editOpportunity || undefined,
      });
    }
    setIsEditing(false);
  };

  // 편집 취소
  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditAction(data.action);
    setEditPainPoint(data.painPoint || '');
    setEditOpportunity(data.opportunity || '');
    setIsEditing(false);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      handleCancelEdit(e as unknown as React.MouseEvent);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveEdit(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        rounded-lg border-2 shadow-md transition-all cursor-pointer relative group
        ${colors.bg}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
        ${isExpanded ? 'min-w-[220px] max-w-[280px]' : 'min-w-[120px] max-w-[160px]'}
      `}
      style={{ borderColor: userColor }}
    >
      {/* 액션 버튼들 (호버 시 표시) */}
      {!isEditing && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={handleStartEdit}
            className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 편집 모드 저장/취소 버튼 */}
      {isEditing && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          <button
            onClick={handleSaveEdit}
            className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md transition-colors"
            title="Save (Ctrl+Enter)"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-md transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-white"
        style={{ backgroundColor: userColor }}
      />

      {/* 컴팩트 모드 */}
      {!isExpanded ? (
        <div className="p-2">
          {/* 헤더 - User 정보만 표시 */}
          <div className="flex items-center gap-1.5">
            <span 
              className="p-1 rounded-full" 
              style={{ backgroundColor: `${userColor}30`, color: userColor }}
            >
              {userTypeIcons[userType]}
            </span>
            <span className="text-xs font-semibold truncate flex-1" style={{ color: userColor }}>
              {userName}
            </span>
            <span className="text-sm">{emotionEmoji[data.emotion]}</span>
          </div>
          
          {/* 확장 힌트 */}
          <div className="flex items-center justify-center mt-1 text-gray-400">
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      ) : (
        /* 확장 모드 */
        <>
          {/* 헤더 - User 정보 */}
          <div 
            className="px-3 py-2 flex items-center gap-2 rounded-t-md"
            style={{ backgroundColor: `${userColor}20` }}
          >
            <span 
              className="p-1.5 rounded-full" 
              style={{ backgroundColor: `${userColor}30`, color: userColor }}
            >
              {userTypeIcons[userType]}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold block" style={{ color: userColor }}>
                {userName}
              </span>
              {data.user?.description && (
                <span className="text-xs text-gray-500 truncate block">
                  {data.user.description}
                </span>
              )}
            </div>
          </div>

          {/* 본문 - 행동 */}
          <div className="px-3 py-2">
            {isEditing ? (
              <div className="space-y-2" onKeyDown={handleKeyDown}>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Action</label>
                  <textarea
                    ref={inputRef}
                    value={editAction}
                    onChange={(e) => setEditAction(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm text-gray-800 font-medium leading-tight bg-white border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Enter action"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pain Point</label>
                  <textarea
                    value={editPainPoint}
                    onChange={(e) => setEditPainPoint(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs text-red-600 bg-white border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={2}
                    placeholder="Pain Point (optional)"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Opportunity</label>
                  <textarea
                    value={editOpportunity}
                    onChange={(e) => setEditOpportunity(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs text-blue-600 bg-white border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Opportunity (optional)"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-800 font-medium leading-tight">
                  {data.action}
                </p>
                
                {/* Pain Point */}
                {data.painPoint && data.painPoint.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                    {data.painPoint}
                  </div>
                )}

                {/* Opportunity */}
                {data.opportunity && data.opportunity.length > 0 && (
                  <div className="mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                    {data.opportunity}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 감정 & 스코어 */}
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{emotionEmoji[data.emotion]}</span>
              <span className={`text-xs font-medium ${colors.text}`}>
                {data.emotion}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.indicator} transition-all`}
                style={{ width: `${((data.emotionScore + 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* 축소 힌트 */}
          <div className="flex items-center justify-center pb-1 text-gray-400">
            <ChevronUp className="w-3 h-3" />
          </div>
        </>
      )}

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-white"
        style={{ backgroundColor: userColor }}
      />
    </div>
  );
}

export default memo(UserNode);
