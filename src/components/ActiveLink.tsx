import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ActiveLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const ActiveLink: React.FC<ActiveLinkProps> = ({ href, children, className = '' }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(href);

  return (
    <Link
      to={href}
      className={`relative ${className}`}
    >
      {isActive && (
        <motion.div
          layoutId="activeLink"
          className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className={`relative z-10 ${
        isActive 
          ? 'text-blue-600 dark:text-blue-400 font-medium'
          : 'text-gray-700 dark:text-gray-200'
      }`}>
        {children}
      </div>
    </Link>
  );
};