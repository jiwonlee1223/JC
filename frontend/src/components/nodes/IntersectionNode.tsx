import { memo } from 'react';
import { Users } from 'lucide-react';

interface IntersectionNodeProps {
  data: {
    userCount: number;
    description?: string;
  };
}

function IntersectionNode({ data }: IntersectionNodeProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center rounded-full border-2 border-dashed border-purple-400 bg-purple-50/80 backdrop-blur shadow-lg"
      style={{ 
        width: 60, 
        height: 60,
      }}
    >
      <Users className="w-5 h-5 text-purple-600" />
      <span className="text-xs font-bold text-purple-700">{data.userCount}</span>
    </div>
  );
}

export default memo(IntersectionNode);
