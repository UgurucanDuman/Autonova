import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Mail, Phone, X, AlertCircle, CheckCircle } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'email' | 'phone';
  currentValue?: string;
  onVerified: (value: string) => void;
}

export const VerificationDialog: React.FC<VerificationDialogProps> = ({
  isOpen,
  onClose,
  type,
  currentValue,
  onVerified
}) => {
  const [value, setValue] = useState(currentValue?.trim() || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Improved email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

  const validateEmail = (email: string): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;
    if (!emailRegex.test(trimmedEmail)) return false;
    if (trimmedEmail.length > 254) return false;
    
    // Additional validation for common issues
    if (trimmedEmail.includes('..')) return false;
    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) return false;
    
    const [localPart, domain] = trimmedEmail.split('@');
    if (!localPart || !domain) return false;
    if (localPart.length > 64) return false;
    
    return true;
  };

  const handleSendCode = async () => {
    setError('');
    
    // Trim and validate the email
    const trimmedEmail = value.trim();
    if (type === 'email') {
      if (!validateEmail(trimmedEmail)) {
        setError('Lütfen geçerli bir e-posta adresi girin');
        return;
      }
    }

    setLoading(true);

    try {
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Prepare email template parameters with proper validation
      const templateParams = {
        to_email: trimmedEmail,
        verification_code: verificationCode,
        to_name: 'Kullanıcı'
      };

      // Send verification code via EmailJS with error handling
      try {
        await emailjs.send(
          'service_7zp8q0m',
          'template_slnhqxh',
          templateParams,
          '--2ShPbtagrWq5rhP'
        );
      } catch (emailError: any) {
        console.error('EmailJS error:', emailError);
        if (emailError.status === 422) {
          throw new Error('E-posta adresi geçersiz veya ulaşılamıyor');
        }
        throw new Error('E-posta gönderilemedi. Lütfen tekrar deneyin');
      }

      // Save verification code to database
      const { error: dbError } = await supabase.rpc(
        'generate_email_code',
        {
          email_address: trimmedEmail,
          verification_code: verificationCode
        }
      );

      if (dbError) throw dbError;

      setStep('verify');
      setCooldown(60); // 1 minute cooldown
      toast.success('Doğrulama kodu e-posta adresinize gönderildi');
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.');
      toast.error('Doğrulama kodu gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);

    try {
      // Verify code using database function
      const { data: verified, error: verifyError } = await supabase.rpc(
        'verify_email_code',
        {
          email_address: value.trim(),
          verification_code: code
        }
      );

      if (verifyError) throw verifyError;

      if (!verified) {
        throw new Error('Geçersiz doğrulama kodu');
      }

      onVerified(value.trim());
      toast.success('E-posta adresi başarıyla doğrulandı');
      handleClose();
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Doğrulama başarısız. Lütfen kodu kontrol edip tekrar deneyin.');
      toast.error('Doğrulama başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setValue(currentValue?.trim() || '');
    setCode('');
    setStep('input');
    setError('');
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue.trim());
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-white">
                    {type === 'email' ? 'E-posta Doğrulama' : 'Telefon Doğrulama'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {step === 'input' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {type === 'email' ? 'E-posta Adresi' : 'Telefon Numarası'}
                        </label>
                        {type === 'email' ? (
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={value}
                              onChange={handleInputChange}
                              className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="ornek@email.com"
                              required
                            />
                          </div>
                        ) : (
                          <PhoneInput
                            value={value}
                            onChange={setValue}
                          />
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleClose}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleSendCode}
                          disabled={loading || !value || cooldown > 0 || (type === 'email' && !validateEmail(value))}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Gönderiliyor...</span>
                            </>
                          ) : cooldown > 0 ? (
                            <span>{cooldown} saniye bekleyin...</span>
                          ) : (
                            <span>Doğrulama Kodu Gönder</span>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Doğrulama Kodu
                        </label>
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="123456"
                          maxLength={6}
                          required
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setStep('input')}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Geri
                        </button>
                        <button
                          onClick={handleVerifyCode}
                          disabled={loading || code.length !== 6}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Doğrulanıyor...</span>
                            </>
                          ) : (
                            <span>Doğrula</span>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};