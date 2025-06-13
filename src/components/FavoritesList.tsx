import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Car, Trash2, X, AlertTriangle, Search, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FavoriteButton } from './FavoriteButton';

interface FavoritesListProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  userId,
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCars, setSelectedCars] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchFavorites();
    }
  }, [isOpen, userId]);

  const fetchFavorites = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          listing_id,
          created_at,
          listing:car_listings (
            id,
            brand,
            model,
            year,
            price,
            mileage,
            fuel_type,
            transmission,
            car_images (
              id,
              url
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setFavorites(data || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Favoriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
        
      if (error) throw error;
      
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      toast.success('Favorilerden çıkarıldı');
    } catch (err) {
      console.error('Error removing favorite:', err);
      toast.error('Favorilerden çıkarılırken bir hata oluştu');
    }
  };

  const handleCompare = () => {
    if (selectedCars.length < 2) {
      toast.error('Karşılaştırma için en az 2 araç seçmelisiniz');
      return;
    }
    
    if (selectedCars.length > 3) {
      toast.error('En fazla 3 araç karşılaştırabilirsiniz');
      return;
    }
    
    // Store selected cars in localStorage
    localStorage.setItem('compareCarIds', JSON.stringify(selectedCars));
    
    // Navigate to comparison page
    navigate('/compare');
    onClose();
  };

  const toggleCarSelection = (carId: string) => {
    if (selectedCars.includes(carId)) {
      setSelectedCars(selectedCars.filter(id => id !== carId));
    } else {
      if (selectedCars.length >= 3) {
        toast.error('En fazla 3 araç seçebilirsiniz');
        return;
      }
      setSelectedCars([...selectedCars, carId]);
    }
  };

  const filteredFavorites = favorites.filter(fav => {
    if (!searchTerm.trim()) return true;
    
    const listing = fav.listing;
    if (!listing) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      listing.brand?.toLowerCase().includes(searchLower) ||
      listing.model?.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Heart className="w-6 h-6 mr-2 text-red-500" />
            Favorilerim
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Favorilerimde ara..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleCompare}
            disabled={selectedCars.length < 2}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2 whitespace-nowrap"
          >
            <Car className="w-5 h-5" />
            <span>Seçilenleri Karşılaştır ({selectedCars.length}/3)</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                Henüz favoriniz yok
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Beğendiğiniz ilanları favorilere ekleyerek daha sonra kolayca bulabilirsiniz.
              </p>
              <button
                onClick={() => {
                  navigate('/listings');
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
              >
                <Car className="w-5 h-5" />
                <span>İlanları Keşfet</span>
              </button>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aramanızla eşleşen favori bulunamadı
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFavorites.map((favorite) => {
                const listing = favorite.listing;
                if (!listing) return null;
                
                const isSelected = selectedCars.includes(listing.id);
                
                return (
                  <div 
                    key={favorite.id}
                    className={`border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div 
                      className="relative h-40 cursor-pointer"
                      onClick={() => toggleCarSelection(listing.id)}
                    >
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
                      
                      {/* Selection Indicator */}
                      <div className="absolute top-2 left-2">
                        <div 
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                          } border-2 border-white dark:border-gray-800 shadow-md`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(favorite.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {listing.brand} {listing.model} {listing.year}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {listing.mileage.toLocaleString()} km • {listing.fuel_type}
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                        ₺{listing.price.toLocaleString()}
                      </p>
                      
                      <div className="mt-2 flex justify-between items-center">
                        <button
                          onClick={() => {
                            navigate(`/listings/${listing.id}`);
                            onClose();
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                        >
                          <span>İlana Git</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`compare-${listing.id}`}
                            checked={isSelected}
                            onChange={() => toggleCarSelection(listing.id)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <label htmlFor={`compare-${listing.id}`} className="ml-1 text-xs text-gray-600 dark:text-gray-300">
                            Karşılaştır
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};