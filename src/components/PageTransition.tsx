import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'scale' | 'slideInLeft' | 'slideInRight';
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children,
  animation = 'fadeIn'
}) => {
  const getVariants = () => {
    switch (animation) {
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.05 }
        };
      case 'slideInLeft':
        return {
          initial: { opacity: 0, x: -50 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 50 }
        };
      case 'slideInRight':
        return {
          initial: { opacity: 0, x: 50 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -50 }
        };
      case 'fadeIn':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  const variants = getVariants();

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ 
        duration: 0.4,
        ease: animation === 'scale' 
          ? [0.34, 1.56, 0.64, 1] // Spring-like effect for scale
          : [0.25, 0.1, 0.25, 1.0] // Smooth easing for others
      }}
    >
      {children}
    </motion.div>
  );
};