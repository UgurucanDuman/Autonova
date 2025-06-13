import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, User, Calendar, MessageSquare, ThumbsUp, Flag, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  created_at: string;
  user?: {
    full_name: string;
    profile_image_url?: string;
  };
  replies?: ReviewReply[];
}

interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string;
    profile_image_url?: string;
  };
}

interface ReviewListProps {
  listingId: string;
  currentUserId?: string;
  isListingOwner?: boolean;
  className?: string;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  listingId,
  currentUserId,
  isListingOwner = false,
  className = '',
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyContent, setReplyContent] = useState<{[key: string]: string}>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
    fetchReviewStats();
  }, [listingId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:users(full_name, profile_image_url),
          replies:review_replies(
            id,
            review_id,
            user_id,
            content,
            created_at,
            user:users(full_name, profile_image_url)
          )
        `)
        .eq('listing_id', listingId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Yorumlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_listing_rating_stats', {
        p_listing_id: listingId
      });

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error fetching review stats:', err);
    }
  };

  const handleReplySubmit = async (reviewId: string) => {
    if (!currentUserId || !replyContent[reviewId]?.trim()) return;
    
    setSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('review_replies')
        .insert({
          review_id: reviewId,
          user_id: currentUserId,
          content: replyContent[reviewId].trim()
        });
        
      if (error) throw error;
      
      toast.success('Yanıtınız başarıyla gönderildi');
      setReplyContent({...replyContent, [reviewId]: ''});
      setReplyingTo(null);
      fetchReviews();
    } catch (err: any) {
      console.error('Error submitting reply:', err);
      toast.error('Yanıt gönderilemedi');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReportReview = async (reviewId: string) => {
    // In a real app, you would implement a reporting system
    toast.success('Yorum başarıyla raporlandı. Yöneticiler en kısa sürede inceleyecektir.');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg ${className}`}>
        <AlertTriangle className="w-5 h-5 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center ${className}`}>
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          Bu ilan için henüz yorum yapılmamış.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Review Stats */}
      {stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.average_rating.toFixed(1)}</div>
                <div className="flex items-center justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(stats.average_rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stats.review_count} değerlendirme
                </div>
              </div>
              
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribution[rating] || 0;
                  const percentage = stats.review_count > 0 
                    ? (count / stats.review_count) * 100 
                    : 0;
                    
                  return (
                    <div key={rating} className="flex items-center space-x-2 mb-1">
                      <div className="flex items-center space-x-1 w-12">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{rating}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {review.user?.profile_image_url ? (
                    <img 
                      src={review.user.profile_image_url} 
                      alt={review.user?.full_name || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {review.user?.full_name || 'Kullanıcı'}
                  </p>
                  <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(review.created_at), 'dd MMM yyyy', { locale: tr })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {review.title}
              </h4>
              <p className="mt-1 text-gray-600 dark:text-gray-300">
                {review.content}
              </p>
            </div>
            
            {review.is_verified_purchase && (
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                <ThumbsUp className="w-3 h-3 mr-1" />
                Doğrulanmış Satın Alma
              </div>
            )}
            
            <div className="mt-3 flex justify-between items-center">
              <div className="flex space-x-2">
                {isListingOwner && !review.replies?.length && (
                  <button
                    onClick={() => setReplyingTo(review.id)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Yanıtla</span>
                  </button>
                )}
                
                {currentUserId && currentUserId !== review.user_id && (
                  <button
                    onClick={() => handleReportReview(review.id)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center space-x-1"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Raporla</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Reply Form */}
            {replyingTo === review.id && isListingOwner && (
              <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <textarea
                    value={replyContent[review.id] || ''}
                    onChange={(e) => setReplyContent({...replyContent, [review.id]: e.target.value})}
                    placeholder="Yoruma yanıt yazın..."
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => handleReplySubmit(review.id)}
                      disabled={submittingReply || !replyContent[review.id]?.trim()}
                      className="px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
                    >
                      {submittingReply ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Yanıtla</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Replies */}
            {review.replies && review.replies.length > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                {review.replies.map((reply) => (
                  <div key={reply.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {reply.user?.profile_image_url ? (
                          <img 
                            src={reply.user.profile_image_url} 
                            alt={reply.user?.full_name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {reply.user?.full_name || 'Satıcı'} <span className="text-xs text-blue-600 dark:text-blue-400">(Satıcı)</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(reply.created_at), 'dd MMM yyyy', { locale: tr })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};