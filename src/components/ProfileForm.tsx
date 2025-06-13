import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Building2 } from 'lucide-react';
import { PhoneInput } from './PhoneInput';
import { Link } from 'react-router-dom';

interface ProfileFormProps {
  profile: any;
  editForm: {
    full_name: string;
    phone: string;
  };
  setEditForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  onEmailClick: () => void;
  onPasswordClick: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  editForm,
  setEditForm,
  onSubmit,
  saving,
  onEmailClick,
  onPasswordClick,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Full Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ad Soyad
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={editForm.full_name}
            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </motion.div>

      {/* Email */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          E-posta
        </label>
        <div className="relative group">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <div className="flex items-center">
            <div className="pl-10 pr-4 py-2 flex-1 min-w-0 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <span className="block truncate">{profile.email}</span>
            </div>
            <button
              type="button"
              onClick={onEmailClick}
              className="ml-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors whitespace-nowrap"
            >
              Değiştir
            </button>
          </div>
        </div>
      </motion.div>

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Telefon
        </label>
        <PhoneInput
          value={editForm.phone}
          onChange={(value) => setEditForm(prev => ({ ...prev, phone: value }))}
        />
      </motion.div>

      {/* Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Şifre
        </label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <div className="flex items-center">
            <div className="pl-10 pr-4 py-2 flex-1 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              ••••••••
            </div>
            <button
              type="button"
              onClick={onPasswordClick}
              className="ml-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors whitespace-nowrap"
            >
              Değiştir
            </button>
          </div>
        </div>
      </motion.div>

      {/* Corporate Status */}
      {profile.is_corporate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kurumsal Hesap
          </label>
          <div className="relative group">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="pl-10 pr-4 py-2 flex-1 rounded-lg border dark:border-gray-600 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {profile.company_name || 'Kurumsal Hesap'}
              </div>
              <Link
                to="/corporate"
                className="ml-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors whitespace-nowrap"
              >
                Yönet
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end space-x-2"
      >
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <span>Kaydet</span>
          )}
        </button>
      </motion.div>
    </form>
  );
};