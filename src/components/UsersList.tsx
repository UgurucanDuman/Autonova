import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Ban, Trash2, Search, AlertTriangle, CheckCircle, 
  X, User, Mail, Calendar, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_blocked: boolean;
  block_reason?: string;
  block_end_date?: string;
  role: string;
  profile_image_url?: string;
}

export function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBlockModal, setShowBlockModal] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adminId, setAdminId] = useState<string | null>(null);

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

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_corporate', false);
        
      if (countError) throw countError;
      setTotalUsers(count || 0);
      
      // Then get paginated data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_corporate', false)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Kullanıcılar yüklenirken bir hata oluştu');
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle user blocking
  const handleBlockUser = async (userId: string) => {
    if (!blockReason.trim()) {
      toast.error('Lütfen engelleme sebebi girin');
      return;
    }

    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Use a direct SQL query to avoid the RLS policy recursion
      const { data, error } = await supabase.rpc('block_user', {
        p_user_id: userId,
        p_admin_id: adminId,
        p_reason: blockReason
      });

      if (error) throw error;
      
      // Add to block history
      const { error: historyError } = await supabase
        .from('user_blocks')
        .insert({
          user_id: userId,
          admin_id: adminId,
          reason: blockReason
        });
        
      if (historyError) {
        console.error('Error adding block history:', historyError);
        // Continue even if history insertion fails
      }

      toast.success('Kullanıcı engellendi (3 hafta süreyle)');
      setShowBlockModal(null);
      setBlockReason('');
      await fetchUsers();
    } catch (err) {
      console.error('Error blocking user:', err);
      toast.error('Kullanıcı engellenemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle user unblocking
  const handleUnblockUser = async (userId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Use a direct SQL query to avoid the RLS policy recursion
      const { data, error } = await supabase.rpc('unblock_user', {
        p_user_id: userId,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      // Add to block history
      const { error: historyError } = await supabase
        .from('user_blocks')
        .insert({
          user_id: userId,
          admin_id: adminId,
          reason: 'Engel kaldırıldı'
        });
        
      if (historyError) {
        console.error('Error adding unblock history:', historyError);
        // Continue even if history insertion fails
      }

      toast.success('Kullanıcı engeli kaldırıldı');
      await fetchUsers();
    } catch (err) {
      console.error('Error unblocking user:', err);
      toast.error('Kullanıcı engeli kaldırılamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    setAccountDeleting(true);
    try {
      // Call the delete_user_data function
      const { data, error } = await supabase.rpc('delete_user_data', {
        p_user_id: userId
      });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('User deletion failed');
      }
      
      // Delete the auth user
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete_user`;
      
      // Get service role key from admin session if available
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          `Edge Function failed with status: ${response.status}`
        );
      }

      toast.success('Kullanıcı silindi');
      setShowDeleteConfirm(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error(err.message || 'Kullanıcı silinemedi');
    } finally {
      setProcessing(null);
      setAccountDeleting(false);
    }
  };

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
          placeholder="Ad, e-posta veya rol ile ara..."
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kayıt Tarihi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Engel Süresi</th>
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
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || user.email}
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
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_blocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        Engelli
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_blocked && (
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatBlockEndDate(user.block_end_date)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {user.is_blocked ? (
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        disabled={processing === user.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Engeli Kaldır
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockModal(user.id)}
                        disabled={processing === user.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Engelle
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowDeleteConfirm(user.id)}
                      disabled={processing === user.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Sil
                    </button>
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
        
        {/* Pagination */}
        {!searchTerm && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam {totalUsers} kullanıcı, {page} / {totalPages} sayfa
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

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kullanıcıyı Engelle
              </h3>
              <button 
                onClick={() => setShowBlockModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Engelleme Sebebi
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Kullanıcıyı neden engellemek istediğinizi açıklayın..."
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Not:</strong> Kullanıcı 3 hafta süreyle engellenecektir. Bu süre içinde ilan veremez ve mesaj gönderemez.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowBlockModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleBlockUser(showBlockModal)}
                  disabled={processing === showBlockModal || !blockReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showBlockModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Engelle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kullanıcıyı Sil
              </h3>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  disabled={processing === showDeleteConfirm || accountDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showDeleteConfirm || accountDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
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
}