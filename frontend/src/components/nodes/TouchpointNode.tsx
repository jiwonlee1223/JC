import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Smartphone, 
  Monitor, 
  Cpu, 
  Package,
  Wrench,
  Cloud,
  Box
} from 'lucide-react';
import type { Touchpoint } from '../../types/journey';

// Artifact 타입별 아이콘
const artifactIcons = {
  tangible: <Box className="w-4 h-4" />,
  intangible: <Cloud className="w-4 h-4" />,
};

// 일반 채널/아티팩트 아이콘
const defaultIcons: Record<string, React.ReactNode> = {
  '웨어러블': <Wrench className="w-4 h-4" />,
  '로봇': <Cpu className="w-4 h-4" />,
  '앱': <Smartphone className="w-4 h-4" />,
  'MES': <Monitor className="w-4 h-4" />,
  '시스템': <Monitor className="w-4 h-4" />,
  '태블릿': <Smartphone className="w-4 h-4" />,
  '충전': <Package className="w-4 h-4" />,
};

// 감정별 색상
const emotionColors = {
  positive: {
    bg: 'bg-green-50',
    indicator: 'bg-green-500',
  },
  neutral: {
    bg: 'bg-gray-50',
    indicator: 'bg-gray-400',
  },
  negative: {
    bg: 'bg-red-50',
    indicator: 'bg-red-500',
  },
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

  return (
    <div
      className={`
        min-w-[180px] max-w-[240px] rounded-lg border-2 shadow-md transition-all
        ${colors.bg}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
      `}
      style={{ borderColor: contextColor }}
    >
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-white"
        style={{ backgroundColor: contextColor }}
      />

      {/* 헤더 - Artifact 정보 */}
      <div 
        className="px-3 py-2 flex items-center gap-2 rounded-t-md"
        style={{ backgroundColor: `${contextColor}20` }}
      >
        <span style={{ color: contextColor }}>{getIcon()}</span>
        <span className="text-xs font-medium text-gray-700 truncate">
          {data.artifactName || 'Artifact'}
        </span>
        {/* Artifact 타입 뱃지 */}
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
          artifactType === 'tangible' 
            ? 'bg-amber-100 text-amber-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {artifactType === 'tangible' ? 'T' : 'I'}
        </span>
        <div className={`w-2 h-2 rounded-full ${colors.indicator}`} />
      </div>

      {/* 본문 - Action */}
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

      {/* 상태 스코어 바 */}
      <div className="px-3 pb-2">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.indicator} transition-all`}
            style={{ width: `${((data.emotionScore + 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-white"
        style={{ backgroundColor: contextColor }}
      />
    </div>
  );
}

export default memo(TouchpointNode);
