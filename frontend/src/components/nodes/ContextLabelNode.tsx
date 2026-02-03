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
      className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm border pointer-events-none min-w-[120px]"
      style={{ 
        backgroundColor: `${data.color}15`,
        borderColor: data.color,
      }}
    >
      <span style={{ color: data.color }}>
        <MapPin className="w-4 h-4" />
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{data.name}</span>
        {data.description && (
          <span className="text-xs text-gray-500 truncate max-w-[100px]">{data.description}</span>
        )}
      </div>
    </div>
  );
}

export default memo(ContextLabelNode);
