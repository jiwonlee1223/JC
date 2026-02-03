import { memo } from 'react';

interface PhaseLabelNodeProps {
  data: {
    name: string;
    duration?: string;
  };
}

function PhaseLabelNode({ data }: PhaseLabelNodeProps) {
  return (
    <div className="px-4 py-2 bg-white/90 backdrop-blur border border-gray-300 rounded-lg font-medium text-sm shadow-sm pointer-events-none">
      <span className="text-gray-800">{data.name}</span>
      {data.duration && (
        <span className="ml-2 text-xs text-gray-500">({data.duration})</span>
      )}
    </div>
  );
}

export default memo(PhaseLabelNode);
