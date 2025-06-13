import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, CheckCircle, XCircle, AlertTriangle, 
  Search, User, Calendar, FileText, Eye, 
  Check, X, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CorporateUser {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  tax_number: string;
  registration_number: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_requested_at: string;
  approval_deadline?: string;
  approval_date?: string;
  rejection_reason?: string;
  created_at: string;
  documents?: Document[];
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const CorporateUserApproval = () => {
  const [users, setUsers] = useState<CorporateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showUserModal, setShowUserModal] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<CorporateUser | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

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
      .channel('corporate_users_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: 'is_corporate=eq.true'
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
      
      // Use the admin_view_all_users function to bypass RLS
      const { data, error } = await supabase.rpc('admin_view_all_users');
      
      if (error) {
        console.error('Error using admin_view_all_users:', error);
        
        // Fallback to regular query
        const { data: regularData, error: regularError } = await supabase
          .from('users')
          .select('*')
          .eq('is_corporate', true)
          .order('created_at', { ascending: false });
          
        if (regularError) throw regularError;
        
        // Filter by status if needed
        const filteredData = statusFilter === 'all' 
          ? regularData 
          : regularData?.filter(user => user.approval_status === statusFilter);
        
        setUsers(filteredData || []);
      } else {
        // Filter corporate users from the result
        const corporateUsers = data?.filter(user => user.is_corporate) || [];
        
        // Filter by status if needed
        const filteredUsers = statusFilter === 'all' 
          ? corporateUsers 
          : corporateUsers.filter(user => user.approval_status === statusFilter);
        
        setUsers(filteredUsers);
      }
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
  }, [statusFilter]);

  // Fetch user documents
  const fetchUserDocuments = async (userId: string) => {
    setLoadingDocuments(true);
    try {
      // Use the admin_get_corporate_documents function
      const { data, error } = await supabase.rpc('admin_get_corporate_documents', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Error using admin_get_corporate_documents:', error);
        
        // Fallback to regular query
        const { data: regularData, error: regularError } = await supabase
          .from('corporate_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (regularError) throw regularError;
        
        return regularData;
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Belgeler yüklenemedi');
      return [];
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

  // Handle user approval
  const handleApproveUser = async (userId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(userId);
    try {
      // Use the admin_approve_corporate_user function
      const { data, error } = await supabase.rpc('admin_approve_corporate_user', {
        p_user_id: userId,
        p_admin_id: adminId
      });

      if (error) throw error;

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
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    setProcessing(userId);
    try {
      // Use the admin_reject_corporate_user function
      const { data, error } = await supabase.rpc('admin_reject_corporate_user', {
        p_user_id: userId,
        p_admin_id: adminId,
        p_reason: rejectionReason
      });

      if (error) throw error;

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

  // Handle viewing user details
  const handleViewUser = async (user: CorporateUser) => {
    try {
      // Fetch user documents
      const documents = await fetchUserDocuments(user.id);
      
      // Update user with documents
      const userWithDocuments = {
        ...user,
        documents
      };
      
      setSelectedUser(userWithDocuments);
      setShowUserModal(user.id);
    } catch (err) {
      console.error('Error fetching user details:', err);
      toast.error('Kullanıcı detayları yüklenemedi');
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

  if (loading) {
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
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Firma adı, vergi no veya e-posta ile ara..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filtreler</span>
              {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Onay Durumu
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Beklemede</option>
                    <option value="approved">Onaylandı</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Başvuru Tarihi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Son Tarih</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.company_name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {user.tax_number || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={user.full_name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {user.approval_requested_at 
                          ? format(new Date(user.approval_requested_at), 'dd.MM.yyyy', { locale: tr })
                          : format(new Date(user.created_at), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {user.approval_deadline 
                        ? format(new Date(user.approval_deadline), 'dd.MM.yyyy', { locale: tr })
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.approval_status === 'approved' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylandı
                      </span>
                    ) : user.approval_status === 'rejected' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Reddedildi
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Beklemede
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detay
                    </button>
                    
                    {user.approval_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          disabled={processing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Onayla
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowRejectModal(user.id);
                            setSelectedUser(user);
                          }}
                          disabled={processing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Aranan kriterlere uygun kurumsal kullanıcı bulunamadı.'
                : 'Henüz kurumsal kullanıcı yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedUser && (
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
                onClick={() => {
                  setShowRejectModal(null);
                  setSelectedUser(null);
                  setRejectionReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Red Sebebi
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Kurumsal kullanıcıyı neden reddettiğinizi açıklayın..."
                  required
                />
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Bu kurumsal kullanıcıyı reddetmek üzeresiniz. Red sebebi kullanıcıya bildirilecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setSelectedUser(null);
                    setRejectionReason('');
                  }}
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

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Building2 className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                Kurumsal Kullanıcı Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowUserModal(null);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Firma Bilgileri
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Firma Adı:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.company_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Vergi Numarası:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.tax_number || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sicil Numarası:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.registration_number || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Kayıt Tarihi:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {format(new Date(selectedUser.created_at), 'dd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Yetkili Bilgileri
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Ad Soyad:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.full_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">E-posta:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Telefon:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{selectedUser.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Onay Durumu
              </h4>
              <div className={`p-4 rounded-lg ${
                selectedUser.approval_status === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : selectedUser.approval_status === 'rejected'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <div className="flex items-start space-x-3">
                  {selectedUser.approval_status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : selectedUser.approval_status === 'rejected' ? (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      selectedUser.approval_status === 'approved'
                        ? 'text-green-800 dark:text-green-300'
                        : selectedUser.approval_status === 'rejected'
                          ? 'text-red-800 dark:text-red-300'
                          : 'text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {selectedUser.approval_status === 'approved'
                        ? 'Onaylandı'
                        : selectedUser.approval_status === 'rejected'
                          ? 'Reddedildi'
                          : 'Beklemede'}
                    </p>
                    {selectedUser.approval_status === 'approved' && selectedUser.approval_date && (
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        Onay Tarihi: {format(new Date(selectedUser.approval_date), 'dd MMMM yyyy', { locale: tr })}
                      </p>
                    )}
                    {selectedUser.approval_status === 'rejected' && selectedUser.rejection_reason && (
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        Red Sebebi: {selectedUser.rejection_reason}
                      </p>
                    )}
                    {selectedUser.approval_status === 'pending' && selectedUser.approval_deadline && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Son Tarih: {format(new Date(selectedUser.approval_deadline), 'dd MMMM yyyy', { locale: tr })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Belgeler
              </h4>
              
              {loadingDocuments ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedUser.documents && selectedUser.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {getDocumentTypeName(doc.document_type)}
                        </h5>
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
                          {format(new Date(doc.created_at), 'dd.MM.yyyy', { locale: tr })}
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
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Bu kullanıcı henüz belge yüklememiş.
                  </p>
                </div>
              )}
            </div>
            
            {selectedUser.approval_status === 'pending' && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUserModal(null);
                    setShowRejectModal(selectedUser.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reddet</span>
                </button>
                
                <button
                  onClick={() => {
                    handleApproveUser(selectedUser.id);
                    setShowUserModal(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Onayla</span>
                </button>
              </div>
            )}
            
            {selectedUser.approval_status !== 'pending' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUserModal(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CorporateUserApproval;