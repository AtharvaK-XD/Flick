import React, { useRef, useState } from 'react';

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxRotation?: number; // max rotation degrees, default: 8
}

export function Card3D({ children, maxRotation = 8, className = '', ...props }: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glowStyle, setGlowStyle] = useState<React.CSSProperties>({
    opacity: 0,
    background: 'radial-gradient(circle at 0px 0px, rgba(124, 58, 237, 0.15) 0%, transparent 60%)'
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // px relative to card
    const y = e.clientY - rect.top;  // px relative to card
    
    const pctX = (e.clientX - rect.left) / rect.width;   // 0 to 1
    const pctY = (e.clientY - rect.top) / rect.height;    // 0 to 1
    
    // Calculate rotation: center of card is 0
    const rotateX = (pctY - 0.5) * -2 * maxRotation;      // -maxRotation to +maxRotation degrees
    const rotateY = (pctX - 0.5) * 2 * maxRotation;       // -maxRotation to +maxRotation degrees
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    setGlowStyle({
      opacity: 1,
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(124, 58, 237, 0.15) 0%, transparent 60%)`
    });
  };

  const handleMouseLeave = () => {
    // Reset transform smoothly
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
    setGlowStyle(prev => ({
      ...prev,
      opacity: 0
    }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
        transformStyle: 'preserve-3d',
      }}
      className={className}
      {...props}
    >
      <div 
        style={{
          ...glowStyle,
          transition: 'opacity 0.3s ease',
        }}
        className="absolute inset-0 pointer-events-none z-0 rounded-xl"
      />
      {children}
    </div>
  );
}
export default Card3D;
