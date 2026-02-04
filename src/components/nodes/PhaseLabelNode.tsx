import { memo } from 'react';

interface PhaseLabelNodeProps {
  data: {
    name: string;
    duration?: string;
  };
}

function PhaseLabelNode({ data }: PhaseLabelNodeProps) {
  return (
    <div 
      className="px-4 py-2 bg-white/90 backdrop-blur border border-gray-300 rounded-lg shadow-sm pointer-events-none text-center"
      style={{ 
        minWidth: '80px',
        maxWidth: '180px',
      }}
    >
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
    </div>
  );
}

export default memo(PhaseLabelNode);
