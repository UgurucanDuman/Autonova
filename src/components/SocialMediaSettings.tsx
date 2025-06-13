import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Instagram, Facebook, Twitter, Save, AlertTriangle, 
  CheckCircle, X, Settings, Link
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface SocialMediaSettingsProps {
  isAdmin?: boolean;
}

export const SocialMediaSettings: React.FC<SocialMediaSettingsProps> = ({ isAdmin = false }) => {
  const [settings, setSettings] = useState({
    instagram_api_key: '',
    facebook_api_key: '',
    twitter_api_key: '',
    instagram_username: '',
    facebook_page_id: '',
    twitter_handle: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to fetch existing settings
      const { data, error } = await supabase
        .from('social_media_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        // If no settings exist, create default row
        if (error.code === 'PGRST116') {
          try {
            const { data: newData, error: insertError } = await supabase
              .from('social_media_settings')
              .insert([
                {
                  id: 1,
                  instagram_api_key: '',
                  facebook_api_key: '',
                  twitter_api_key: '',
                  instagram_username: '',
                  facebook_page_id: '',
                  twitter_handle: ''
                }
              ])
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting default settings:', insertError);
              // Continue with empty settings
              setSettings({
                instagram_api_key: '',
                facebook_api_key: '',
                twitter_api_key: '',
                instagram_username: '',
                facebook_page_id: '',
                twitter_handle: ''
              });
            } else {
              setSettings({
                instagram_api_key: newData?.instagram_api_key || '',
                facebook_api_key: newData?.facebook_api_key || '',
                twitter_api_key: newData?.twitter_api_key || '',
                instagram_username: newData?.instagram_username || '',
                facebook_page_id: newData?.facebook_page_id || '',
                twitter_handle: newData?.twitter_handle || ''
              });
            }
          } catch (err) {
            console.error('Error creating default settings:', err);
            setSettings({
              instagram_api_key: '',
              facebook_api_key: '',
              twitter_api_key: '',
              instagram_username: '',
              facebook_page_id: '',
              twitter_handle: ''
            });
          }
        } else {
          console.error('Error fetching social media settings:', error);
          // Continue with empty settings
          setSettings({
            instagram_api_key: '',
            facebook_api_key: '',
            twitter_api_key: '',
            instagram_username: '',
            facebook_page_id: '',
            twitter_handle: ''
          });
        }
      } else {
        setSettings({
          instagram_api_key: data?.instagram_api_key || '',
          facebook_api_key: data?.facebook_api_key || '',
          twitter_api_key: data?.twitter_api_key || '',
          instagram_username: data?.instagram_username || '',
          facebook_page_id: data?.facebook_page_id || '',
          twitter_handle: data?.twitter_handle || ''
        });
      }
    } catch (err) {
      console.error('Error fetching social media settings:', err);
      setError('Sosyal medya ayarları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('social_media_settings')
        .upsert({
          id: 1, // Single row for settings
          instagram_api_key: settings.instagram_api_key,
          facebook_api_key: settings.facebook_api_key,
          twitter_api_key: settings.twitter_api_key,
          instagram_username: settings.instagram_username,
          facebook_page_id: settings.facebook_page_id,
          twitter_handle: settings.twitter_handle,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setSuccess('Sosyal medya ayarları başarıyla kaydedildi');
      toast.success('Ayarlar kaydedildi');
    } catch (err) {
      console.error('Error saving social media settings:', err);
      setError('Sosyal medya ayarları kaydedilemedi');
      toast.error('Ayarlar kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300">Sosyal Medya Ayarları</h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              İlanların otomatik olarak paylaşılabilmesi için sosyal medya hesap bilgilerini ve API anahtarlarını yapılandırın.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Instagram Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/20">
              <Instagram className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Instagram
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Anahtarı
              </label>
              <input
                type="password"
                name="instagram_api_key"
                value={settings.instagram_api_key}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="API anahtarını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                name="instagram_username"
                value={settings.instagram_username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="@kullaniciadi"
              />
            </div>
          </div>
        </div>
        
        {/* Facebook Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Facebook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Facebook
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Anahtarı
              </label>
              <input
                type="password"
                name="facebook_api_key"
                value={settings.facebook_api_key}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="API anahtarını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sayfa ID
              </label>
              <input
                type="text"
                name="facebook_page_id"
                value={settings.facebook_page_id}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sayfa ID'sini girin"
              />
            </div>
          </div>
        </div>
        
        {/* Twitter Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Twitter className="w-6 h-6 text-blue-400 dark:text-blue-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Twitter
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Anahtarı
              </label>
              <input
                type="password"
                name="twitter_api_key"
                value={settings.twitter_api_key}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="API anahtarını girin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                name="twitter_handle"
                value={settings.twitter_handle}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="@kullaniciadi"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Ayarları Kaydet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};