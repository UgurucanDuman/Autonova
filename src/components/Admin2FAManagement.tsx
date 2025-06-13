import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, AlertTriangle, CheckCircle, X, 
  Search, User, Calendar, RefreshCw, Lock, Unlock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AdminVerificationCode {
  id: string;
  admin_id: string;
  code: string;
  attempts: number;
  expires_at: string;
  created_at: string;
  admin?: {
    username: string;
    email: string;
    full_name: string;
  };
}

export const Admin2FAManagement = () => {
  const [verificationCodes, setVerificationCodes] = useState<AdminVerificationCode[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showToggle2FAModal, setShowToggle2FAModal] = useState<string | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // Fetch verification codes and admins
  const fetchData = async () => {
    try {
      // Fetch verification codes
      const { data: codesData, error: codesError } = await supabase
        .from('admin_verification_codes')
        .select(`
          *,
          admin:admin_credentials!admin_verification_codes_admin_id_fkey (
            username,
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      
      // Fetch all admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('admin_credentials')
        .select('*')
        .order('username', { ascending: true });

      if (adminsError) throw adminsError;
      
      setVerificationCodes(codesData || []);
      setAdmins(adminsData || []);
    } catch (err) {
      console.error('Error fetching 2FA data:', err);
      setError('2FA verileri yüklenirken bir hata oluştu');
      toast.error('2FA verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('admin_verification_codes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_verification_codes'
      }, () => {
        fetchData();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter admins based on search term
  const filteredAdmins = admins.filter(admin => 
    admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle toggling 2FA requirement
  const handleToggle2FA = async (adminId: string, currentStatus: boolean) => {
    setProcessing(adminId);
    try {
      const { error } = await supabase
        .from('admin_credentials')
        .update({
          identity_verification_required: !currentStatus
        })
        .eq('id', adminId);

      if (error) throw error;

      toast.success(`2FA ${!currentStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
      setShowToggle2FAModal(null);
      setSelectedAdmin(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error toggling 2FA:', err);
      toast.error('2FA durumu değiştirilemedi');
      setError('2FA durumu değiştirilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle resending verification code
  const handleResendVerificationCode = async (adminId: string, email: string) => {
    setProcessing(adminId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            adminId,
            email
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success('Doğrulama kodu yeniden gönderildi');
    } catch (err: any) {
      console.error('Error resending verification code:', err);
      toast.error('Doğrulama kodu gönderilemedi');
      setError('Doğrulama kodu gönderilemedi');
    } finally {
      setProcessing(null);
    }
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
    <div className="space-y-6">
      {/* Active Verification Codes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Aktif Doğrulama Kodları
        </h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Yönetici</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kod</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Deneme</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Son Geçerlilik</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {verificationCodes.map((code) => (
                  <tr 
                    key={code.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {code.admin?.username || 'Bilinmeyen Yönetici'}
                          </span>
                          {code.admin?.email && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {code.admin.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                        {code.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {code.attempts} / 3
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {format(new Date(code.expires_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleResendVerificationCode(code.admin_id, code.admin?.email || '')}
                        disabled={processing === code.admin_id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Yeniden Gönder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {verificationCodes.length === 0 && (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aktif doğrulama kodu bulunmuyor.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admin 2FA Settings */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Yönetici 2FA Ayarları
        </h2>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kullanıcı adı veya e-posta ile ara..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Yönetici</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">E-posta</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Son Giriş</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">2FA Durumu</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAdmins.map((admin) => (
                  <tr 
                    key={admin.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{admin.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {admin.last_login 
                          ? format(new Date(admin.last_login), 'dd.MM.yyyy HH:mm', { locale: tr })
                          : 'Hiç giriş yapmadı'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {admin.identity_verification_required ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          <Shield className="w-3 h-3 mr-1" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          <Unlock className="w-3 h-3 mr-1" />
                          Devre Dışı
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setShowToggle2FAModal(admin.id);
                          setSelectedAdmin(admin);
                        }}
                        disabled={processing === admin.id}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg ${
                          admin.identity_verification_required
                            ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40'
                            : 'text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40'
                        } transition-colors`}
                      >
                        {admin.identity_verification_required ? (
                          <>
                            <Unlock className="w-4 h-4 mr-1" />
                            <span>Devre Dışı Bırak</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-1" />
                            <span>Etkinleştir</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAdmins.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aranan kriterlere uygun yönetici bulunamadı.' : 'Henüz yönetici yok.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle 2FA Modal */}
      {showToggle2FAModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedAdmin.identity_verification_required ? '2FA Devre Dışı Bırak' : '2FA Etkinleştir'}
              </h3>
              <button 
                onClick={() => {
                  setShowToggle2FAModal(null);
                  setSelectedAdmin(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{selectedAdmin.username}</span> kullanıcısı için iki faktörlü kimlik doğrulamayı {selectedAdmin.identity_verification_required ? 'devre dışı bırakmak' : 'etkinleştirmek'} istediğinizden emin misiniz?
              </p>
              
              <div className={`${
                selectedAdmin.identity_verification_required
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
              } p-4 rounded-lg`}>
                <div className="flex items-start space-x-3">
                  {selectedAdmin.identity_verification_required ? (
                    <Unlock className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${
                      selectedAdmin.identity_verification_required
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                      {selectedAdmin.identity_verification_required
                        ? '2FA devre dışı bırakıldığında, yönetici her girişte doğrulama kodu girmek zorunda kalmayacaktır.'
                        : '2FA etkinleştirildiğinde, yönetici her girişte e-posta ile gönderilen doğrulama kodunu girmek zorunda kalacaktır.'}
                    </p>
                    <p className={`text-xs ${
                      selectedAdmin.identity_verification_required
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    } mt-1`}>
                      {selectedAdmin.identity_verification_required
                        ? 'Bu, güvenlik seviyesini düşürecektir.'
                        : 'Bu, güvenlik seviyesini artıracaktır.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowToggle2FAModal(null);
                    setSelectedAdmin(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleToggle2FA(selectedAdmin.id, selectedAdmin.identity_verification_required)}
                  disabled={processing === selectedAdmin.id}
                  className={`px-4 py-2 ${
                    selectedAdmin.identity_verification_required
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2`}
                >
                  {processing === selectedAdmin.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      {selectedAdmin.identity_verification_required ? (
                        <Unlock className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                      <span>{selectedAdmin.identity_verification_required ? 'Devre Dışı Bırak' : 'Etkinleştir'}</span>
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