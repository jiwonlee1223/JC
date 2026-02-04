import { memo } from 'react';
import { MapPin } from 'lucide-react';

interface ContextLabelNodeProps {
  data: {
    name: string;
    description?: string;
    color: string;
  };
}

function ContextLabelNode({ data }: ContextLabelNodeProps) {
  return (
    <div 
      className="flex items-start gap-2 px-3 py-2 rounded-lg shadow-sm border pointer-events-none"
      style={{ 
        backgroundColor: `${data.color}15`,
        borderColor: data.color,
        minWidth: '100px',
        maxWidth: '140px',
      }}
    >
      <span style={{ color: data.color }} className="mt-0.5 flex-shrink-0">
        <MapPin className="w-4 h-4" />
      </span>
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
    </div>
  );
}

export default memo(ContextLabelNode);
