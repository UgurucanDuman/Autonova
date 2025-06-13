import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  listingId: string;
  userId: string;
  onReviewSubmitted: () => void;
  className?: string;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  listingId,
  userId,
  onReviewSubmitted,
  className = '',
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  React.useEffect(() => {
    const checkReviewEligibility = async () => {
      try {
        setCheckingEligibility(true);
        const { data, error } = await supabase.rpc('can_review_listing', {
          p_user_id: userId,
          p_listing_id: listingId
        });

        if (error) throw error;
        setCanReview(data);
      } catch (err) {
        console.error('Error checking review eligibility:', err);
        setCanReview(false);
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkReviewEligibility();
  }, [userId, listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Lütfen bir puan seçin');
      return;
    }
    
    if (!title.trim()) {
      setError('Lütfen bir başlık girin');
      return;
    }
    
    if (!content.trim()) {
      setError('Lütfen bir yorum girin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          listing_id: listingId,
          user_id: userId,
          rating,
          title: title.trim(),
          content: content.trim()
        });
        
      if (error) throw error;
      
      toast.success('Yorumunuz başarıyla gönderildi');
      setRating(0);
      setTitle('');
      setContent('');
      onReviewSubmitted();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Yorum gönderilirken bir hata oluştu');
      toast.error('Yorum gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (checkingEligibility) {
    return (
      <div className={`flex items-center justify-center h-20 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (canReview === false) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg ${className}`}>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
          Bu ilan için yorum yapabilmek için satıcıyla iletişime geçmiş olmanız gerekmektedir.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Yorum Yap
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Puanınız
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoverRating || rating) >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>
        
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Başlık
          </label>
          <input
            type="text"
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Yorumunuz için kısa bir başlık"
            required
          />
        </div>
        
        <div>
          <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Yorumunuz
          </label>
          <textarea
            id="review-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Deneyiminizi paylaşın..."
            required
          />
        </div>
        
        <div className="flex justify-end">
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Yorum Gönder</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};