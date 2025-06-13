import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Ban, CheckCircle, Search, AlertTriangle, 
  X, User, Mail, Calendar, Clock, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface BlockedUser {
  id: string;
  email: string;
  full_name: string;
  is_blocked: boolean;
  block_reason?: string;
  block_end_date?: string;
  blocked_at: string;
  blocked_by: string;
  profile_image_url?: string;
  is_corporate: boolean;
  company_name?: string;
}

export const BlockedUsersList = () => {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
      }
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('blocked_users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'is_blocked=eq.true'
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch blocked users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_blocked', true);
        
      if (countError) throw countError;
      setTotalUsers(count || 0);
      
      // Then get paginated data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_blocked', true)
        .order('blocked_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setError('Engellenen kullanıcılar yüklenirken bir hata oluştu');
      toast.error('Engellenen kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.block_reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format block end date
  const formatBlockEndDate = (date: string | undefined) => {
    if (!date) return 'Süresiz';
    
    const endDate = new Date(date);
    const now = new Date();
    
    if (endDate <= now) {
      return 'Engel süresi doldu';
    }
    
    const diffTime = Math.abs(endDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} gün kaldı`;
  };

  // Calculate remaining block time
  const getRemainingBlockTime = (user: BlockedUser) => {
    if (!user.block_end_date) return 'Süresiz';
    
    const endDate = new Date(user.block_end_date);
    const now = new Date();
    
    if (endDate <= now) {
      return 'Engel süresi doldu';
    }
    
    const diffTime = Math.abs(endDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} gün kaldı`;
  };

  // Handle user unblocking
  const handleUnblockUser = async (userId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Use the RPC function to avoid recursion
      const { error } = await supabase.rpc('unblock_user', {
        p_user_id: userId,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      toast.success('Kullanıcı engeli kaldırıldı');
      await fetchUsers();
    } catch (err) {
      console.error('Error unblocking user:', err);
      toast.error('Kullanıcı engeli kaldırılamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle pagination
  const totalPages = Math.ceil(totalUsers / pageSize);
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (loading && users.length === 0) {
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
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Ad, e-posta veya engelleme sebebi ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">E-posta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Engelleme Sebebi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Engelleme Tarihi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kalan Süre</th>
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
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full overflow-hidden w-10 h-10 flex items-center justify-center">
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={user.full_name || 'User'} 
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.full_name || 'İsimsiz Kullanıcı'}
                        </span>
                        {user.is_corporate && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Kurumsal: {user.company_name || 'Belirtilmemiş'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {user.block_reason || 'Belirtilmemiş'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {user.blocked_at ? format(new Date(user.blocked_at), 'dd.MM.yyyy', { locale: tr }) : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatBlockEndDate(user.block_end_date)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDetailModal(user.id);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Info className="w-4 h-4 mr-1" />
                      Detay
                    </button>
                    
                    <button
                      onClick={() => handleUnblockUser(user.id)}
                      disabled={processing === user.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Engeli Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Ban className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun engellenen kullanıcı bulunamadı.' : 'Henüz engellenen kullanıcı yok.'}
            </p>
          </div>
        )}
        
        {/* Pagination */}
        {!searchTerm && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam {totalUsers} engellenen kullanıcı, {page} / {totalPages} sayfa
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="px-3 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Ban className="w-6 h-6 mr-2 text-red-500" />
                Engellenen Kullanıcı Detayı
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(null);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full overflow-hidden w-16 h-16 flex items-center justify-center">
                    {selectedUser.profile_image_url ? (
                      <img 
                        src={selectedUser.profile_image_url} 
                        alt={selectedUser.full_name || 'User'} 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedUser.full_name || 'İsimsiz Kullanıcı'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {selectedUser.email}
                    </p>
                    {selectedUser.is_corporate && (
                      <p className="text-blue-600 dark:text-blue-400 text-sm">
                        Kurumsal Hesap: {selectedUser.company_name || 'Belirtilmemiş'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Engelleme Tarihi</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.blocked_at 
                        ? format(new Date(selectedUser.blocked_at), 'dd MMMM yyyy HH:mm', { locale: tr })
                        : 'Belirtilmemiş'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Engel Bitiş Tarihi</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedUser.block_end_date 
                        ? format(new Date(selectedUser.block_end_date), 'dd MMMM yyyy HH:mm', { locale: tr })
                        : 'Süresiz'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Block Reason */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Engelleme Sebebi</h4>
                <p className="text-red-700 dark:text-red-200">
                  {selectedUser.block_reason || 'Belirtilmemiş'}
                </p>
              </div>
              
              {/* Block Status */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Engel Durumu</h4>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {getRemainingBlockTime(selectedUser)}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDetailModal(null);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
                
                <button
                  onClick={() => {
                    handleUnblockUser(selectedUser.id);
                    setShowDetailModal(null);
                    setSelectedUser(null);
                  }}
                  disabled={processing === selectedUser.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === selectedUser.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Engeli Kaldır</span>
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

