import { memo, useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface PhaseLabelNodeProps {
  data: {
    name: string;
    duration?: string;
    phaseId?: string;
    onUpdate?: (phaseId: string, updates: { name?: string; duration?: string }) => void;
  };
}

function PhaseLabelNode({ data }: PhaseLabelNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [editDuration, setEditDuration] = useState(data.duration || '');
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
    setEditDuration(data.duration || '');
  }, [data.name, data.duration]);

  // 더블클릭으로 편집 모드 시작
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdate && data.phaseId) {
      setIsEditing(true);
    }
  };

  // 편집 저장
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpdate && data.phaseId) {
      data.onUpdate(data.phaseId, {
        name: editName,
        duration: editDuration || undefined,
      });
    }
    setIsEditing(false);
  };

  // 편집 취소
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(data.name);
    setEditDuration(data.duration || '');
    setIsEditing(false);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      handleCancel(e as unknown as React.MouseEvent);
    } else if (e.key === 'Enter') {
      handleSave(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div 
      className={`
        px-4 py-2 bg-white/90 backdrop-blur border border-gray-300 rounded-lg shadow-sm text-center relative
        ${data.onUpdate ? 'cursor-pointer hover:border-gray-400 transition-colors group' : 'pointer-events-none'}
        ${isEditing ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{ 
        minWidth: '80px',
        maxWidth: isEditing ? '160px' : '180px',
      }}
      onDoubleClick={handleDoubleClick}
    >
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

      {isEditing ? (
        <div className="space-y-1" onKeyDown={handleKeyDown}>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Phase name"
          />
          
          <input
            type="text"
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs text-gray-500 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Duration"
          />
        </div>
      ) : (
        <>
          {/* 편집 아이콘 (호버 시 표시) */}
          {data.onUpdate && (
            <button
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (data.onUpdate && data.phaseId) {
                  setIsEditing(true);
                }
              }}
              title="Edit Phase"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
          
          <span 
            className="font-medium text-sm text-gray-800 break-words block"
            style={{ wordBreak: 'keep-all' }}
          >
            {data.name}
          </span>
          {data.duration && (
            <span className="text-xs text-gray-500 block mt-0.5">
              {data.duration}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default memo(PhaseLabelNode);
