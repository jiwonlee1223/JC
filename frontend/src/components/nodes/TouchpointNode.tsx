import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Smartphone, 
  Monitor, 
  Cpu, 
  Battery, 
  Package, 
  Clipboard,
  Truck,
  Settings
} from 'lucide-react';
import type { Touchpoint } from '../../types/journey';

// 채널별 아이콘 매핑 (스마트 팩토리 + 일반)
const channelIcons: Record<string, React.ReactNode> = {
  '태블릿': <Smartphone className="w-4 h-4" />,
  'MES': <Cpu className="w-4 h-4" />,
  'MES시스템': <Cpu className="w-4 h-4" />,
  '충전스테이션': <Battery className="w-4 h-4" />,
  '충전 스테이션': <Battery className="w-4 h-4" />,
  '자재창고': <Package className="w-4 h-4" />,
  '품질검사': <Clipboard className="w-4 h-4" />,
  '로커룸': <Settings className="w-4 h-4" />,
  'AGV': <Truck className="w-4 h-4" />,
  '앱': <Smartphone className="w-4 h-4" />,
  '모바일': <Smartphone className="w-4 h-4" />,
  '웹사이트': <Monitor className="w-4 h-4" />,
  '시스템': <Cpu className="w-4 h-4" />,
};

// 감정별 색상
const emotionColors = {
  positive: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-700',
    indicator: 'bg-green-500',
  },
  neutral: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-700',
    indicator: 'bg-gray-400',
  },
  negative: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    indicator: 'bg-red-500',
  },
};

interface TouchpointNodeData extends Touchpoint {
  actorColor?: string;
  actorName?: string;
}

interface TouchpointNodeProps {
  data: TouchpointNodeData;
  selected?: boolean;
}

function TouchpointNode({ data, selected }: TouchpointNodeProps) {
  const colors = emotionColors[data.emotion] || emotionColors.neutral;
  const icon = channelIcons[data.channel] || <Monitor className="w-4 h-4" />;
  const actorColor = data.actorColor || '#6b7280';

  return (
    <div
      className={`
        min-w-[180px] max-w-[220px] rounded-lg border-2 shadow-md transition-all
        ${colors.bg}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}
      `}
      style={{ borderColor: actorColor }}
    >
      {/* 입력 핸들 */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-white"
        style={{ backgroundColor: actorColor }}
      />

      {/* 헤더 - Actor 색상 바 */}
      <div 
        className="px-3 py-2 flex items-center gap-2 rounded-t-md"
        style={{ backgroundColor: `${actorColor}20` }}
      >
        <span style={{ color: actorColor }}>{icon}</span>
        <span className="text-xs font-medium text-gray-700">{data.channel}</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${colors.indicator}`} />
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
        style={{ backgroundColor: actorColor }}
      />
    </div>
  );
}

export default memo(TouchpointNode);
