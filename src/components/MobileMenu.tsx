import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface MobileMenuProps {
  links: {
    href: string;
    label: string;
    icon: React.ReactNode;
  }[];
  onClose: () => void;
  isOpen: boolean;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ links, onClose, isOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white dark:bg-gray-800 z-50 shadow-xl overflow-y-auto safe-top safe-bottom"
          >
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              {links.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={link.href}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                      location.pathname === link.href
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={onClose}
                  >
                    {link.icon}
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </motion.div>
              ))}
              
              {!user && (
                <div className="pt-4 mt-4 border-t dark:border-gray-700 grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium"
                    onClick={onClose}
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-center rounded-lg bg-blue-600 text-white font-medium"
                    onClick={onClose}
                  >
                    Kayıt Ol
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};