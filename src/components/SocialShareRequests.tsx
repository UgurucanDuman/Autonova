import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Instagram, Facebook, Twitter, Share2, CheckCircle, 
  X, AlertTriangle, Search, Calendar, Car, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ShareRequest {
  id: string;
  user_id: string;
  listing_id: string;
  platform: string;
  status: string;
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
  listing: {
    brand: string;
    model: string;
    year: number;
  };
}

export const SocialShareRequests = () => {
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'completed' | 'rejected' | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('share_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'social_share_requests'
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch share requests
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('social_share_requests')
        .select(`
          *,
          user:users!user_id (
            full_name,
            email
          ),
          listing:car_listings (
            brand,
            model,
            year
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching share requests:', err);
      setError('Paylaşım talepleri yüklenirken bir hata oluştu');
      toast.error('Paylaşım talepleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Filter requests based on search term
  const filteredRequests = requests.filter(request => 
    request.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.listing?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.listing?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Process share request
  const handleProcessRequest = async (requestId: string) => {
    if (!selectedAction) {
      toast.error('Lütfen bir işlem seçin');
      return;
    }

    // Validate notes for rejection
    if (selectedAction === 'rejected' && !adminNotes.trim()) {
      toast.error('Reddetme sebebi girmelisiniz');
      return;
    }

    setProcessing(requestId);
    try {
      // Get admin ID from local storage
      const adminSession = localStorage.getItem('adminSession');
      if (!adminSession) {
        throw new Error('Admin session not found');
      }
      
      const { admin_id } = JSON.parse(adminSession);
      
      // Update request status
      const { error } = await supabase
        .from('social_share_requests')
        .update({
          status: selectedAction,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString(),
          processed_by: admin_id
        })
        .eq('id', requestId);

      if (error) throw error;

      // If completed, create a share record
      if (selectedAction === 'completed') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { error: shareError } = await supabase
            .from('social_shares')
            .insert({
              user_id: request.user_id,
              listing_id: request.listing_id,
              platform: request.platform,
              success: true
            });

          if (shareError) throw shareError;
        }
      }

      toast.success(selectedAction === 'completed' ? 'Paylaşım tamamlandı' : 'Paylaşım reddedildi');
      setShowProcessModal(null);
      setAdminNotes('');
      setSelectedAction(null);
      await fetchRequests();
    } catch (err) {
      console.error('Error processing share request:', err);
      toast.error('Paylaşım talebi işlenemedi');
    } finally {
      setProcessing(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      default: return Share2;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tamamlandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <X className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
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
          placeholder="Kullanıcı, ilan veya platform ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Share Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const PlatformIcon = getPlatformIcon(request.platform);
          
          return (
            <div 
              key={request.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${
                request.status === 'rejected' 
                  ? 'border-red-200 dark:border-red-800' 
                  : 'border-gray-100 dark:border-gray-700'
              } p-4`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getPlatformBgColor(request.platform)}`}>
                      <PlatformIcon className={`w-5 h-5 ${getPlatformColor(request.platform)}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                        <span>
                          {request.platform.charAt(0).toUpperCase() + request.platform.slice(1)} Paylaşım Talebi
                        </span>
                        {getStatusBadge(request.status)}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{request.user?.full_name || 'Bilinmiyor'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Car className="w-4 h-4" />
                          <span>{request.listing ? `${request.listing.brand} ${request.listing.model} ${request.listing.year}` : 'Bilinmiyor'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(request.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                          </span>
                        </div>
                      </div>
                      
                      {request.admin_notes && (
                        <div className={`mt-2 text-sm ${
                          request.status === 'rejected' 
                            ? 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20' 
                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50'
                        } p-2 rounded`}>
                          <span className="font-medium">Not:</span> {request.admin_notes}
                        </div>
                      )}

                      {request.status === 'rejected' && request.processed_at && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-300">
                          <span className="font-medium">Reddedilme Tarihi:</span> {format(new Date(request.processed_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setShowProcessModal(request.id);
                          setSelectedAction('completed');
                        }}
                        disabled={processing === request.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Tamamlandı
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowProcessModal(request.id);
                          setSelectedAction('rejected');
                        }}
                        disabled={processing === request.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reddet
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredRequests.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun paylaşım talebi bulunamadı.' : 'Henüz paylaşım talebi yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedAction === 'completed' ? 'Paylaşımı Tamamla' : 'Paylaşımı Reddet'}
              </h3>
              <button 
                onClick={() => {
                  setShowProcessModal(null);
                  setAdminNotes('');
                  setSelectedAction(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admin Notu {selectedAction === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder={selectedAction === 'completed' 
                    ? "Paylaşım hakkında not ekleyin (opsiyonel)..." 
                    : "Reddetme sebebini açıklayın..."}
                  required={selectedAction === 'rejected'}
                />
              </div>
              
              {selectedAction === 'completed' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Bu işlem, paylaşım talebini tamamlandı olarak işaretleyecektir. Lütfen paylaşımı manuel olarak gerçekleştirdiğinizden emin olun.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedAction === 'rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Bu işlem, paylaşım talebini reddedecektir. Lütfen reddetme sebebini belirtin.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowProcessModal(null);
                    setAdminNotes('');
                    setSelectedAction(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleProcessRequest(showProcessModal)}
                  disabled={processing === showProcessModal || (selectedAction === 'rejected' && !adminNotes.trim())}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${
                    selectedAction === 'completed'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing === showProcessModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      {selectedAction === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      <span>{selectedAction === 'completed' ? 'Tamamla' : 'Reddet'}</span>
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