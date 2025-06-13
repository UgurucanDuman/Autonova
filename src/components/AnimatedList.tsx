import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedListProps {
  children: ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeIn' | 'slideUp' | 'scale' | 'slideInLeft' | 'slideInRight';
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  staggerDelay = 0.1,
  animation = 'fadeIn',
  className = ''
}) => {
  const getVariants = () => {
    switch (animation) {
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 30 },
          visible: { opacity: 1, y: 0 }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: { opacity: 1, scale: 1 }
        };
      case 'slideInLeft':
        return {
          hidden: { opacity: 0, x: -50 },
          visible: { opacity: 1, x: 0 }
        };
      case 'slideInRight':
        return {
          hidden: { opacity: 0, x: 50 },
          visible: { opacity: 1, x: 0 }
        };
      case 'fadeIn':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 }
        };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={getVariants()}
          transition={{ 
            duration: 0.5,
            ease: animation === 'scale' 
              ? [0.34, 1.56, 0.64, 1] // Spring-like effect for scale
              : [0.25, 0.1, 0.25, 1.0] // Smooth easing for others
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};