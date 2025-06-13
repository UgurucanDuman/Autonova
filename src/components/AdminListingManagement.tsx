import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, AlertTriangle, CheckCircle, 
  X, User, Mail, Calendar, Plus, Minus, CreditCard,
  Clock, DollarSign, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface UserListingLimits {
  id: string;
  email: string;
  full_name: string;
  listing_limit: number;
  paid_listing_limit: number;
  current_listings: number;
  created_at: string;
}

interface PurchaseRequest {
  id: string;
  user_id: string;
  amount: number;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

export const AdminListingManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListingLimits[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddLimitModal, setShowAddLimitModal] = useState<string | null>(null);
  const [showRemoveLimitModal, setShowRemoveLimitModal] = useState<string | null>(null);
  const [limitAmount, setLimitAmount] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserListingLimits | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        } else {
          toast.error('Admin oturumu geçersiz');
          navigate('/admin/login');
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
        toast.error('Admin oturumu geçersiz');
        navigate('/admin/login');
      }
    } else {
      toast.error('Admin oturumu bulunamadı');
      navigate('/admin/login');
    }
  }, [navigate]);

  // Fetch users with listing limits
  const fetchUsers = async () => {
    try {
      // First get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, listing_limit, paid_listing_limit, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      
      // For each user, get their current listing count
      const usersWithListings = await Promise.all(
        (usersData || []).map(async (user) => {
          const { count, error: countError } = await supabase
            .from('car_listings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
            
          if (countError) throw countError;
          
          return {
            ...user,
            current_listings: count || 0
          };
        })
      );
      
      setUsers(usersWithListings);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Kullanıcılar yüklenirken bir hata oluştu');
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Fetch purchase requests
  const fetchPurchaseRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('listing_purchase_requests')
        .select(`
          *,
          user:users (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPurchaseRequests(data || []);
    } catch (err) {
      console.error('Error fetching purchase requests:', err);
      toast.error('Satın alma talepleri yüklenemedi');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (adminId) {
      fetchUsers();
      fetchPurchaseRequests();
    }
  }, [adminId]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    const usersSubscription = supabase
      .channel('users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        fetchUsers();
      })
      .subscribe();
      
    const requestsSubscription = supabase
      .channel('purchase_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_purchase_requests'
      }, () => {
        fetchPurchaseRequests();
      })
      .subscribe();
      
    return () => {
      usersSubscription.unsubscribe();
      requestsSubscription.unsubscribe();
    };
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter purchase requests based on search term
  const filteredRequests = purchaseRequests.filter(request => 
    request.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle adding listing limit
  const handleAddLimit = async () => {
    // Validate admin session
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      navigate('/admin/login');
      return;
    }

    // Validate user selection
    if (!showAddLimitModal) {
      toast.error('Kullanıcı seçilmedi');
      return;
    }

    // Validate limit amount
    if (!Number.isInteger(limitAmount) || limitAmount <= 0) {
      toast.error('Geçersiz ilan hakkı sayısı');
      return;
    }
    
    setProcessing(showAddLimitModal);
    try {
      // Create a payment ID for tracking
      const paymentId = `admin_${adminId}_${Date.now()}`;
      
      // Call the purchase_listing_slot function
      const { data, error } = await supabase.rpc('purchase_listing_slot', {
        p_user_id: showAddLimitModal,
        p_amount: limitAmount,
        p_payment_id: paymentId
      });

      if (error) {
        throw new Error(error.message || 'İlan limiti eklenirken bir hata oluştu');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'İlan limiti eklenemedi');
      }

      toast.success(`${limitAmount} adet ilan hakkı başarıyla eklendi`);
      setShowAddLimitModal(null);
      setLimitAmount(1);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error adding listing limit:', err);
      toast.error(err.message || 'İlan limiti eklenemedi');
      setError(err.message || 'İlan limiti eklenemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle removing listing limit
  const handleRemoveLimit = async () => {
    // Validate admin session
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      navigate('/admin/login');
      return;
    }

    // Validate user selection and data
    if (!showRemoveLimitModal || !selectedUser) {
      toast.error('Kullanıcı seçilmedi');
      return;
    }

    // Validate limit amount
    if (!Number.isInteger(limitAmount) || limitAmount <= 0) {
      toast.error('Geçersiz ilan hakkı sayısı');
      return;
    }
    
    // Make sure we don't remove more than available
    const maxRemovable = selectedUser.paid_listing_limit;
    if (limitAmount > maxRemovable) {
      toast.error(`En fazla ${maxRemovable} adet ilan hakkı kaldırabilirsiniz`);
      return;
    }
    
    setProcessing(showRemoveLimitModal);
    try {
      // Update user's paid listing limit
      const { error } = await supabase
        .from('users')
        .update({ 
          paid_listing_limit: Math.max(0, selectedUser.paid_listing_limit - limitAmount)
        })
        .eq('id', showRemoveLimitModal);

      if (error) {
        throw new Error(error.message || 'İlan limiti kaldırılırken bir hata oluştu');
      }

      toast.success(`${limitAmount} adet ilan hakkı başarıyla kaldırıldı`);
      setShowRemoveLimitModal(null);
      setLimitAmount(1);
      setSelectedUser(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error removing listing limit:', err);
      toast.error(err.message || 'İlan limiti kaldırılamadı');
      setError(err.message || 'İlan limiti kaldırılamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle approving purchase request
  const handleApproveRequest = async (requestId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      navigate('/admin/login');
      return;
    }
    
    setProcessing(requestId);
    try {
      const { data, error } = await supabase.rpc('approve_purchase_request_admin', {
        p_request_id: requestId,
        p_admin_id: adminId,
        p_admin_notes: 'Admin tarafından onaylandı'
      });

      if (error) {
        throw new Error(error.message || 'Satın alma talebi onaylanırken bir hata oluştu');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Satın alma talebi onaylanamadı');
      }

      toast.success('Satın alma talebi onaylandı');
      await fetchPurchaseRequests();
      await fetchUsers();
    } catch (err: any) {
      console.error('Error approving purchase request:', err);
      toast.error(err.message || 'Satın alma talebi onaylanamadı');
      setError(err.message || 'Satın alma talebi onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejecting purchase request
  const handleRejectRequest = async () => {
    if (!adminId || !showRejectModal) {
      toast.error('Admin oturumu bulunamadı veya talep seçilmedi');
      return;
    }
    
    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }
    
    setProcessing(showRejectModal);
    try {
      const { data, error } = await supabase.rpc('reject_purchase_request_admin', {
        p_request_id: showRejectModal,
        p_admin_id: adminId,
        p_admin_notes: rejectionReason
      });

      if (error) {
        throw new Error(error.message || 'Satın alma talebi reddedilirken bir hata oluştu');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Satın alma talebi reddedilemedi');
      }

      toast.success('Satın alma talebi reddedildi');
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchPurchaseRequests();
    } catch (err: any) {
      console.error('Error rejecting purchase request:', err);
      toast.error(err.message || 'Satın alma talebi reddedilemedi');
      setError(err.message || 'Satın alma talebi reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  if (loading && loadingRequests) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <span>Satın Alma Talepleri</span>
          {purchaseRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
              {purchaseRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Header with Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={activeTab === 'users' 
            ? "Kullanıcı adı veya e-posta ile ara..." 
            : "Kullanıcı adı veya e-posta ile ara..."}
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {activeTab === 'users' ? (
        /* Users Table */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">E-posta</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Temel Limit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Ek Limit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Mevcut İlanlar</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.full_name || 'İsimsiz Kullanıcı'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {format(new Date(user.created_at), 'dd.MM.yyyy', { locale: tr })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {user.listing_limit || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {user.paid_listing_limit || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {user.current_listings} / {(user.listing_limit || 1) + (user.paid_listing_limit || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setShowAddLimitModal(user.id);
                          setLimitAmount(1);
                        }}
                        disabled={processing === user.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Limit Ekle
                      </button>
                      
                      {user.paid_listing_limit > 0 && (
                        <button
                          onClick={() => {
                            setShowRemoveLimitModal(user.id);
                            setLimitAmount(1);
                            setSelectedUser(user);
                          }}
                          disabled={processing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Limit Kaldır
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aranan kriterlere uygun kullanıcı bulunamadı.' : 'Henüz kullanıcı yok.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Purchase Requests Table */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Miktar</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Fiyat</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRequests.map((request) => (
                  <tr 
                    key={request.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {request.user?.full_name || 'İsimsiz Kullanıcı'}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {request.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{request.amount} adet</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{request.price} TL</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Beklemede
                        </span>
                      ) : request.status === 'approved' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Onaylandı
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          <X className="w-3 h-3 mr-1" />
                          Reddedildi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={processing === request.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Onayla
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowRejectModal(request.id);
                              setRejectionReason('');
                            }}
                            disabled={processing === request.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reddet
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aranan kriterlere uygun satın alma talebi bulunamadı.' : 'Henüz satın alma talebi yok.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Limit Modal */}
      {showAddLimitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlan Limiti Ekle
              </h3>
              <button 
                onClick={() => setShowAddLimitModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Kullanıcıya eklemek istediğiniz ilan hakkı sayısını seçin:
              </p>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setLimitAmount(Math.max(1, limitAmount - 1))}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Minus className="w-5 h-5" />
                </button>
                
                <input
                  type="number"
                  value={limitAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      setLimitAmount(value);
                    }
                  }}
                  className="w-20 text-center px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
                
                <button
                  onClick={() => setLimitAmount(limitAmount + 1)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">Fiyat:</span> {limitAmount * 10} TL
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Bu işlem kullanıcıya {limitAmount} adet ek ilan hakkı ekleyecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddLimitModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddLimit}
                  disabled={processing === showAddLimitModal || !Number.isInteger(limitAmount) || limitAmount <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showAddLimitModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Limit Ekle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Remove Limit Modal */}
      {showRemoveLimitModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlan Limiti Kaldır
              </h3>
              <button 
                onClick={() => {
                  setShowRemoveLimitModal(null);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{selectedUser.full_name || selectedUser.email}</span> kullanıcısından kaldırmak istediğiniz ilan hakkı sayısını seçin:
              </p>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setLimitAmount(Math.max(1, limitAmount - 1))}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Minus className="w-5 h-5" />
                </button>
                
                <input
                  type="number"
                  value={limitAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= selectedUser.paid_listing_limit) {
                      setLimitAmount(value);
                    }
                  }}
                  className="w-20 text-center px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max={selectedUser.paid_listing_limit}
                />
                
                <button
                  onClick={() => setLimitAmount(Math.min(selectedUser.paid_listing_limit, limitAmount + 1))}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Bu kullanıcının mevcut ek ilan hakkı: <span className="font-medium">{selectedUser.paid_listing_limit}</span>
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Bu işlem kullanıcının ek ilan hakkını {limitAmount} adet azaltacaktır.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRemoveLimitModal(null);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleRemoveLimit}
                  disabled={
                    processing === showRemoveLimitModal || 
                    !Number.isInteger(limitAmount) || 
                    limitAmount <= 0 || 
                    limitAmount > selectedUser.paid_listing_limit
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showRemoveLimitModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-4 h-4" />
                      <span>Limit Kaldır</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Request Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Satın Alma Talebini Reddet
              </h3>
              <button 
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Satın alma talebini reddetme sebebini belirtin:
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Reddetme sebebi..."
                required
              />
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={processing === showRejectModal || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showRejectModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Reddet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};