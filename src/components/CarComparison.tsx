import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Car, ArrowLeft, ArrowRight, Plus, Trash2, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CarListing } from '../lib/types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface CarComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  initialCars?: string[];
}

export const CarComparison: React.FC<CarComparisonProps> = ({
  isOpen,
  onClose,
  initialCars = []
}) => {
  const navigate = useNavigate();
  const [cars, setCars] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<CarListing[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeCarIndex, setActiveCarIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && initialCars.length > 0) {
      fetchInitialCars(initialCars);
    }
  }, [isOpen, initialCars]);

  const fetchInitialCars = async (carIds: string[]) => {
    if (carIds.length === 0) return;
    
    setLoading(true);
    try {
      const promises = carIds.map(id => 
        supabase
          .from('car_listings')
          .select(`
            *,
            car_images (
              id,
              url
            )
          `)
          .eq('id', id)
          .single()
      );
      
      const results = await Promise.all(promises);
      const validCars = results
        .filter(result => !result.error && result.data)
        .map(result => result.data);
      
      setCars(validCars);
    } catch (err) {
      console.error('Error fetching cars for comparison:', err);
      setError('Araçlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('car_listings')
        .select(`
          *,
          car_images (
            id,
            url
          )
        `)
        .or(`brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`)
        .eq('status', 'approved')
        .limit(10);
        
      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching cars:', err);
      toast.error('Araç araması sırasında bir hata oluştu');
    } finally {
      setSearching(false);
    }
  };

  const addCar = (car: CarListing) => {
    if (cars.length >= 3) {
      toast.error('En fazla 3 araç karşılaştırabilirsiniz');
      return;
    }
    
    if (cars.some(c => c.id === car.id)) {
      toast.error('Bu araç zaten karşılaştırma listesinde');
      return;
    }
    
    setCars([...cars, car]);
    setSearchResults([]);
    setSearchTerm('');
    setShowSearch(false);
  };

  const removeCar = (index: number) => {
    const newCars = [...cars];
    newCars.splice(index, 1);
    setCars(newCars);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Car className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Araç Karşılaştırma
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
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

          {/* Car Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, index) => {
              const car = cars[index];
              
              return (
                <div 
                  key={index}
                  className={`border dark:border-gray-700 rounded-lg overflow-hidden ${
                    activeCarIndex === index ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {car ? (
                    <div className="h-full flex flex-col">
                      <div className="relative h-48">
                        {car.car_images && car.car_images.length > 0 ? (
                          <img 
                            src={car.car_images[0].url} 
                            alt={`${car.brand} ${car.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                        <button
                          onClick={() => removeCar(index)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                          {car.brand} {car.model} {car.year}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                          {car.mileage.toLocaleString()} km • {car.fuel_type}
                        </p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-auto">
                          ₺{car.price.toLocaleString()}
                        </p>
                        <button
                          onClick={() => navigate(`/listings/${car.id}`)}
                          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          İlana Git
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="h-full min-h-[300px] flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setShowSearch(true);
                        setActiveCarIndex(index);
                      }}
                    >
                      <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 text-center">
                        Karşılaştırmak için araç ekleyin
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison Table */}
          {cars.length > 1 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                      Özellik
                    </th>
                    {cars.map((car, index) => (
                      <th key={index} className="p-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                        {car.brand} {car.model}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Year */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Yıl
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.year}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Mileage */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Kilometre
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.mileage.toLocaleString()} km
                      </td>
                    ))}
                  </tr>
                  
                  {/* Fuel Type */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Yakıt Tipi
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.fuel_type}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Transmission */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Vites
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.transmission}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Body Type */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Kasa Tipi
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.body_type}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Engine Size */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Motor Hacmi
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.engine_size || '-'}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Power */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Motor Gücü
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.power || '-'}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Color */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Renk
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.color}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Price */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Fiyat
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm font-bold text-blue-600 dark:text-blue-400 border-b dark:border-gray-600">
                        ₺{car.price.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Features */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Özellikler
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        <div className="space-y-1">
                          {car.features && car.features.length > 0 ? (
                            car.features.map((feature, i) => (
                              <div key={i} className="flex items-center space-x-1">
                                <Check className="w-4 h-4 text-green-500" />
                                <span>{feature}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">Belirtilmemiş</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Location */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-b dark:border-gray-600">
                      Konum
                    </td>
                    {cars.map((car, index) => (
                      <td key={index} className="p-3 text-sm text-gray-600 dark:text-gray-300 border-b dark:border-gray-600">
                        {car.location}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Car className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Karşılaştırma yapmak için en az 2 araç ekleyin
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                En fazla 3 aracı yan yana karşılaştırabilirsiniz
              </p>
            </div>
          )}
        </div>

        {/* Search Overlay */}
        {showSearch && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <Car className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Araç Ara
              </h3>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setActiveCarIndex(null);
                  setSearchResults([]);
                  setSearchTerm('');
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Marka veya model ara..."
                  className="flex-1 px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {searching ? 'Aranıyor...' : 'Ara'}
                </button>
              </div>
              
              {searching ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((car) => (
                    <div 
                      key={car.id}
                      className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => addCar(car)}
                    >
                      <div className="h-40 relative">
                        {car.car_images && car.car_images.length > 0 ? (
                          <img 
                            src={car.car_images[0].url} 
                            alt={`${car.brand} ${car.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Car className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {car.brand} {car.model} {car.year}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {car.mileage.toLocaleString()} km • {car.fuel_type}
                        </p>
                        <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                          ₺{car.price.toLocaleString()}
                        </p>
                        <button
                          className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Karşılaştırmaya Ekle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm && !searching ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Aramanızla eşleşen araç bulunamadı
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};