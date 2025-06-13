import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Car, MessageSquare, User, Plus, HelpCircle, LogOut, Building2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface MobileNavProps {
  unreadCount: number;
  onHelpClick: () => void;
  isHelpDialogOpen?: boolean;
  isCorporate?: boolean;
  isBlocked?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ 
  unreadCount, 
  onHelpClick,
  isHelpDialogOpen = false,
  isCorporate = false,
  isBlocked = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const pathname = location.pathname;

  const isActive = (path: string) => {
    if (path === '#help') return isHelpDialogOpen;
    if (path === '/') return pathname === path;
    return pathname.startsWith(path);
  };

  // Main navigation items
  const mainNavItems = [
    { path: '/listings', icon: Car, label: 'İlanlar' },
    { 
      path: '/create-listing', 
      icon: Plus, 
      label: 'İlan Ver',
      disabled: isBlocked,
      onClick: () => {
        if (isBlocked) {
          toast.error('Hesabınız engellenmiştir. İlan veremezsiniz.');
          return;
        }
        navigate('/create-listing');
      }
    },
    { 
      path: '/messages', 
      icon: MessageSquare, 
      label: 'Mesajlar',
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { path: '/profile', icon: User, label: 'Profil' }
  ];

  // Close more menu when navigating
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 z-50 md:hidden safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {mainNavItems.map(({ path, icon: Icon, label, badge, onClick, disabled }, index) => {
          const active = isActive(path);
          
          // If the item is disabled, create a button instead of a link
          if (disabled) {
            return (
              <button
                key={path}
                onClick={() => {
                  if (onClick) onClick();
                }}
                className={`relative flex flex-col items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {active && (
                  <motion.div
                    layoutId="bubble"
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20"
                    style={{ borderRadius: 8 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 ${
                      active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                  {badge !== undefined && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                    >
                      {badge}
                    </motion.span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          }
          
          const Component = onClick ? 'button' : Link;
          const props = onClick ? { onClick } : { to: path };

          return (
            <Component
              key={path}
              {...props}
              className="relative flex flex-col items-center justify-center"
            >
              {active && (
                <motion.div
                  layoutId="bubble"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20"
                  style={{ borderRadius: 8 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative">
                <Icon
                  className={`w-6 h-6 ${
                    active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                {badge !== undefined && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                  >
                    {badge}
                  </motion.span>
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </span>
            </Component>
          );
        })}
        
        {/* More Button with Help and Logout */}
        <div className="relative">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="w-full h-full flex flex-col items-center justify-center"
          >
            <div className="w-6 h-6 flex flex-col items-center justify-center space-y-1">
              <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></div>
              <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></div>
              <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></div>
            </div>
            <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">Daha Fazla</span>
          </button>
          
          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-48 overflow-hidden z-50"
              >
                <div className="py-1">
                  {isCorporate && (
                    <Link
                      to="/corporate"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowMore(false)}
                    >
                      <Building2 className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span>Kurumsal</span>
                    </Link>
                  )}
                  
                  <Link
                    to="/purchase"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => {
                      setShowMore(false);
                      navigate('/profile');
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span>İlan Hakkı Satın Al</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      onHelpClick();
                      setShowMore(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <HelpCircle className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <span>Yardım</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      signOut();
                      setShowMore(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Çıkış</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};