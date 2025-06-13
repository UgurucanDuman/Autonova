import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: 'lift' | 'scale' | 'glow' | 'border' | 'none';
  clickEffect?: boolean;
  onClick?: () => void;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = '',
  hoverEffect = 'lift',
  clickEffect = true,
  onClick
}) => {
  const getHoverAnimation = () => {
    switch (hoverEffect) {
      case 'lift':
        return { y: -8, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' };
      case 'scale':
        return { scale: 1.03, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' };
      case 'glow':
        return { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' };
      case 'border':
        return { borderColor: '#3b82f6' };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <motion.div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 ${className}`}
      whileHover={getHoverAnimation()}
      whileTap={clickEffect ? { scale: 0.98 } : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};