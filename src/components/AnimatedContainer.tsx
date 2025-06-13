import React, { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';

interface AnimatedContainerProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  animation?: 'fadeIn' | 'slideUp' | 'scale' | 'slideInLeft' | 'slideInRight';
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
  animation = 'fadeIn'
}) => {
  const getVariants = (): Variants => {
    switch (animation) {
      case 'slideUp':
        return {
          hidden: { opacity: 0, y: 30 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
              duration, 
              delay,
              ease: [0.25, 0.1, 0.25, 1.0] // Smooth easing
            }
          }
        };
      case 'scale':
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: { 
            opacity: 1, 
            scale: 1,
            transition: { 
              duration, 
              delay,
              ease: [0.34, 1.56, 0.64, 1] // Spring-like effect
            }
          }
        };
      case 'slideInLeft':
        return {
          hidden: { opacity: 0, x: -50 },
          visible: { 
            opacity: 1, 
            x: 0,
            transition: { 
              duration, 
              delay,
              ease: [0.25, 0.1, 0.25, 1.0]
            }
          }
        };
      case 'slideInRight':
        return {
          hidden: { opacity: 0, x: 50 },
          visible: { 
            opacity: 1, 
            x: 0,
            transition: { 
              duration, 
              delay,
              ease: [0.25, 0.1, 0.25, 1.0]
            }
          }
        };
      case 'fadeIn':
      default:
        return {
          hidden: { opacity: 0 },
          visible: { 
            opacity: 1,
            transition: { 
              duration, 
              delay,
              ease: "easeInOut"
            }
          }
        };
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={getVariants()}
      className={className}
    >
      {children}
    </motion.div>
  );
};