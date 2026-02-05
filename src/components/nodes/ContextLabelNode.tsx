import { memo, useState, useRef, useEffect } from 'react';
import { MapPin, Pencil, Check, X } from 'lucide-react';

interface ContextLabelNodeProps {
  data: {
    name: string;
    description?: string;
    color: string;
    contextId?: string;
    onUpdate?: (contextId: string, updates: { name?: string; description?: string }) => void;
  };
}

function ContextLabelNode({ data }: ContextLabelNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [editDescription, setEditDescription] = useState(data.description || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집 모드 시작 시 입력 필드 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // data가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    setEditName(data.name);
    setEditDescription(data.description || '');
  }, [data.name, data.description]);

  // 더블클릭으로 편집 모드 시작
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdate && data.contextId) {
      setIsEditing(true);
    }
  };

  // 편집 저장
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdate && data.contextId) {
      data.onUpdate(data.contextId, {
        name: editName,
        description: editDescription || undefined,
      });
    }
    setIsEditing(false);
  };

  // 편집 취소
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(data.name);
    setEditDescription(data.description || '');
    setIsEditing(false);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      handleCancel(e as unknown as React.MouseEvent);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSave(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div 
      className={`
        flex items-start gap-2 px-3 py-2 rounded-lg shadow-sm border relative
        ${data.onUpdate ? 'cursor-pointer hover:shadow-md transition-all group' : 'pointer-events-none'}
        ${isEditing ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{ 
        backgroundColor: `${data.color}15`,
        borderColor: data.color,
        minWidth: '100px',
        maxWidth: isEditing ? '180px' : '140px',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* 편집 아이콘 (호버 시 표시) */}
      {data.onUpdate && !isEditing && (
        <button
          className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-sm cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (data.onUpdate && data.contextId) {
              setIsEditing(true);
            }
          }}
          title="Edit Context"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
      )}

      {/* 편집 모드 저장/취소 버튼 (박스 외부) */}
      {isEditing && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          <button
            onClick={handleSave}
            className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-sm transition-colors"
            title="Save (Enter)"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-sm transition-colors"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <span style={{ color: data.color }} className="mt-0.5 flex-shrink-0">
        <MapPin className="w-4 h-4" />
      </span>
      
      {isEditing ? (
        <div className="flex flex-col min-w-0 flex-1 space-y-1" onKeyDown={handleKeyDown}>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Context name"
          />
          
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs text-gray-500 bg-white border border-gray-300 rounded px-1.5 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="Description"
          />
        </div>
      ) : (
        <div className="flex flex-col min-w-0">
          <span 
            className="text-sm font-medium text-gray-800 break-words"
            style={{ wordBreak: 'keep-all' }}
          >
            {data.name}
          </span>
          {data.description && (
            <span 
              className="text-xs text-gray-500 break-words mt-0.5"
              style={{ wordBreak: 'keep-all' }}
            >
              {data.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ContextLabelNode);
