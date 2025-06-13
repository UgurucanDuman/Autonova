import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Shield, AlertTriangle, 
  CheckCircle, X, Camera, Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface AdminIdentityVerificationProps {
  adminId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const AdminIdentityVerification: React.FC<AdminIdentityVerificationProps> = ({
  adminId,
  onVerified,
  onCancel
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImage, setIdImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelfieImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfiePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!fullName || !email || !phone || !idNumber) {
        throw new Error('Lütfen tüm alanları doldurun');
      }

      if (!idImage) {
        throw new Error('Lütfen kimlik belgesi yükleyin');
      }

      if (!selfieImage) {
        throw new Error('Lütfen selfie fotoğrafı yükleyin');
      }

      // In a real implementation, you would:
      // 1. Upload the images to storage
      // 2. Store the verification data in the database
      // 3. Trigger a verification process

      // For this demo, we'll simulate a successful verification
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update admin record with verification data
      const { error: updateError } = await supabase
        .from('admin_credentials')
        .update({
          full_name: fullName,
          email: email,
          phone: phone,
          id_number: idNumber,
          identity_verified: true,
          identity_verified_at: new Date().toISOString()
        })
        .eq('id', adminId);

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success('Kimlik doğrulama başarılı');
      
      // Wait a moment before calling onVerified
      setTimeout(() => {
        onVerified();
      }, 2000);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Kimlik doğrulama başarısız');
      toast.error('Kimlik doğrulama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg max-w-md w-full mx-auto"
    >
      <div className="text-center mb-6">
        <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Yönetici Kimlik Doğrulama
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Güvenlik için kimliğinizi doğrulayın
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
            Kimlik Doğrulama Başarılı
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Kimliğiniz başarıyla doğrulandı. Yönetici paneline yönlendiriliyorsunuz...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ad Soyad
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tam adınızı girin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-posta
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="E-posta adresinizi girin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Telefon numaranızı girin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kimlik / Pasaport Numarası
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kimlik numaranızı girin"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kimlik Belgesi
            </label>
            <div className="border-2 border-dashed dark:border-gray-600 rounded-lg p-4">
              {idPreview ? (
                <div className="relative">
                  <img 
                    src={idPreview} 
                    alt="Kimlik Önizleme" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIdImage(null);
                      setIdPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="id-upload"
                      className="relative cursor-pointer rounded-md bg-white dark:bg-gray-800 font-semibold text-blue-600 dark:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                    >
                      <span>Kimlik Yükle</span>
                      <input
                        id="id-upload"
                        name="id-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleIdImageChange}
                      />
                    </label>
                    <p className="pl-1">veya sürükleyip bırakın</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                    PNG, JPG, GIF - Maksimum 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selfie Fotoğrafı
            </label>
            <div className="border-2 border-dashed dark:border-gray-600 rounded-lg p-4">
              {selfiePreview ? (
                <div className="relative">
                  <img 
                    src={selfiePreview} 
                    alt="Selfie Önizleme" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieImage(null);
                      setSelfiePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="selfie-upload"
                      className="relative cursor-pointer rounded-md bg-white dark:bg-gray-800 font-semibold text-blue-600 dark:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                    >
                      <span>Selfie Yükle</span>
                      <input
                        id="selfie-upload"
                        name="selfie-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleSelfieImageChange}
                      />
                    </label>
                    <p className="pl-1">veya sürükleyip bırakın</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
                    PNG, JPG, GIF - Maksimum 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Doğrulanıyor...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Kimliği Doğrula</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};