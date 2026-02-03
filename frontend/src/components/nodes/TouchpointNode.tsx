import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Smartphone, 
  Monitor, 
  Cpu, 
  Package,
  Wrench,
  Cloud,
  Box,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Touchpoint } from '../../types/journey';

// Artifact 타입별 아이콘
const artifactIcons = {
  tangible: <Box className="w-3 h-3" />,
  intangible: <Cloud className="w-3 h-3" />,
};

// 일반 채널/아티팩트 아이콘
const defaultIcons: Record<string, React.ReactNode> = {
  '웨어러블': <Wrench className="w-3 h-3" />,
  '로봇': <Cpu className="w-3 h-3" />,
  '앱': <Smartphone className="w-3 h-3" />,
  'MES': <Monitor className="w-3 h-3" />,
  '시스템': <Monitor className="w-3 h-3" />,
  '태블릿': <Smartphone className="w-3 h-3" />,
  '충전': <Package className="w-3 h-3" />,
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

interface TouchpointNodeData extends Touchpoint {
  contextColor?: string;
  contextName?: string;
  artifactName?: string;
  artifactType?: 'tangible' | 'intangible';
}

interface TouchpointNodeProps {
  data: TouchpointNodeData;
  selected?: boolean;
}

function TouchpointNode({ data, selected }: TouchpointNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const colors = emotionColors[data.emotion] || emotionColors.neutral;
  const contextColor = data.contextColor || '#6b7280';
  const artifactType = data.artifactType || 'tangible';
  
  // 아티팩트 이름에서 아이콘 찾기
  const getIcon = () => {
    if (data.artifactName) {
      for (const [key, icon] of Object.entries(defaultIcons)) {
        if (data.artifactName.includes(key)) return icon;
      }
    }
    return artifactIcons[artifactType];
  };

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
      style={{ borderColor: contextColor }}
    >
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 border-2 border-white"
        style={{ backgroundColor: contextColor }}
      />

      {/* 컴팩트 모드 */}
      {!isExpanded ? (
        <div className="p-2">
          {/* 헤더 */}
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ color: contextColor }}>{getIcon()}</span>
            <span className="text-[10px] font-medium text-gray-500 truncate flex-1">
              {data.artifactName || 'Artifact'}
            </span>
            <span className="text-sm">{emotionEmoji[data.emotion]}</span>
          </div>
          
          {/* 액션 (짧게) */}
          <p className="text-xs text-gray-800 font-medium leading-tight">
            {truncateText(data.action, 25)}
          </p>
          
          {/* 확장 힌트 */}
          <div className="flex items-center justify-center mt-1 text-gray-400">
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      ) : (
        /* 확장 모드 */
        <>
          {/* 헤더 */}
          <div 
            className="px-3 py-2 flex items-center gap-2 rounded-t-md"
            style={{ backgroundColor: `${contextColor}20` }}
          >
            <span style={{ color: contextColor }}>{getIcon()}</span>
            <span className="text-xs font-medium text-gray-700 truncate flex-1">
              {data.artifactName || 'Artifact'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              artifactType === 'tangible' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {artifactType === 'tangible' ? 'Tangible' : 'Intangible'}
            </span>
          </div>

          {/* 본문 */}
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
        className="w-2 h-2 border-2 border-white"
        style={{ backgroundColor: contextColor }}
      />
    </div>
  );
}

export default memo(TouchpointNode);
