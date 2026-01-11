import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-glass backdrop-blur-md border border-glassBorder shadow-xl rounded-2xl ${onClick ? 'cursor-pointer hover:bg-glassHover transition-all duration-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
