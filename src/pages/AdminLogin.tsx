import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle, Mail, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // 2FA states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [adminId, setAdminId] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState(''); // For development only

  // Check if already logged in
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        const now = new Date().getTime();
        const sessionAge = now - session.timestamp;
        // Session expires after 24 hours
        const isValid = session.isAdmin && sessionAge < 24 * 60 * 60 * 1000;
        
        if (isValid) {
          navigate('/admin/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
        localStorage.removeItem('adminSession');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate input
      if (!username.trim()) {
        throw new Error('Kullanıcı adı gereklidir');
      }
      if (!password.trim()) {
        throw new Error('Şifre gereklidir');
      }

      // Call the authenticate_admin function
      const { data, error: authError } = await supabase
        .rpc('authenticate_admin', {
          input_username: username.trim(),
          input_password: password
        });

      if (authError) {
        // Handle specific authentication errors
        const errorMessage = authError.message.toLowerCase();
        if (errorMessage.includes('invalid_credentials')) {
          throw new Error('Kullanıcı adı veya şifre hatalı');
        } else if (errorMessage.includes('account_locked')) {
          throw new Error('Hesabınız güvenlik nedeniyle kilitlendi. Lütfen yönetici ile iletişime geçin.');
        } else if (errorMessage.includes('too_many_attempts')) {
          throw new Error('Çok fazla başarısız giriş denemesi. Lütfen 30 dakika sonra tekrar deneyin.');
        } else if (errorMessage.includes('account_disabled')) {
          throw new Error('Hesabınız devre dışı bırakıldı. Lütfen yönetici ile iletişime geçin.');
        } else if (errorMessage.includes('password_expired')) {
          throw new Error('Şifrenizin süresi doldu. Lütfen şifrenizi sıfırlayın.');
        } else {
          console.error('Authentication error:', authError);
          throw new Error('Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
      }

      if (!data) {
        throw new Error('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }

      if (!data.success) {
        if (data.error === 'invalid_credentials') {
          throw new Error('Kullanıcı adı veya şifre hatalı');
        } else if (data.error === 'account_not_found') {
          throw new Error('Bu kullanıcı adına sahip bir hesap bulunamadı');
        } else {
          throw new Error(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
      }

      // If 2FA is enabled, show verification screen
      if (data.verification_needed) {
        setVerificationEmail(data.email);
        setAdminId(data.admin_id);
        setShowVerification(true);
        // Send verification code
        await sendVerificationCode(data.admin_id, data.email);
      } else {
        // Store admin session
        localStorage.setItem('adminSession', JSON.stringify({
          id: data.admin_id,
          username: data.username,
          isAdmin: true,
          timestamp: new Date().getTime(),
          admin_id: data.admin_id
        }));

        toast.success('Giriş başarılı');
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      toast.error(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async (adminId: string, email: string) => {
    setSendingCode(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ adminId, email })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Doğrulama kodu gönderilemedi');
      }

      // In development, we get the code directly from the response
      if (data.code) {
        setDevCode(data.code);
      }

      setCodeSent(true);
      toast.success('Doğrulama kodu e-posta adresinize gönderildi');
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Doğrulama kodu gönderilemedi');
      toast.error(err.message || 'Doğrulama kodu gönderilemedi');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingCode(true);
    setError('');

    try {
      // Verify code using database function with correct parameter names
      const { data, error } = await supabase.rpc('verify_admin_code', {
        input_admin_id: adminId,
        verification_code: verificationCode
      });

      if (error) {
        if (error.message.includes('invalid_code')) {
          throw new Error('Geçersiz doğrulama kodu');
        } else if (error.message.includes('code_expired')) {
          throw new Error('Doğrulama kodu süresi doldu. Lütfen yeni kod isteyin.');
        } else if (error.message.includes('too_many_attempts')) {
          throw new Error('Çok fazla başarısız deneme. Lütfen yeni kod isteyin.');
        } else {
          throw error;
        }
      }

      if (!data) {
        throw new Error('Geçersiz doğrulama kodu');
      }

      // Store admin session
      localStorage.setItem('adminSession', JSON.stringify({
        id: adminId,
        username,
        isAdmin: true,
        timestamp: new Date().getTime(),
        admin_id: adminId
      }));

      toast.success('Giriş başarılı');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Doğrulama başarısız');
      toast.error(err.message || 'Doğrulama başarısız');
    } finally {
      setVerifyingCode(false);
    }
  };

  // For development: Skip verification and login directly
  const handleDevLogin = async () => {
    if (!adminId) return;
    
    try {
      // Store admin session
      localStorage.setItem('adminSession', JSON.stringify({
        id: adminId,
        username,
        isAdmin: true,
        timestamp: new Date().getTime(),
        admin_id: adminId
      }));

      toast.success('Giriş başarılı (Geliştirme Modu)');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('Dev login error:', err);
      toast.error('Giriş başarısız');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[80vh] flex items-center justify-center"
    >
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Girişi</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Yönetici paneline erişmek için giriş yapın
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center space-x-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {!showVerification ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Kullanıcı adınız"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Giriş yapılıyor...</span>
                  </>
                ) : (
                  <span>Giriş Yap</span>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {codeSent ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-200">
                          Doğrulama kodu <strong>{verificationEmail}</strong> adresine gönderildi. 
                          Lütfen e-posta kutunuzu kontrol edin.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Development code display - REMOVE IN PRODUCTION */}
                  {devCode && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-yellow-700 dark:text-yellow-200">
                            <strong>Geliştirme Modu:</strong> Doğrulama Kodu: <span className="font-mono">{devCode}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div>
                      <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Doğrulama Kodu
                      </label>
                      <input
                        type="text"
                        id="verificationCode"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123456"
                        required
                        maxLength={6}
                      />
                    </div>

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => sendVerificationCode(adminId, verificationEmail)}
                        disabled={sendingCode}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        {sendingCode ? 'Gönderiliyor...' : 'Kodu Tekrar Gönder'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowVerification(false)}
                        className="text-gray-600 dark:text-gray-400 hover:underline text-sm"
                      >
                        Geri Dön
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={verifyingCode || verificationCode.length !== 6}
                      className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {verifyingCode ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Doğrulanıyor...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-5 h-5" />
                          <span>Doğrula ve Giriş Yap</span>
                        </>
                      )}
                    </button>
                    
                    {/* Development direct login button */}
                    <button
                      type="button"
                      onClick={handleDevLogin}
                      className="w-full bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2 mt-2"
                    >
                      <span>Doğrulamayı Atla (Geliştirme Modu)</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <Mail className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto" />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Doğrulama Kodu Gönderiliyor
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Lütfen bekleyin, doğrulama kodu e-posta adresinize gönderiliyor...
                  </p>
                  <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AdminLogin;