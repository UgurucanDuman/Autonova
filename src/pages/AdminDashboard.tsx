import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Settings, Car, MessageSquare, BarChart, 
  Menu, X, Sun, Moon, ChevronDown,
  Building2, Share2, UserPlus, LogOut, CreditCard,
  Mail, Phone, Shield, MessageCircle, Flag, Ban, FileText
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { UsersList } from '../components/UsersList';
import { CorporateUsersList } from '../components/CorporateUsersList';
import { ListingsList } from '../components/ListingsList';
import { MessagesList } from '../components/MessagesList';
import { SettingsPanel } from '../components/SettingsPanel';
import { AdminDashboardStats } from '../components/AdminDashboardStats';
import { SocialShareRequests } from '../components/SocialShareRequests';
import { AdminUsersList } from '../components/AdminUsersList';
import { AdminListingManagement } from '../components/AdminListingManagement';
import { AdminEmailVerification } from '../components/AdminEmailVerification';
import { AdminPhoneVerification } from '../components/AdminPhoneVerification';
import { Admin2FAManagement } from '../components/Admin2FAManagement';
import { AdminReviewManagement } from '../components/AdminReviewManagement';
import { AdminReportManagement } from '../components/AdminReportManagement';
import { AdminLiveChat } from '../components/AdminLiveChat';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SidebarNav } from '../components/SidebarNav';
import { BrandModelDistribution } from '../components/BrandModelDistribution';
import { BlockedUsersList } from '../components/BlockedUsersList';
import CorporateDocumentReview from '../components/CorporateDocumentReview';
import CorporateUserApproval from '../components/CorporateUserApproval';
import { AdminDamageReports } from '../components/AdminDamageReports';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'corporate' | 'listings' | 'messages' | 'settings' | 'social' | 'admins' | 'listing_management' | 'email_verification' | 'phone_verification' | '2fa_management' | 'reviews' | 'reports' | 'livechat' | 'brand_model' | 'blocked_users' | 'corporate_documents' | 'corporate_approval' | 'damage_reports'>('analytics');
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [pendingPurchaseCount, setPendingPurchaseCount] = useState(0);
  const [pendingEmailVerifications, setPendingEmailVerifications] = useState(0);
  const [pendingPhoneVerifications, setPendingPhoneVerifications] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [pendingChats, setPendingChats] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUsersCount, setBlockedUsersCount] = useState(0);
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [pendingCorporateApprovals, setPendingCorporateApprovals] = useState(0);
  const [pendingDamageReports, setPendingDamageReports] = useState(0);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        setIsLoading(true);
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) {
          // If no admin session exists, redirect to login
          window.location.href = '/admin/login';
          return;
        }

        const { admin_id } = JSON.parse(adminSession);
        
        if (!admin_id) {
          // If no admin_id in session, redirect to login
          window.location.href = '/admin/login';
          return;
        }

        const { data, error } = await supabase
          .from('admin_credentials')
          .select('*')
          .eq('id', admin_id)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching admin info:', error);
          toast.error('Yönetici bilgileri alınamadı');
          return;
        }

        if (!data) {
          // If admin not found, clear session and redirect
          localStorage.removeItem('adminSession');
          window.location.href = '/admin/login';
          return;
        }

        setAdminInfo(data);
        
        // Set pending chats count (mock data for demo)
        setPendingChats(2);
      } catch (err) {
        console.error('Error fetching admin info:', err);
        toast.error('Yönetici bilgileri alınamadı');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAdminInfo();
  }, []);

  // Fetch pending purchase requests count
  useEffect(() => {
    const fetchPendingPurchases = async () => {
      try {
        const { count, error } = await supabase
          .from('listing_purchase_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (error) throw error;
        setPendingPurchaseCount(count || 0);
      } catch (err) {
        console.error('Error fetching pending purchases:', err);
      }
    };
    
    fetchPendingPurchases();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('listing_purchase_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_purchase_requests'
      }, () => {
        fetchPendingPurchases();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending email verifications count
  useEffect(() => {
    const fetchPendingEmailVerifications = async () => {
      try {
        const { count, error } = await supabase
          .from('email_verifications')
          .select('*', { count: 'exact', head: true });
          
        if (error) throw error;
        setPendingEmailVerifications(count || 0);
      } catch (err) {
        console.error('Error fetching pending email verifications:', err);
      }
    };
    
    fetchPendingEmailVerifications();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('email_verifications_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_verifications'
      }, () => {
        fetchPendingEmailVerifications();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending phone verifications count
  useEffect(() => {
    const fetchPendingPhoneVerifications = async () => {
      try {
        const { count, error } = await supabase
          .from('verification_codes')
          .select('*', { count: 'exact', head: true });
          
        if (error) throw error;
        setPendingPhoneVerifications(count || 0);
      } catch (err) {
        console.error('Error fetching pending phone verifications:', err);
      }
    };
    
    fetchPendingPhoneVerifications();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('verification_codes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'verification_codes'
      }, () => {
        fetchPendingPhoneVerifications();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending reviews count
  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const { count, error } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false);
          
        if (error) throw error;
        setPendingReviews(count || 0);
      } catch (err) {
        console.error('Error fetching pending reviews:', err);
      }
    };
    
    fetchPendingReviews();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('reviews_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews'
      }, () => {
        fetchPendingReviews();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending reports count
  useEffect(() => {
    const fetchPendingReports = async () => {
      try {
        // Get listing reports count
        const { count: listingReportsCount, error: listingError } = await supabase
          .from('listing_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        // Get message reports count
        const { count: messageReportsCount, error: messageError } = await supabase
          .from('message_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (listingError) throw listingError;
        if (messageError) throw messageError;
        
        setPendingReports((listingReportsCount || 0) + (messageReportsCount || 0));
      } catch (err) {
        console.error('Error fetching pending reports:', err);
      }
    };
    
    fetchPendingReports();
    
    // Subscribe to changes
    const listingReportsSubscription = supabase
      .channel('listing_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_reports'
      }, () => {
        fetchPendingReports();
      })
      .subscribe();
      
    const messageReportsSubscription = supabase
      .channel('message_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reports'
      }, () => {
        fetchPendingReports();
      })
      .subscribe();
      
    return () => {
      listingReportsSubscription.unsubscribe();
      messageReportsSubscription.unsubscribe();
    };
  }, []);

  // Fetch blocked users count
  useEffect(() => {
    const fetchBlockedUsersCount = async () => {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_blocked', true);
          
        if (error) throw error;
        setBlockedUsersCount(count || 0);
      } catch (err) {
        console.error('Error fetching blocked users count:', err);
      }
    };
    
    fetchBlockedUsersCount();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'is_blocked=eq.true'
      }, () => {
        fetchBlockedUsersCount();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending documents count
  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        const { count, error } = await supabase
          .from('corporate_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (error) throw error;
        setPendingDocuments(count || 0);
      } catch (err) {
        console.error('Error fetching pending documents:', err);
      }
    };
    
    fetchPendingDocuments();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('corporate_documents_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'corporate_documents'
      }, () => {
        fetchPendingDocuments();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending corporate approvals count
  useEffect(() => {
    const fetchPendingCorporateApprovals = async () => {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_corporate', true)
          .eq('approval_status', 'pending');
          
        if (error) throw error;
        setPendingCorporateApprovals(count || 0);
      } catch (err) {
        console.error('Error fetching pending corporate approvals:', err);
      }
    };
    
    fetchPendingCorporateApprovals();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('users_corporate_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'is_corporate=eq.true'
      }, () => {
        fetchPendingCorporateApprovals();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch pending damage reports count
  useEffect(() => {
    const fetchPendingDamageReports = async () => {
      try {
        const { count, error } = await supabase
          .from('damage_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
          
        if (error) throw error;
        setPendingDamageReports(count || 0);
      } catch (err) {
        console.error('Error fetching pending damage reports:', err);
      }
    };
    
    fetchPendingDamageReports();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('damage_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'damage_reports'
      }, () => {
        fetchPendingDamageReports();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    toast.success('Çıkış yapıldı');
    window.location.href = '/admin/login';
  };

  const tabs = [
    { id: 'analytics', label: 'İstatistikler', icon: BarChart },
    { id: 'users', label: 'Bireysel Kullanıcılar', icon: Users },
    { id: 'corporate', label: 'Kurumsal Kullanıcılar', icon: Building2 },
    { id: 'corporate_approval', label: 'Kurumsal Onayları', icon: Building2, badge: pendingCorporateApprovals > 0 ? pendingCorporateApprovals : undefined },
    { id: 'corporate_documents', label: 'Kurumsal Belgeler', icon: FileText, badge: pendingDocuments > 0 ? pendingDocuments : undefined },
    { id: 'blocked_users', label: 'Engellenen Kullanıcılar', icon: Ban, badge: blockedUsersCount > 0 ? blockedUsersCount : undefined },
    { id: 'listings', label: 'İlanlar', icon: Car },
    { id: 'brand_model', label: 'Marka/Model Dağılımı', icon: Car },
    { id: 'damage_reports', label: 'Hasar Raporları', icon: Car, badge: pendingDamageReports > 0 ? pendingDamageReports : undefined },
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { id: 'social', label: 'Sosyal Medya Paylaşımları', icon: Share2 },
    { id: 'reviews', label: 'Müşteri Yorumları', icon: MessageCircle, badge: pendingReviews > 0 ? pendingReviews : undefined },
    { id: 'reports', label: 'Raporlar', icon: Flag, badge: pendingReports > 0 ? pendingReports : undefined },
    { id: 'livechat', label: 'Canlı Destek', icon: MessageSquare, badge: pendingChats > 0 ? pendingChats : undefined },
    { id: 'admins', label: 'Yöneticiler', icon: UserPlus },
    { 
      id: 'listing_management', 
      label: 'İlan Limiti Yönetimi', 
      icon: CreditCard,
      badge: pendingPurchaseCount > 0 ? pendingPurchaseCount : undefined
    },
    { 
      id: 'email_verification', 
      label: 'E-posta Doğrulama', 
      icon: Mail,
      badge: pendingEmailVerifications > 0 ? pendingEmailVerifications : undefined
    },
    { 
      id: 'phone_verification', 
      label: 'Telefon Doğrulama', 
      icon: Phone,
      badge: pendingPhoneVerifications > 0 ? pendingPhoneVerifications : undefined
    },
    { 
      id: '2fa_management', 
      label: '2FA Yönetimi', 
      icon: Shield
    },
    { id: 'settings', label: 'Ayarlar', icon: Settings }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button 
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-gray-200"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Sidebar - Mobile */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.1 }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileSidebarOpen(false)}></div>
              <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Logo */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      <span className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</span>
                    </div>
                    <button onClick={() => setMobileSidebarOpen(false)} className="text-gray-500">
                      <X size={20} />
                    </button>
                  </div>
                  
                  {/* Admin Info */}
                  {adminInfo && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{adminInfo.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{adminInfo.email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation */}
                  <SidebarNav 
                    isOpen={true} 
                    onToggle={() => {}} 
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                      setActiveTab(tab as any);
                      setMobileSidebarOpen(false);
                    }}
                  />
                  
                  {/* Additional options */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={toggleTheme}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      <span>{theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}</span>
                    </button>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar - Desktop */}
        <div className={`fixed inset-y-0 left-0 transition-all duration-300 hidden lg:block ${sidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className="h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center space-x-2 mb-8">
              <Car className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              {sidebarOpen && <span className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</span>}
            </div>

            {/* Admin Info */}
            {sidebarOpen && adminInfo && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{adminInfo.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{adminInfo.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Navigation - Scrollable */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 pr-1">
              <SidebarNav 
                isOpen={sidebarOpen} 
                onToggle={() => setSidebarOpen(!sidebarOpen)} 
                activeTab={activeTab}
                setActiveTab={(tab) => setActiveTab(tab as any)}
              />
            </div>

            {/* Bottom Controls */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className={`flex ${sidebarOpen ? 'justify-between' : 'justify-center'} items-center py-2`}>
                <button 
                  onClick={toggleTheme} 
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  title={theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                {sidebarOpen && (
                  <button 
                    onClick={() => setSidebarOpen(false)} 
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    title="Kenar Çubuğunu Daralt"
                  >
                    <ChevronDown className="w-5 h-5 -rotate-90" />
                  </button>
                )}
                
                {!sidebarOpen && (
                  <button 
                    onClick={() => setSidebarOpen(true)} 
                    className="p-2 mt-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    title="Kenar Çubuğunu Genişlet"
                  >
                    <ChevronDown className="w-5 h-5 rotate-90" />
                  </button>
                )}
              </div>
              
              {/* Logout button */}
              <button 
                onClick={handleLogout}
                className={`mt-2 w-full flex items-center ${sidebarOpen ? 'justify-start space-x-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
                title="Çıkış Yap"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Çıkış Yap</span>}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <div className="min-h-screen p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {tabs.find(tab => tab.id === activeTab)?.label}
                {activeTab === 'listing_management' && pendingPurchaseCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingPurchaseCount} bekleyen talep
                  </span>
                )}
                {activeTab === 'email_verification' && pendingEmailVerifications > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingEmailVerifications} bekleyen doğrulama
                  </span>
                )}
                {activeTab === 'phone_verification' && pendingPhoneVerifications > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingPhoneVerifications} bekleyen doğrulama
                  </span>
                )}
                {activeTab === 'reviews' && pendingReviews > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingReviews} bekleyen yorum
                  </span>
                )}
                {activeTab === 'reports' && pendingReports > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingReports} bekleyen rapor
                  </span>
                )}
                {activeTab === 'livechat' && pendingChats > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingChats} bekleyen sohbet
                  </span>
                )}
                {activeTab === 'blocked_users' && blockedUsersCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {blockedUsersCount} engelli kullanıcı
                  </span>
                )}
                {activeTab === 'corporate_documents' && pendingDocuments > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingDocuments} bekleyen belge
                  </span>
                )}
                {activeTab === 'corporate_approval' && pendingCorporateApprovals > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingCorporateApprovals} bekleyen onay
                  </span>
                )}
                {activeTab === 'damage_reports' && pendingDamageReports > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {pendingDamageReports} bekleyen hasar raporu
                  </span>
                )}
              </h2>
            </div>

            
            <div className="space-y-6">
              {activeTab === 'analytics' && <AdminDashboardStats />}
              {activeTab === 'users' && <UsersList />}
              {activeTab === 'corporate' && <CorporateUsersList />}
              {activeTab === 'blocked_users' && <BlockedUsersList />}
              {activeTab === 'listings' && <ListingsList />}
              {activeTab === 'brand_model' && <BrandModelDistribution />}
              {activeTab === 'damage_reports' && <AdminDamageReports />}
              {activeTab === 'messages' && <MessagesList />}
              {activeTab === 'social' && <SocialShareRequests />}
              {activeTab === 'reviews' && <AdminReviewManagement />}
              {activeTab === 'reports' && <AdminReportManagement />}
              {activeTab === 'livechat' && <AdminLiveChat />}
              {activeTab === 'admins' && <AdminUsersList />}
              {activeTab === 'listing_management' && <AdminListingManagement />}
              {activeTab === 'email_verification' && <AdminEmailVerification />}
              {activeTab === 'phone_verification' && <AdminPhoneVerification />}
              {activeTab === '2fa_management' && <Admin2FAManagement />}
              {activeTab === 'settings' && <SettingsPanel />}
              {activeTab === 'corporate_documents' && <CorporateDocumentReview />}
              {activeTab === 'corporate_approval' && <CorporateUserApproval />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;