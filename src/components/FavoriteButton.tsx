import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  listingId: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  listingId,
  userId,
  size = 'md',
  className = '',
  onToggle
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  useEffect(() => {
    if (userId) {
      checkFavoriteStatus();
    } else {
      setLoading(false);
    }
  }, [userId, listingId]);

  const checkFavoriteStatus = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .maybeSingle();
        
      if (error) throw error;
      
      setIsFavorite(!!data);
    } catch (err) {
      console.error('Error checking favorite status:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    // Prevent event from bubbling up to parent elements
    e.stopPropagation();
    
    if (!userId) {
      toast.error('Favorilere eklemek için giriş yapmalısınız');
      return;
    }
    
    if (loading) return;
    
    setAnimating(true);
    
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId);
          
        if (error) throw error;
        
        setIsFavorite(false);
        if (onToggle) onToggle(false);
        toast.success('Favorilerden çıkarıldı');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: userId,
            listing_id: listingId
          });
          
        if (error) throw error;
        
        setIsFavorite(true);
        if (onToggle) onToggle(true);
        toast.success('Favorilere eklendi');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('İşlem sırasında bir hata oluştu');
    } finally {
      setTimeout(() => {
        setAnimating(false);
      }, 300);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggleFavorite}
      disabled={loading}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full ${
        isFavorite 
          ? 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400' 
          : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400'
      } shadow-md transition-colors ${className}`}
      aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
    >
      <Heart 
        className={`${iconSizes[size]} ${animating ? 'animate-ping' : ''} ${isFavorite ? 'fill-current' : ''}`} 
      />
    </motion.button>
  );
};