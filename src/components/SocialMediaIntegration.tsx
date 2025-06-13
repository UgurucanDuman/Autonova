import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Twitter, Link, CheckCircle, AlertCircle, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface SocialMediaIntegrationProps {
  userId: string;
  isAdmin?: boolean;
}

export const SocialMediaIntegration: React.FC<SocialMediaIntegrationProps> = ({ userId, isAdmin = false }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    instagram_api_key: '',
    facebook_api_key: '',
    twitter_api_key: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      
      // If admin, fetch API settings
      if (isAdmin) {
        try {
          const { data: settingsData, error: settingsError } = await supabase
            .from('social_media_settings')
            .select('*')
            .eq('id', 1)
            .single();
            
          if (settingsError) {
            console.error('Error fetching API settings:', settingsError);
            
            // Try to create default settings
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
                
              if (!insertError && newData) {
                setApiSettings({
                  instagram_api_key: newData.instagram_api_key || '',
                  facebook_api_key: newData.facebook_api_key || '',
                  twitter_api_key: newData.twitter_api_key || ''
                });
              }
            } catch (insertErr) {
              console.error('Error creating default settings:', insertErr);
            }
          } else if (settingsData) {
            setApiSettings({
              instagram_api_key: settingsData.instagram_api_key || '',
              facebook_api_key: settingsData.facebook_api_key || '',
              twitter_api_key: settingsData.twitter_api_key || ''
            });
          }
        } catch (settingsErr) {
          console.error('Error in API settings flow:', settingsErr);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: 'instagram' | 'facebook' | 'twitter') => {
    setConnecting(platform);
    try {
      // In a real app, this would redirect to the platform's OAuth flow
      // For demo purposes, we'll simulate a successful connection
      
      // Update the user's profile with the connected platform
      const updates: any = {};
      
      switch (platform) {
        case 'instagram':
          updates.instagram_enabled = true;
          break;
        case 'facebook':
          updates.facebook_enabled = true;
          break;
        case 'twitter':
          updates.twitter_enabled = true;
          break;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
        
      if (error) throw error;
      
      await fetchProfile();
      toast.success(`${getPlatformName(platform)} hesabı bağlandı`);
    } catch (err) {
      console.error(`Error connecting to ${platform}:`, err);
      toast.error(`${getPlatformName(platform)} hesabına bağlanılamadı`);
    } finally {
      setConnecting(null);
    }
  };
  
  const handleDisconnect = async (platform: 'instagram' | 'facebook' | 'twitter') => {
    setConnecting(platform);
    try {
      // Update the user's profile to disconnect the platform
      const updates: any = {};
      
      switch (platform) {
        case 'instagram':
          updates.instagram_enabled = false;
          break;
        case 'facebook':
          updates.facebook_enabled = false;
          break;
        case 'twitter':
          updates.twitter_enabled = false;
          break;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
        
      if (error) throw error;
      
      await fetchProfile();
      setShowDisconnectModal(null);
      toast.success(`${getPlatformName(platform)} hesabının bağlantısı kesildi`);
    } catch (err) {
      console.error(`Error disconnecting from ${platform}:`, err);
      toast.error(`${getPlatformName(platform)} hesabının bağlantısı kesilirken bir hata oluştu`);
    } finally {
      setConnecting(null);
    }
  };
  
  const handleSaveApiSettings = async () => {
    try {
      const { error } = await supabase
        .from('social_media_settings')
        .upsert({
          id: 1, // Single row for settings
          instagram_api_key: apiSettings.instagram_api_key,
          facebook_api_key: apiSettings.facebook_api_key,
          twitter_api_key: apiSettings.twitter_api_key,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success('API ayarları kaydedildi');
      setShowSettingsModal(false);
    } catch (err) {
      console.error('Error saving API settings:', err);
      toast.error('API ayarları kaydedilemedi');
    }
  };
  
  const getPlatformName = (platform: string): string => {
    switch (platform) {
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'twitter': return 'Twitter';
      default: return platform;
    }
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      default: return Link;
    }
  };
  
  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'instagram': return 'text-pink-600 dark:text-pink-400';
      case 'facebook': return 'text-blue-600 dark:text-blue-400';
      case 'twitter': return 'text-blue-400 dark:text-blue-300';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const getPlatformBgColor = (platform: string): string => {
    switch (platform) {
      case 'instagram': return 'bg-pink-100 dark:bg-pink-900/20';
      case 'facebook': return 'bg-blue-100 dark:bg-blue-900/20';
      case 'twitter': return 'bg-blue-100 dark:bg-blue-900/20';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const platforms = [
    { id: 'instagram', name: 'Instagram', description: 'İlanları Instagram\'da paylaş' },
    { id: 'facebook', name: 'Facebook', description: 'İlanları Facebook\'ta paylaş' },
    { id: 'twitter', name: 'Twitter', description: 'İlanları Twitter\'da paylaş' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300">Sosyal Medya Entegrasyonu</h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              {isAdmin 
                ? 'Sosyal medya hesaplarını yöneterek ilanların otomatik olarak paylaşılmasını sağlayabilirsiniz.'
                : 'Sosyal medya hesaplarınızı bağlayarak ilanlarınızın otomatik olarak paylaşılmasını sağlayabilirsiniz.'}
            </p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>API Ayarları</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map((platform) => {
          const isConnected = isAdmin ? true : profile[`${platform.id}_enabled`];
          const PlatformIcon = getPlatformIcon(platform.id);
          
          return (
            <div 
              key={platform.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${getPlatformBgColor(platform.id)}`}>
                  <PlatformIcon className={`w-8 h-8 ${getPlatformColor(platform.id)}`} />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {platform.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {platform.description}
                  </p>
                </div>
                
                {isAdmin ? (
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Bağlı</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      API Anahtarı: {apiSettings[`${platform.id}_api_key` as keyof typeof apiSettings] ? '••••••••' : 'Ayarlanmadı'}
                    </p>
                  </div>
                ) : isConnected ? (
                  <div className="flex flex-col items-center space-y-2 w-full">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span>Bağlı</span>
                    </div>
                    
                    <button
                      onClick={() => setShowDisconnectModal(platform.id)}
                      disabled={connecting === platform.id}
                      className="w-full px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {connecting === platform.id ? (
                        <div className="w-5 h-5 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        'Bağlantıyı Kes'
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id as any)}
                    disabled={connecting === platform.id}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {connecting === platform.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      'Bağlan'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getPlatformName(showDisconnectModal)} Bağlantısını Kes
              </h3>
              <button 
                onClick={() => setShowDisconnectModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                {getPlatformName(showDisconnectModal)} hesabının bağlantısını kesmek istediğinizden emin misiniz? Bu işlem sonrasında ilanlar otomatik olarak {getPlatformName(showDisconnectModal)}'da paylaşılmayacaktır.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDisconnectModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDisconnect(showDisconnectModal as any)}
                  disabled={connecting === showDisconnectModal}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {connecting === showDisconnectModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Bağlantıyı Kes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* API Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sosyal Medya API Ayarları
              </h3>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instagram API Anahtarı
                </label>
                <input
                  type="text"
                  value={apiSettings.instagram_api_key}
                  onChange={(e) => setApiSettings({...apiSettings, instagram_api_key: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Instagram API anahtarını girin"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Facebook API Anahtarı
                </label>
                <input
                  type="text"
                  value={apiSettings.facebook_api_key}
                  onChange={(e) => setApiSettings({...apiSettings, facebook_api_key: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Facebook API anahtarını girin"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Twitter API Anahtarı
                </label>
                <input
                  type="text"
                  value={apiSettings.twitter_api_key}
                  onChange={(e) => setApiSettings({...apiSettings, twitter_api_key: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Twitter API anahtarını girin"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveApiSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};