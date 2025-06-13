import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Car, Calculator, MessageSquare, Sliders } from 'lucide-react';
import { useAuth } from './AuthContext';
import { FavoritesList } from './FavoritesList';
import { CarComparison } from './CarComparison';
import { CarValuationTool } from './CarValuationTool';
import { LiveChatSupport } from './LiveChatSupport';
import { AdvancedSearchFilters } from './AdvancedSearchFilters';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface NavbarActionsProps {
  onSearch?: (filters: any) => void;
}

export const NavbarActions: React.FC<NavbarActionsProps> = ({
  onSearch
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showFavorites, setShowFavorites] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchFavoritesCount();
    }
    
    // Check for comparison cars in localStorage
    const storedCarIds = localStorage.getItem('compareCarIds');
    if (storedCarIds) {
      try {
        const parsedIds = JSON.parse(storedCarIds);
        if (Array.isArray(parsedIds)) {
          setCompareCount(parsedIds.length);
        }
      } catch (err) {
        console.error('Error parsing compare car IDs:', err);
      }
    }
  }, [user]);

  const fetchFavoritesCount = async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setFavoritesCount(count || 0);
    } catch (err) {
      console.error('Error fetching favorites count:', err);
    }
  };

  const handleShowFavorites = () => {
    if (!user) {
      toast.error('Favorileri görüntülemek için giriş yapmalısınız');
      navigate('/login');
      return;
    }
    
    setShowFavorites(true);
  };

  const handleShowComparison = () => {
    setShowComparison(true);
  };

  const handleShowValuation = () => {
    setShowValuation(true);
  };

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowFilters}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
          aria-label="Gelişmiş Arama"
        >
          <Sliders className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowFavorites}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
          aria-label="Favoriler"
        >
          <Heart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          {favoritesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {favoritesCount}
            </span>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowComparison}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
          aria-label="Araç Karşılaştırma"
        >
          <Car className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          {compareCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {compareCount}
            </span>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowValuation}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Araç Değerleme"
        >
          <Calculator className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </motion.button>
      </div>
      
      {/* Favorites List */}
      {user && showFavorites && (
        <FavoritesList
          userId={user.id}
          isOpen={showFavorites}
          onClose={() => setShowFavorites(false)}
        />
      )}
      
      {/* Car Comparison */}
      {showComparison && (
        <CarComparison
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
        />
      )}
      
      {/* Car Valuation Tool */}
      {showValuation && (
        <CarValuationTool
          isOpen={showValuation}
          onClose={() => setShowValuation(false)}
        />
      )}
      
      {/* Advanced Search Filters */}
      {showFilters && (
        <AdvancedSearchFilters
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          onApplyFilters={(filters) => {
            if (onSearch) {
              onSearch(filters);
            }
          }}
        />
      )}
      
      {/* Live Chat Support */}
      <LiveChatSupport />
    </>
  );
};