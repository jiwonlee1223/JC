import { memo } from 'react';

interface IntersectionNodeProps {
  data: {
    userCount: number;
    description?: string;
  };
}

function IntersectionNode({ data }: IntersectionNodeProps) {
  // User 수에 따라 투명도 계산 (2명: 0.45, 3명: 0.6, 4명: 0.75, 5명+: 0.85)
  const baseOpacity = 0.15;
  const opacityPerUser = 0.15;
  const opacity = Math.min(baseOpacity + (data.userCount * opacityPerUser), 0.85);

  // User 수에 따라 크기 계산 (2명: 50px, 3명: 65px, 4명: 80px, 5명+: 95px)
  const baseSize = 20;
  const sizePerUser = 15;
  const size = Math.min(baseSize + (data.userCount * sizePerUser), 110);

  // blur 강도도 크기에 비례
  const blurAmount = Math.min(6 + data.userCount * 2, 14);

  // 폰트 크기도 원 크기에 비례
  const fontSize = Math.min(14 + data.userCount * 2, 24);

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* Blurry background circle */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{ 
          backgroundColor: `rgba(168, 85, 247, ${opacity})`, // purple-500
          filter: `blur(${blurAmount}px)`,
          boxShadow: `0 0 ${size / 2}px rgba(168, 85, 247, ${opacity * 0.8})`,
        }}
      />
      {/* User count number */}
      <span 
        className="relative z-10 font-bold text-white"
        style={{ 
          fontSize: `${fontSize}px`,
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      >
        {data.userCount}
      </span>
    </div>
  );
}

export default memo(IntersectionNode);
