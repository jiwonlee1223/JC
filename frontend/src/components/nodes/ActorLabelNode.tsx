import { memo } from 'react';
import { User, Bot, Cpu } from 'lucide-react';

interface ActorLabelNodeProps {
  data: {
    name: string;
    type: 'human' | 'robot' | 'system';
    color: string;
  };
}

const actorTypeIcons: Record<string, React.ReactNode> = {
  human: <User className="w-4 h-4" />,
  robot: <Bot className="w-4 h-4" />,
  system: <Cpu className="w-4 h-4" />,
};

function ActorLabelNode({ data }: ActorLabelNodeProps) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm border pointer-events-none"
      style={{ 
        backgroundColor: `${data.color}15`,
        borderColor: data.color,
      }}
    >
      <span style={{ color: data.color }}>
        {actorTypeIcons[data.type] || <User className="w-4 h-4" />}
      </span>
      <span className="text-sm font-medium text-gray-800">{data.name}</span>
    </div>
  );
}

export default memo(ActorLabelNode);
