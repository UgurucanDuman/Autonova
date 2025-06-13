import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Ban, Trash2, Search, AlertTriangle, CheckCircle, 
  X, FileText, Eye, Building2, CheckCheck, XCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface CorporateUser {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  tax_number: string;
  registration_number: string;
  is_blocked: boolean;
  block_reason?: string;
  block_end_date?: string;
  created_at: string;
  approval_status: string;
  approval_date?: string;
  rejection_reason?: string;
  profile_image_url?: string;
}

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

export const CorporateUsersList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<CorporateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBlockModal, setShowBlockModal] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
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

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('corporate_changes')
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

  // Fetch corporate users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_corporate', true);
        
      if (countError) throw countError;
      setTotalUsers(count || 0);
      
      // Then get paginated data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_corporate', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching corporate users:', err);
      setError('Kurumsal kullanıcılar yüklenirken bir hata oluştu');
      toast.error('Kurumsal kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize]);

  // Fetch user documents
  const fetchDocuments = async (userId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('corporate_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
      setShowDocumentsModal(userId);
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Belgeler yüklenemedi');
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tax_number?.toLowerCase().includes(searchTerm.toLowerCase())
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
      // Use the RPC function to avoid recursion
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
      // Use the RPC function to avoid recursion
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
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        throw new Error(errorData.error || 'Kullanıcı silinemedi');
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

  // Handle user approval
  const handleApproveUser = async (userId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Update user directly since the RPC might not be working locally
      const { error } = await supabase
        .from('users')
        .update({ 
          approval_status: 'approved',
          approval_date: new Date().toISOString(),
          approved_by: adminId
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Add to approval history
      const { error: historyError } = await supabase
        .from('corporate_approval_history')
        .insert({
          user_id: userId,
          admin_id: adminId,
          status: 'approved'
        });
        
      if (historyError) {
        console.error('Error adding approval history:', historyError);
        // Continue even if history insertion fails
      }

      // Send approval email using the Supabase URL directly
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              userId: userId,
              status: 'approved'
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error sending approval email:', errorText);
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }

      toast.success('Kurumsal kullanıcı onaylandı');
      await fetchUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Kullanıcı onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle user rejection
  const handleRejectUser = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Update user directly since the RPC might not be working locally
      const { error } = await supabase
        .from('users')
        .update({ 
          approval_status: 'rejected',
          approval_date: new Date().toISOString(),
          approved_by: adminId,
          rejection_reason: rejectionReason
        })
        .eq('id', userId);

      if (error) throw error;
      
      // Add to approval history
      const { error: historyError } = await supabase
        .from('corporate_approval_history')
        .insert({
          user_id: userId,
          admin_id: adminId,
          status: 'rejected',
          reason: rejectionReason
        });
        
      if (historyError) {
        console.error('Error adding rejection history:', historyError);
        // Continue even if history insertion fails
      }

      // Send rejection email using the Supabase URL directly
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              userId: userId,
              status: 'rejected',
              reason: rejectionReason
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error sending rejection email:', errorText);
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
      }

      toast.success('Kurumsal kullanıcı reddedildi');
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast.error('Kullanıcı reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Get document type display name
  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'trade_registry': 'Ticaret Sicil Belgesi',
      'tax_certificate': 'Vergi Levhası',
      'signature_circular': 'İmza Sirküleri',
      'company_contract': 'Şirket Sözleşmesi',
      'id_card': 'Kimlik Belgesi',
      'other': 'Diğer Belge'
    };
    return types[type] || type;
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
          placeholder="Firma adı, vergi no veya e-posta ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Firma Adı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Vergi No</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Yetkili</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Engel Süresi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Onay Durumu</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {user.company_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {user.tax_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      {user.profile_image_url ? (
                        <img 
                          src={user.profile_image_url} 
                          alt={user.full_name} 
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      <span>{user.full_name}</span>
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
                  <td className="px-4 py-3">
                    {user.approval_status === 'approved' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Onaylandı
                      </span>
                    ) : user.approval_status === 'rejected' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        Reddedildi
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        Beklemede
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => fetchDocuments(user.id)}
                      disabled={processing === user.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Belgeler
                    </button>
                    
                    {user.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          disabled={processing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                        >
                          <CheckCheck className="w-4 h-4 mr-1" />
                          Onayla
                        </button>
                        
                        <button
                          onClick={() => setShowRejectModal(user.id)}
                          disabled={processing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reddet
                        </button>
                      </>
                    )}
                    
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
              {searchTerm ? 'Aranan kriterlere uygun kurumsal kullanıcı bulunamadı.' : 'Henüz kurumsal kullanıcı yok.'}
            </p>
          </div>
        )}
        
        {/* Pagination */}
        {!searchTerm && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam {totalUsers} kurumsal kullanıcı, {page} / {totalPages} sayfa
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
                Kurumsal Kullanıcıyı Engelle
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

      {/* Reject User Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kurumsal Kullanıcıyı Reddet
              </h3>
              <button 
                onClick={() => setShowRejectModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reddetme Sebebi
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Kullanıcıyı neden reddetmek istediğinizi açıklayın..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRejectModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleRejectUser(showRejectModal)}
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
                      <XCircle className="w-4 h-4" />
                      <span>Reddet</span>
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
                Kurumsal Kullanıcıyı Sil
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
                Bu kurumsal kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kullanıcının tüm verileri silinecektir.
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

      {/* Documents Modal */}
      {showDocumentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kurumsal Belgeler
              </h3>
              <button 
                onClick={() => setShowDocumentsModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {loadingDocuments ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Bu kullanıcı henüz belge yüklememiş.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {getDocumentTypeName(doc.document_type)}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : doc.status === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {doc.status === 'approved' ? 'Onaylandı' : doc.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {doc.file_name}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Görüntüle
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDocumentsModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};