import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Car, MessageSquare, User, Plus, HelpCircle, LogOut, Sun, Moon, Building2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileNav } from './MobileNav';
import { HelpDialog } from './HelpDialog';
import { supabase, checkSupabaseConnection } from '../lib/supabase';
import { ActiveLink } from './ActiveLink';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [pendingNotifications, setPendingNotifications] = useState({
    pendingListings: 0,
    pendingPurchases: 0,
    pendingReports: 0,
    pendingCorporate: 0
  });
  const [connectionError, setConnectionError] = useState(false);

  // Check if user is blocked
  const isUserBlocked = userProfile?.is_blocked;
  const blockEndDate = userProfile?.block_end_date ? new Date(userProfile.block_end_date) : null;
  const now = new Date();
  const isBlockActive = isUserBlocked && (!blockEndDate || blockEndDate > now);

  React.useEffect(() => {
    let subscription: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const setupSubscription = async () => {
      try {
        // First check connection with retry mechanism
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          throw new Error('Could not connect to Supabase');
        }
        
        setConnectionError(false);
        
        if (user) {
          // Get user profile
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!error && data) {
            setUserProfile(data);
          }
          
          // Get initial unread count
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('receiver_id', user.id)
            .eq('read', false);
          
          if (!countError) {
            setUnreadCount(count || 0);
          }

          // Subscribe to new messages
          subscription = supabase
            .channel('messages')
            .on('postgres_changes', {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${user.id}`,
            }, () => {
              if (!location.pathname.startsWith('/messages')) {
                setUnreadCount(prev => prev + 1);
              }
            })
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `receiver_id=eq.${user.id}`,
            }, (payload) => {
              if (payload.new.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            })
            .subscribe();
        }
      } catch (error) {
        console.error('Error setting up subscription:', error);
        
        // Implement retry mechanism
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying connection (attempt ${retryCount} of ${maxRetries})...`);
          setTimeout(setupSubscription, retryDelay * retryCount);
        } else {
          setConnectionError(true);
          toast.error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        }
      }
    };

    // Fetch pending notifications for admin
    const fetchPendingNotifications = async () => {
      try {
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) return;
        
        // Pending listings
        const { count: pendingListingsCount } = await supabase
          .from('car_listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        // Pending purchase requests
        const { count: pendingPurchasesCount } = await supabase
          .from('listing_purchase_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        // Pending reports
        const { count: pendingReportsCount } = await supabase
          .from('listing_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        // Pending corporate approvals
        const { count: pendingCorporateCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_corporate', true)
          .eq('approval_status', 'pending');
        
        setPendingNotifications({
          pendingListings: pendingListingsCount || 0,
          pendingPurchases: pendingPurchasesCount || 0,
          pendingReports: pendingReportsCount || 0,
          pendingCorporate: pendingCorporateCount || 0
        });
      } catch (err) {
        console.error('Error fetching pending notifications:', err);
      }
    };

    setupSubscription();
    fetchPendingNotifications();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, location.pathname]);

  // Clear notifications when messages page is opened
  React.useEffect(() => {
    const markMessagesAsRead = async () => {
      if (location.pathname.startsWith('/messages') && user && unreadCount > 0) {
        setUnreadCount(0);
        
        try {
          // Mark all messages as read
          const { error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('receiver_id', user.id)
            .eq('read', false);

          if (error) {
            console.error('Error marking messages as read:', error);
          }
        } catch (error) {
          console.error('Error updating messages:', error);
        }
      }
    };

    markMessagesAsRead();
  }, [location.pathname, user, unreadCount]);

  const handleCreateListing = () => {
    if (isBlockActive) {
      // Show a message that the user is blocked
      toast.error('Hesabınız engellenmiştir. İlan veremezsiniz.');
      return;
    }
    
    if (!user) {
      navigate('/login', { 
        state: { 
          message: 'İlan vermek için lütfen giriş yapın.',
          returnTo: '/create-listing'
        }
      });
      return;
    }
    navigate('/create-listing');
  };

  const navLinks = [
    { href: '/listings', label: 'İlanlar', icon: <Car className="w-5 h-5" /> },
    { 
      href: '/create-listing', 
      label: 'İlan Ver', 
      icon: <Plus className="w-5 h-5" />,
      disabled: isBlockActive
    },
    { 
      href: '/messages', 
      label: 'Mesajlar', 
      icon: <MessageSquare className="w-5 h-5" />,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { href: '/profile', label: 'Profil', icon: <User className="w-5 h-5" /> },
  ];

  if (userProfile?.is_corporate) {
    navLinks.push({ href: '/corporate', label: 'Kurumsal', icon: <Building2 className="w-5 h-5" /> });
  }

  if (connectionError) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 text-center z-50">
        <p>Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-1 bg-white text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Yenile
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg shadow-lg transition-all duration-200 z-50 w-full border-b border-gray-200 dark:border-gray-700 safe-top"
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link 
              to="/" 
              className="flex items-center space-x-2 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shadow-lg"
              >
                <Car className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200 bg-clip-text text-transparent">
                Autinoa
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </motion.button>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                {user ? (
                  <>
                    <motion.div className="flex items-center space-x-1">
                      {navLinks.map((link) => {
                        if (link.disabled) {
                          return (
                            <button
                              key={link.href}
                              onClick={() => toast.error('Hesabınız engellenmiştir. İlan veremezsiniz.')}
                              className="px-4 py-2 rounded-lg opacity-50 cursor-not-allowed"
                            >
                              <div className="flex items-center space-x-2 text-gray-400">
                                {link.icon}
                                <span>{link.label}</span>
                              </div>
                            </button>
                          );
                        }
                        
                        return (
                          <ActiveLink 
                            key={link.href} 
                            href={link.href}
                            className="px-4 py-2 rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              {link.icon}
                              <span>{link.label}</span>
                              {link.href === '/messages' && unreadCount > 0 && (
                                <motion.span 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg"
                                >
                                  {unreadCount}
                                </motion.span>
                              )}
                            </div>
                          </ActiveLink>
                        );
                      })}

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowHelpDialog(true)}
                        className="px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Yardım</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => signOut()}
                        className="px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 flex items-center space-x-2"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Çıkış</span>
                      </motion.button>
                    </motion.div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/login')}
                      className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                    >
                      Giriş Yap
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/register')}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Kayıt Ol
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                {user ? (
                  <div className="relative">
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadCount}
                      </span>
                    )}
                    <Link to="/profile" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <User className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </Link>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 shadow-lg"
                  >
                    Giriş
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      {user && (
        <MobileNav 
          unreadCount={unreadCount} 
          onHelpClick={() => setShowHelpDialog(true)} 
          isHelpDialogOpen={showHelpDialog}
          isCorporate={userProfile?.is_corporate}
          isBlocked={isBlockActive}
        />
      )}

      {/* Help Dialog */}
      <HelpDialog 
        isOpen={showHelpDialog} 
        onClose={() => setShowHelpDialog(false)} 
      />

      {/* Content Padding for Fixed Navigation */}
      <div className="h-16" /> {/* Top navbar spacing */}
      {user && <div className="h-16 md:h-0" />} {/* Bottom navbar spacing on mobile */}
    </>
  );
};

export default Navbar;