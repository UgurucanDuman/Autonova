import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, Globe, MapPin, FileText, Lock, AlertTriangle, Info } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { PasswordInput } from './PasswordInput';
import { supabase } from '../lib/supabase';

interface CorporateRegistrationFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export const CorporateRegistrationForm: React.FC<CorporateRegistrationFormProps> = ({
  onSubmit,
  loading
}) => {
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    companyType: '',
    taxNumber: '',
    taxOffice: '',
    registrationNumber: '',
    country: '',
    website: '',

    // Authorized Person
    fullName: '',
    position: '',
    phone: '',
    email: '',
    identityNumber: '',

    // Address
    address: '',
    city: '',
    postalCode: '',
    addressCountry: '',

    // Account
    username: '',
    password: '',
    confirmPassword: '',

    // Documents
    documents: null as File | null
  });

  const [documentRequirements, setDocumentRequirements] = useState<any[]>([]);
  const [showRequirementsInfo, setShowRequirementsInfo] = useState(false);
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    // Fetch document requirements
    const fetchRequirements = async () => {
      try {
        const { data, error } = await supabase
          .from('document_requirements')
          .select('*')
          .order('required', { ascending: false });

        if (error) throw error;
        setDocumentRequirements(data || []);
      } catch (err) {
        console.error('Error fetching document requirements:', err);
      }
    };

    fetchRequirements();
  }, []);

  const companyTypes = [
    'Limited Şirket',
    'Anonim Şirket',
    'Şahıs Şirketi',
    'Kollektif Şirket',
    'Komandit Şirket',
    'Kooperatif'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, documents: e.target.files![0] }));
      setDocumentError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if document is uploaded
    if (!formData.documents) {
      setDocumentError('Lütfen en az bir belge yükleyin. Kurumsal hesap onayı için belge yüklenmesi zorunludur.');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
          <Building2 className="w-6 h-6" />
          <span>Firma Bilgileri</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firma Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firma Türü <span className="text-red-500">*</span>
            </label>
            <select
              name="companyType"
              value={formData.companyType}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seçiniz</option>
              {companyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vergi Numarası <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="taxNumber"
              value={formData.taxNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vergi Dairesi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="taxOffice"
              value={formData.taxOffice}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ticaret Sicil Numarası <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kuruluş Ülkesi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firma Web Sitesi (Opsiyonel)
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Authorized Person */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
          <User className="w-6 h-6" />
          <span>Yetkili Kişi Bilgileri</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pozisyon / Ünvan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon Numarası <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-posta Adresi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kimlik veya Pasaport Numarası (İsteğe Bağlı)
            </label>
            <input
              type="text"
              name="identityNumber"
              value={formData.identityNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
          <MapPin className="w-6 h-6" />
          <span>Firma Adresi</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Açık Adres <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şehir / İl / Eyalet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Posta Kodu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ülke <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="addressCountry"
              value={formData.addressCountry}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
          <Lock className="w-6 h-6" />
          <span>Hesap Bilgileri</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şifre <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={formData.password}
              onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
              showStrengthMeter
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şifre Tekrar <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              value={formData.confirmPassword}
              onChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
              error={formData.password !== formData.confirmPassword ? 'Şifreler eşleşmiyor' : undefined}
            />
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
            <FileText className="w-6 h-6" />
            <span>Belgeler</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowRequirementsInfo(!showRequirementsInfo)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {showRequirementsInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300">Belge Gereksinimleri</h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  Kurumsal hesabınızın onaylanması için aşağıdaki belgeleri yüklemeniz gerekmektedir. Kayıt olduktan sonra bu belgeleri profil sayfanızdan yükleyebilirsiniz.
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-blue-700 dark:text-blue-200">
                  {documentRequirements.map(req => (
                    <li key={req.document_type}>
                      {req.name}{req.required && <span className="text-red-500">*</span>}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                  Belgeleriniz 7 iş günü içinde incelenecek ve sonuç size bildirilecektir.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Firma Kuruluş Belgesi <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
          {documentError && (
            <p className="mt-1 text-sm text-red-500">{documentError}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            PDF, DOC, DOCX, JPG veya PNG formatında dosya yükleyebilirsiniz. Diğer gerekli belgeleri kayıt olduktan sonra profil sayfanızdan yükleyebilirsiniz.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <span>Kayıt Ol</span>
          )}
        </button>
      </div>
    </form>
  );
};