import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Search, AlertTriangle, CheckCircle, 
  X, User, Calendar, Star, Eye, Flag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  listing?: {
    brand: string;
    model: string;
    year: number;
  };
}

export const AdminReviewManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
      }
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('reviews_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews'
      }, () => {
        fetchReviews();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:users (
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

      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Yorumlar yüklenirken bir hata oluştu');
      toast.error('Yorumlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filter reviews based on search term
  const filteredReviews = reviews.filter(review => 
    review.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.listing?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.listing?.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle approving a review
  const handleApproveReview = async (reviewId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(reviewId);
    try {
      // Use the admin_update_review_status function
      const { data, error } = await supabase.rpc('admin_update_review_status', {
        p_review_id: reviewId,
        p_admin_id: adminId,
        p_is_approved: true
      });

      if (error) throw error;

      toast.success('Yorum onaylandı');
      await fetchReviews();
    } catch (err) {
      console.error('Error approving review:', err);
      toast.error('Yorum onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejecting a review
  const handleRejectReview = async (reviewId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    setProcessing(reviewId);
    try {
      // Use the admin_update_review_status function
      const { data, error } = await supabase.rpc('admin_update_review_status', {
        p_review_id: reviewId,
        p_admin_id: adminId,
        p_is_approved: false
      });

      if (error) throw error;

      toast.success('Yorum reddedildi');
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchReviews();
    } catch (err) {
      console.error('Error rejecting review:', err);
      toast.error('Yorum reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle deleting a review
  const handleDeleteReview = async (reviewId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(reviewId);
    try {
      // Use the admin_delete_review function
      const { data, error } = await supabase.rpc('admin_delete_review', {
        p_review_id: reviewId,
        p_admin_id: adminId
      });

      if (error) throw error;

      toast.success('Yorum silindi');
      await fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('Yorum silinemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle viewing a review
  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setShowReviewModal(review.id);
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
          placeholder="Yorum içeriği, kullanıcı adı veya araç ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Reviews List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">İlan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Başlık</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Puan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredReviews.map((review) => (
                <tr 
                  key={review.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.user?.full_name || 'İsimsiz Kullanıcı'}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {review.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {review.listing ? `${review.listing.brand} ${review.listing.model} ${review.listing.year}` : 'Bilinmiyor'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                      {review.title}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300 mr-1">
                        {review.rating}
                      </span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(review.created_at), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {review.is_approved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylı
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <Flag className="w-3 h-3 mr-1" />
                        Beklemede
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleViewReview(review)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Görüntüle
                    </button>
                    
                    {!review.is_approved && (
                      <button
                        onClick={() => handleApproveReview(review.id)}
                        disabled={processing === review.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Onayla
                      </button>
                    )}
                    
                    {review.is_approved && (
                      <button
                        onClick={() => setShowRejectModal(review.id)}
                        disabled={processing === review.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reddet
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={processing === review.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReviews.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun yorum bulunamadı.' : 'Henüz yorum yok.'}
            </p>
          </div>
        )}
      </div>

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
                Yorumu Reddet
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
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Yorumu neden reddetmek istediğinizi açıklayın..."
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
                  onClick={() => handleRejectReview(showRejectModal)}
                  disabled={processing === showRejectModal || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showRejectModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Reddet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Review Modal */}
      {showReviewModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yorum Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowReviewModal(null);
                  setSelectedReview(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedReview.user?.full_name || 'İsimsiz Kullanıcı'}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedReview.user?.email}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedReview.rating}
                  </span>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {selectedReview.title}
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(selectedReview.created_at), 'dd.MM.yyyy', { locale: tr })}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {selectedReview.content}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  İlan Bilgileri
                </h4>
                <p className="text-blue-700 dark:text-blue-200">
                  {selectedReview.listing 
                    ? `${selectedReview.listing.brand} ${selectedReview.listing.model} ${selectedReview.listing.year}` 
                    : 'İlan bilgisi bulunamadı'}
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowReviewModal(null);
                    setSelectedReview(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
                
                {!selectedReview.is_approved ? (
                  <button
                    onClick={() => {
                      handleApproveReview(selectedReview.id);
                      setShowReviewModal(null);
                      setSelectedReview(null);
                    }}
                    disabled={processing === selectedReview.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Onayla</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowReviewModal(null);
                      setSelectedReview(null);
                      setShowRejectModal(selectedReview.id);
                    }}
                    disabled={processing === selectedReview.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Reddet</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};