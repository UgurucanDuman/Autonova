import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, Search, AlertTriangle, CheckCircle, 
  X, Car, Eye, Star, Flag, XCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Listing {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  user_id: string;
  status: string;
  created_at: string;
  is_featured: boolean;
  users?: {
    full_name: string;
    email: string;
  };
  car_images?: {
    id: string;
    url: string;
  }[];
}

export const ListingsList = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Get admin session from localStorage
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) {
          // Not an admin, redirect to home
          navigate('/');
          return;
        }

        const { admin_id } = JSON.parse(adminSession);
        if (!admin_id) {
          navigate('/');
          return;
        }

        // Verify admin exists in database
        const { data, error } = await supabase
          .from('admin_credentials')
          .select('id')
          .eq('id', admin_id)
          .single();

        if (error || !data) {
          console.error('Admin verification error:', error);
          localStorage.removeItem('adminSession');
          navigate('/');
          return;
        }

        // Admin is verified
        setIsAdmin(true);
        setAdminId(admin_id);
      } catch (err) {
        console.error('Error checking admin status:', err);
        navigate('/');
      }
    };

    checkAdminStatus();
  }, [navigate]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('listings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'car_listings'
      }, () => {
        fetchListings();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch listings
  const fetchListings = async () => {
    try {
      setLoading(true);
      
      // Use admin_view_all_listings function to bypass RLS
      if (isAdmin && adminId) {
        const { data, error } = await supabase
          .from('car_listings')
          .select(`
            *,
            users (
              full_name,
              email
            ),
            car_images (
              id,
              url
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } else {
        setError('Admin credentials not found');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('İlanlar yüklenirken bir hata oluştu');
      toast.error('İlanlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchListings();
    }
  }, [isAdmin]);

  // Filter listings based on search term
  const filteredListings = listings.filter(listing => 
    listing.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle listing deletion
  const handleDeleteListing = async (listingId: string) => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için yetkiniz yok');
      return;
    }

    setProcessing(listingId);
    try {
      // Get admin ID from local storage
      if (!adminId) {
        throw new Error('Admin session not found');
      }
      
      // Use the admin_delete_listing function to bypass RLS
      const { data, error } = await supabase.rpc('admin_delete_listing', {
        p_listing_id: listingId,
        p_admin_id: adminId
      });

      if (error) throw error;
      
      if (!data) {
        throw new Error('İlan silinemedi');
      }

      toast.success('İlan silindi');
      setShowDeleteConfirm(null);
      await fetchListings();
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('İlan silinemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle listing featuring
  const handleFeatureListing = async (listingId: string, isFeatured: boolean) => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için yetkiniz yok');
      return;
    }

    setProcessing(listingId);
    try {
      const { error } = await supabase
        .from('car_listings')
        .update({ is_featured: !isFeatured })
        .eq('id', listingId);

      if (error) throw error;

      toast.success(isFeatured ? 'İlan öne çıkarma kaldırıldı' : 'İlan öne çıkarıldı');
      await fetchListings();
    } catch (err) {
      console.error('Error featuring listing:', err);
      toast.error('İlan güncellenemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle listing moderation
  const handleModerateListing = async (listingId: string, newStatus: string, reason?: string) => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için yetkiniz yok');
      return;
    }

    setProcessing(listingId);
    try {
      // Get admin ID from local storage
      if (!adminId) {
        throw new Error('Admin session not found');
      }
      
      // Use the admin_update_listing_status function
      const { data, error } = await supabase.rpc('admin_update_listing_status', {
        p_listing_id: listingId,
        p_status: newStatus,
        p_admin_id: adminId,
        p_reason: reason || (newStatus === 'approved' ? 'Admin tarafından onaylandı' : 'Admin tarafından reddedildi')
      });

      if (error) throw error;

      toast.success(newStatus === 'approved' ? 'İlan onaylandı' : 'İlan reddedildi');
      
      // Clear modals
      setShowRejectModal(null);
      setRejectReason('');
      
      await fetchListings();
    } catch (err) {
      console.error('Error moderating listing:', err);
      toast.error('İlan durumu güncellenemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle listing report
  const handleReportListing = async (listingId: string) => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için yetkiniz yok');
      return;
    }

    if (!reportReason.trim()) {
      toast.error('Lütfen rapor sebebi girin');
      return;
    }

    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(listingId);
    try {
      // Use the admin_reports table instead of listing_reports
      const { data, error } = await supabase.rpc('create_admin_report', {
        p_listing_id: listingId,
        p_admin_id: adminId,
        p_reason: reportReason,
        p_details: 'Admin tarafından raporlandı'
      });

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Rapor oluşturulamadı');
      }

      toast.success('İlan raporlandı');
      setShowReportModal(null);
      setReportReason('');
      
      // Notify the listing owner
      await notifyListingOwner(listingId, reportReason);
    } catch (err: any) {
      console.error('Error reporting listing:', err);
      toast.error(`İlan raporlanamadı: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setProcessing(null);
    }
  };

  // Function to notify the listing owner about the report
  const notifyListingOwner = async (listingId: string, reason: string) => {
    try {
      // Get the listing owner's ID
      const { data: listingData, error: listingError } = await supabase
        .from('car_listings')
        .select('user_id, brand, model')
        .eq('id', listingId)
        .single();
        
      if (listingError) throw listingError;
      
      if (!listingData) {
        throw new Error('İlan bulunamadı');
      }
      
      // Create a notification for the user
      const { error: notificationError } = await supabase
        .from('notification_logs')
        .insert({
          user_id: listingData.user_id,
          status: 'sent',
          template_id: (await supabase
            .from('notification_templates')
            .select('id')
            .eq('name', 'listing_notification')
            .single()).data?.id
        });
        
      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
      
      // Send an email to the user
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            userId: listingData.user_id,
            subject: `İlanınız Raporlandı: ${listingData.brand} ${listingData.model}`,
            message: `İlanınız bir yönetici tarafından raporlandı. Sebep: ${reason}. Lütfen ilanınızı kontrol edin ve gerekli düzenlemeleri yapın.`
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending notification:', errorData);
      }
    } catch (err) {
      console.error('Error notifying listing owner:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Yetkisiz Erişim
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
        </div>
      </div>
    );
  }

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
          placeholder="Marka, model veya satıcı adı ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun ilan bulunamadı.' : 'Henüz ilan yok.'}
            </p>
          </div>
        ) : (
          filteredListings.map((listing) => (
            <div 
              key={listing.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <div className="relative h-48">
                {listing.car_images && listing.car_images.length > 0 ? (
                  <img 
                    src={listing.car_images[0].url} 
                    alt={`${listing.brand} ${listing.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                
                {/* Featured badge */}
                {listing.is_featured && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                    Öne Çıkan
                  </div>
                )}
                
                {/* Status badge */}
                <div className="absolute bottom-2 left-2">
                  {getStatusBadge(listing.status)}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {listing.brand} {listing.model} {listing.year}
                </h3>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Satıcı: {listing.users?.full_name || 'Bilinmiyor'}
                </p>
                
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                  ₺{listing.price.toLocaleString()}
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/listings/${listing.id}`)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    İncele
                  </button>
                  
                  <button
                    onClick={() => handleFeatureListing(listing.id, listing.is_featured)}
                    disabled={processing === listing.id}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg ${
                      listing.is_featured
                        ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                        : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40'
                    } transition-colors`}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    {listing.is_featured ? 'Öne Çıkarma Kaldır' : 'Öne Çıkar'}
                  </button>
                  
                  {listing.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleModerateListing(listing.id, 'approved')}
                        disabled={processing === listing.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Onayla
                      </button>
                      
                      <button
                        onClick={() => setShowRejectModal(listing.id)}
                        disabled={processing === listing.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reddet
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setShowReportModal(listing.id)}
                    disabled={processing === listing.id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 transition-colors"
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    Raporla
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(listing.id)}
                    disabled={processing === listing.id}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlanı Sil
              </h3>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteListing(showDeleteConfirm)}
                  disabled={processing === showDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showDeleteConfirm ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlanı Raporla
              </h3>
              <button 
                onClick={() => setShowReportModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rapor Sebebi
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="İlanı neden raporlamak istediğinizi açıklayın..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowReportModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleReportListing(showReportModal)}
                  disabled={processing === showReportModal || !reportReason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showReportModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      <span>Raporla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                İlanı Reddet
              </h3>
              <button 
                onClick={() => setShowRejectModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reddetme Sebebi
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="İlanı neden reddetmek istediğinizi açıklayın..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRejectModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleModerateListing(showRejectModal, 'rejected', rejectReason)}
                  disabled={processing === showRejectModal || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showRejectModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Reddet</span>
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