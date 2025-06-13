import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, AlertCircle, Building2 } from 'lucide-react';
import { signUp, supabase } from '../lib/supabase';
import { PasswordInput } from '../components/PasswordInput';
import { validatePassword } from '../lib/validation';
import { CorporateRegistrationForm } from '../components/CorporateRegistrationForm';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [isCorporate, setIsCorporate] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [checkingEmail, setCheckingEmail] = useState(false);

  React.useEffect(() => {
    let timer: number;
    if (cooldown > 0) {
      timer = window.setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // Check if email already exists
  const checkEmailExists = async (emailToCheck: string) => {
    try {
      setCheckingEmail(true);
      
      // Use the RPC function to check email existence
      const { data, error } = await supabase.rpc('debug_email_check', {
        email_to_check: emailToCheck
      });
      
      if (error) {
        console.error('Error checking email with RPC:', error);
        // If RPC fails, assume email doesn't exist to allow registration attempt
        return false;
      }
      
      return data?.result || false;
    } catch (err) {
      console.error('Error checking email:', err);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        setError(
          <span>
            Bu e-posta adresi zaten kayıtlı. Hesabınıza{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              giriş yapın
            </button>
          </span>
        );
        setLoading(false);
        return;
      }

      // Validate password
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setError(validation.error || 'Geçersiz şifre');
        setLoading(false);
        return;
      }

      await signUp(email, password, fullName);
      setSuccess(true);
      setCooldown(16); // 16 second cooldown
    } catch (err: any) {
      if (err.message?.includes('over_email_send_rate_limit')) {
        setError('Lütfen 16 saniye bekleyip tekrar deneyin.');
        setCooldown(16);
      } else if (err.message?.includes('user_already_exists') || err.error?.message?.includes('User already registered')) {
        setError(
          <span>
            Bu e-posta adresi zaten kayıtlı. Hesabınıza{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              giriş yapın
            </button>
          </span>
        );
      } else {
        setError('Kayıt oluşturulamadı. Lütfen bilgilerinizi kontrol edin.');
        toast.error(err.message || 'Kayıt oluşturulamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCorporateSubmit = async (data: any) => {
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(data.email);
      if (emailExists) {
        setError(
          <span>
            Bu e-posta adresi zaten kayıtlı. Hesabınıza{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              giriş yapın
            </button>
          </span>
        );
        setLoading(false);
        return;
      }

      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      // Validate password strength
      const validation = validatePassword(data.password);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Geçersiz şifre');
      }

      // Use the updated signUp function directly
      await signUp(
        data.email,
        data.password,
        data.fullName,
        true, // isCorporate
        {
          companyName: data.companyName,
          taxNumber: data.taxNumber,
          phone: data.phone,
          registrationNumber: data.registrationNumber
        }
      );

      setSuccess(true);
      setCooldown(16);
    } catch (err: any) {
      if (err.message?.includes('over_email_send_rate_limit')) {
        setError('Lütfen 16 saniye bekleyip tekrar deneyin.');
        setCooldown(16);
      } else if (err.message?.includes('user_already_exists') || err.error?.message?.includes('User already registered')) {
        setError(
          <span>
            Bu e-posta adresi zaten kayıtlı. Hesabınıza{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              giriş yapın
            </button>
          </span>
        );
      } else {
        setError(err.message || 'Kayıt oluşturulamadı. Lütfen bilgilerinizi kontrol edin.');
        toast.error(err.message || 'Kayıt oluşturulamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle email input change with debounced validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear any existing errors when the user types
    if (error) {
      setError('');
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[80vh] flex items-center justify-center"
      >
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <div className="mb-6">
            <Mail className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {isCorporate ? 'Kurumsal Hesap Oluşturuldu' : 'E-posta Doğrulaması Gerekli'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isCorporate ? (
              <>
                Kurumsal hesabınız oluşturuldu. Hesabınızın onaylanması için gerekli belgeleri profil sayfanızdan yüklemeniz gerekmektedir. Belgeleriniz 7 iş günü içinde incelenecek ve sonuç size bildirilecektir.
              </>
            ) : (
              <>
                Hesabınızı aktifleştirmek için lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.
                Spam klasörünü kontrol etmeyi unutmayın.
              </>
            )}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Giriş Sayfasına Dön
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[80vh] py-12"
    >
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Hesap Oluştur</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Hemen ücretsiz kayıt olun
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <button
              type="button"
              onClick={() => setIsCorporate(false)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                !isCorporate 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Bireysel</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCorporate(true)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                isCorporate 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Kurumsal</span>
            </button>
          </div>
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

        {isCorporate ? (
          <CorporateRegistrationForm
            onSubmit={handleCorporateSubmit}
            loading={loading}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <form onSubmit={handleIndividualSubmit} className="space-y-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Adınız Soyadınız"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Şifre
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  showStrengthMeter
                />
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0 || checkingEmail}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Kayıt yapılıyor...</span>
                  </>
                ) : checkingEmail ? (
                  <span>E-posta kontrol ediliyor...</span>
                ) : cooldown > 0 ? (
                  <span>{cooldown} saniye bekleyin...</span>
                ) : (
                  <span>Kayıt Ol</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Zaten hesabınız var mı?{' '}
                
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Giriş Yap
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Register;