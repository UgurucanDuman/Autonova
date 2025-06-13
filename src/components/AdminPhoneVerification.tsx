import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, AlertTriangle, CheckCircle, X, 
  Search, User, Calendar, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PhoneVerification {
  id: string;
  user_id: string;
  phone: string;
  code: string;
  attempts: number;
  expires_at: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export const AdminPhoneVerification = () => {
  const [verifications, setVerifications] = useState<PhoneVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showResendModal, setShowResendModal] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Fetch phone verifications
  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_codes')
        .select(`
          *,
          user:users!verification_codes_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setVerifications(data || []);
    } catch (err) {
      console.error('Error fetching phone verifications:', err);
      setError('Telefon doğrulamaları yüklenirken bir hata oluştu');
      toast.error('Telefon doğrulamaları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('verification_codes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'verification_codes'
      }, () => {
        fetchVerifications();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter verifications based on search term
  const filteredVerifications = verifications.filter(verification => 
    verification.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    verification.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    verification.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle resending verification code
  const handleResendVerification = async (userId: string, phone: string) => {
    setProcessing(userId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            userId,
            phone,
            action: 'send'
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      toast.success('Doğrulama kodu yeniden gönderildi');
      setShowResendModal(null);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error resending verification code:', err);
      toast.error('Doğrulama kodu gönderilemedi');
      setError('Doğrulama kodu gönderilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle manual verification
  const handleManualVerification = async (userId: string, phone: string) => {
    setProcessing(userId);
    try {
      // Update users table to mark phone as verified
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: phone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Delete verification record
      const { error: deleteError } = await supabase
        .from('verification_codes')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      toast.success('Telefon numarası manuel olarak doğrulandı');
      await fetchVerifications();
    } catch (err: any) {
      console.error('Error manually verifying phone:', err);
      toast.error('Telefon numarası doğrulanamadı');
      setError('Telefon numarası doğrulanamadı');
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
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Telefon, e-posta veya kullanıcı adı ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Verifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Telefon</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kod</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Deneme</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Son Geçerlilik</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredVerifications.map((verification) => (
                <tr 
                  key={verification.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {verification.user?.full_name || 'İsimsiz Kullanıcı'}
                        </span>
                        {verification.user?.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {verification.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{verification.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                      {verification.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {verification.attempts} / 3
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(verification.expires_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setShowResendModal(verification.user_id);
                        setSelectedUser({
                          id: verification.user_id,
                          phone: verification.phone,
                          full_name: verification.user?.full_name
                        });
                      }}
                      disabled={processing === verification.user_id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Yeniden Gönder
                    </button>
                    
                    <button
                      onClick={() => handleManualVerification(verification.user_id, verification.phone)}
                      disabled={processing === verification.user_id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Doğrula
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVerifications.length === 0 && (
          <div className="text-center py-12">
            <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun doğrulama bulunamadı.' : 'Bekleyen telefon doğrulaması yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Resend Verification Modal */}
      {showResendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Doğrulama Kodunu Yeniden Gönder
              </h3>
              <button 
                onClick={() => {
                  setShowResendModal(null);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-medium">{selectedUser.full_name || selectedUser.phone}</span> kullanıcısına doğrulama kodunu yeniden göndermek istediğinizden emin misiniz?
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Telefon: <span className="font-medium">{selectedUser.phone}</span>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Kullanıcı bu telefon numarasına yeni bir doğrulama kodu alacaktır.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowResendModal(null);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleResendVerification(selectedUser.id, selectedUser.phone)}
                  disabled={processing === selectedUser.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === selectedUser.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Yeniden Gönder</span>
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