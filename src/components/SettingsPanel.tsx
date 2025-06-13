import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, Save, AlertTriangle, CheckCircle, X, 
  Instagram, Facebook, Twitter, Settings, User, Mail, Phone, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SocialMediaIntegration } from './SocialMediaIntegration';
import { SocialMediaSettings } from './SocialMediaSettings';
import { AdminIdentityVerification } from './AdminIdentityVerification';

export const SettingsPanel = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'password' | 'social' | 'profile' | 'security'>('password');
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        // Get admin ID from local storage
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) {
          throw new Error('No admin session found');
        }

        const { admin_id } = JSON.parse(adminSession);
        if (!admin_id) {
          throw new Error('No admin_id found in session');
        }

        setAdminId(admin_id);
        await fetchAdminData(admin_id);
      } catch (err) {
        console.error('Error initializing admin:', err);
        localStorage.removeItem('adminSession');
        window.location.href = '/admin/login';
      }
    };

    initializeAdmin();
  }, []);

  const fetchAdminData = async (adminId: string) => {
    try {
      setFetchError(null);
      const { data, error: supabaseError } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('id', adminId)
        .maybeSingle();

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        // Instead of throwing an error, set default admin data
        setAdminData({
          id: adminId,
          username: 'admin',
          email: 'admin@example.com',
          identity_verified: false,
          identity_verification_required: true
        });
        return;
      }

      setAdminData(data);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setFetchError(err.message);
      toast.error('Yönetici bilgileri yüklenemedi');
      
      // If admin not found or unauthorized, redirect to login
      if (err.status === 401) {
        localStorage.removeItem('adminSession');
        window.location.href = '/admin/login';
        return;
      }
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId) {
      setError('Yönetici oturumu bulunamadı');
      return;
    }
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error: authError } = await supabase
        .rpc('change_admin_password', {
          current_password: currentPassword,
          new_password: newPassword
        });

      if (authError) throw authError;

      if (!data?.success) {
        throw new Error(data?.error || 'Şifre değiştirilemedi');
      }

      setSuccess('Şifre başarıyla değiştirildi');
      toast.success('Şifre değiştirildi');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.message || 'Şifre değiştirilemedi');
      toast.error('Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityVerified = () => {
    setShowIdentityVerification(false);
    if (adminId) {
      fetchAdminData(adminId);
    }
    toast.success('Kimlik doğrulama başarılı');
  };

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Bağlantı Hatası
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
          Yönetici bilgileri yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Yenile
        </button>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'password'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Şifre Değiştir
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Profil Bilgileri
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Güvenlik
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'social'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Sosyal Medya Ayarları
        </button>
      </div>

      {activeTab === 'password' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            Şifre Değiştir
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mevcut Şifre
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Yeni Şifre
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={8}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={8}
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>İşleniyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Şifreyi Değiştir</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : activeTab === 'profile' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profil Bilgileri
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kullanıcı Adı
                </label>
                <div className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-gray-50">
                  {adminData.username}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-posta
                </label>
                <div className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-gray-50">
                  {adminData.email}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ad Soyad
                </label>
                <div className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-gray-50">
                  {adminData.full_name || 'Belirtilmemiş'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <div className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white bg-gray-50">
                  {adminData.phone || 'Belirtilmemiş'}
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowIdentityVerification(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <User className="w-5 h-5" />
                <span>Profil Bilgilerini Güncelle</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'security' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Güvenlik Ayarları
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">İki Faktörlü Kimlik Doğrulama</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Her girişte e-posta doğrulaması gerektirir</p>
                </div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-600">
                <input 
                  type="checkbox" 
                  id="toggle-2fa" 
                  className="sr-only" 
                  checked={true}
                  readOnly
                />
                <span className="absolute inset-y-1 left-1 bg-blue-600 w-4 h-4 rounded-full transform translate-x-6"></span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Kimlik Doğrulama</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {adminData?.identity_verified 
                      ? 'Kimliğiniz doğrulandı' 
                      : 'Kimliğinizi doğrulayın'}
                  </p>
                </div>
              </div>
              {adminData?.identity_verified ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Doğrulandı
                </span>
              ) : (
                <button
                  onClick={() => setShowIdentityVerification(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Doğrula
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">E-posta Doğrulama</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">E-posta adresinizi doğrulayın</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Doğrulandı
              </span>
            </div>
          </div>
        </div>
      ) : (
        <SocialMediaSettings isAdmin={true} />
      )}

      {/* Identity Verification Modal */}
      {showIdentityVerification && adminId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <AdminIdentityVerification 
            adminId={adminId}
            onVerified={handleIdentityVerified}
            onCancel={() => setShowIdentityVerification(false)}
          />
        </div>
      )}
    </div>
  );
};