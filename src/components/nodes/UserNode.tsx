import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  User as UserIcon, 
  Bot, 
  Monitor,
  Circle,
  ChevronDown,
  ChevronUp
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
}

interface UserNodeProps {
  data: UserNodeData;
  selected?: boolean;
}

function UserNode({ data, selected }: UserNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colors = emotionColors[data.emotion] || emotionColors.neutral;
  const userColor = data.user?.color || '#6b7280';
  const userType = data.user?.type || 'other';
  const userName = data.user?.name || 'Unknown';
  
  // 액션 텍스트 truncate
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        rounded-lg border-2 shadow-md transition-all cursor-pointer
        ${colors.bg}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
        ${isExpanded ? 'min-w-[220px] max-w-[280px]' : 'min-w-[120px] max-w-[160px]'}
      `}
      style={{ borderColor: userColor }}
    >
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
          {/* 헤더 - User 정보 */}
          <div className="flex items-center gap-1.5 mb-1">
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
          
          {/* 액션 (짧게) */}
          <p className="text-xs text-gray-800 leading-tight">
            {truncateText(data.action, 30)}
          </p>
          
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
