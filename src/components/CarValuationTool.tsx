import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, X, Car, DollarSign, AlertCircle, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CarValuationToolProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CarValuationTool: React.FC<CarValuationToolProps> = ({
  isOpen,
  onClose
}) => {
  const [carBrands, setCarBrands] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [valuationResult, setValuationResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: '',
    fuelType: '',
    transmission: '',
    condition: 'used'
  });

  useEffect(() => {
    if (isOpen) {
      fetchCarBrands();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.brand) {
      fetchCarModels(formData.brand);
    } else {
      setCarModels([]);
    }
  }, [formData.brand]);

  const fetchCarBrands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('car_listings')
        .select('brand')
        .eq('status', 'approved')
        .order('brand');
        
      if (error) throw error;
      
      const uniqueBrands = Array.from(new Set(data.map(item => item.brand))).filter(Boolean);
      setCarBrands(uniqueBrands);
    } catch (err) {
      console.error('Error fetching car brands:', err);
      setError('Araç markaları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchCarModels = async (brand: string) => {
    try {
      const { data, error } = await supabase
        .from('car_listings')
        .select('model')
        .eq('brand', brand)
        .eq('status', 'approved')
        .order('model');
        
      if (error) throw error;
      
      const uniqueModels = Array.from(new Set(data.map(item => item.model))).filter(Boolean);
      setCarModels(uniqueModels);
    } catch (err) {
      console.error('Error fetching car models:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateValuation = async () => {
    // Validate form
    if (!formData.brand || !formData.model || !formData.year || !formData.mileage || !formData.fuelType || !formData.transmission) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    
    setCalculating(true);
    setError('');
    
    try {
      // Fetch similar listings to calculate average price
      const { data, error } = await supabase
        .from('car_listings')
        .select('price, year, mileage')
        .eq('brand', formData.brand)
        .eq('model', formData.model)
        .eq('fuel_type', formData.fuelType)
        .eq('transmission', formData.transmission)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError('Bu kriterlere uygun yeterli veri bulunamadı');
        return;
      }
      
      // Calculate base price (average of similar listings)
      const averagePrice = data.reduce((sum, item) => sum + item.price, 0) / data.length;
      
      // Apply adjustments based on year and mileage
      const yearDiff = formData.year - Math.round(data.reduce((sum, item) => sum + item.year, 0) / data.length);
      const mileageDiff = parseInt(formData.mileage) - Math.round(data.reduce((sum, item) => sum + item.mileage, 0) / data.length);
      
      // Year adjustment: +/- 5% per year difference
      const yearAdjustment = averagePrice * (yearDiff * 0.05);
      
      // Mileage adjustment: -0.1% per 1000km above average, +0.1% per 1000km below average
      const mileageAdjustment = averagePrice * (-(mileageDiff / 10000));
      
      // Condition adjustment
      const conditionAdjustment = formData.condition === 'new' 
        ? averagePrice * 0.1  // +10% for new
        : formData.condition === 'damaged' 
          ? -averagePrice * 0.2  // -20% for damaged
          : 0;  // no adjustment for used
      
      // Calculate final valuation
      const estimatedValue = Math.max(0, averagePrice + yearAdjustment + mileageAdjustment + conditionAdjustment);
      
      // Calculate price range (+/- 10%)
      const minPrice = Math.round(estimatedValue * 0.9);
      const maxPrice = Math.round(estimatedValue * 1.1);
      
      // Set result
      setValuationResult({
        estimatedValue: Math.round(estimatedValue),
        minPrice,
        maxPrice,
        similarListings: data.length,
        averagePrice: Math.round(averagePrice),
        yearAdjustment: Math.round(yearAdjustment),
        mileageAdjustment: Math.round(mileageAdjustment),
        conditionAdjustment: Math.round(conditionAdjustment)
      });
    } catch (err) {
      console.error('Error calculating valuation:', err);
      setError('Değerleme hesaplanırken bir hata oluştu');
    } finally {
      setCalculating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      mileage: '',
      fuelType: '',
      transmission: '',
      condition: 'used'
    });
    setValuationResult(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Araç Değerleme Aracı
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
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {valuationResult ? (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Tahmini Değer
                </h3>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  ₺{valuationResult.estimatedValue.toLocaleString()}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Fiyat Aralığı: ₺{valuationResult.minPrice.toLocaleString()} - ₺{valuationResult.maxPrice.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                  Değerleme Detayları
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Benzer İlanların Ortalama Fiyatı:</span>
                    <span className="font-medium text-gray-800 dark:text-white">₺{valuationResult.averagePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Yıl Bazlı Düzeltme:</span>
                    <span className={`font-medium ${valuationResult.yearAdjustment >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {valuationResult.yearAdjustment >= 0 ? '+' : ''}₺{valuationResult.yearAdjustment.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Kilometre Bazlı Düzeltme:</span>
                    <span className={`font-medium ${valuationResult.mileageAdjustment >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {valuationResult.mileageAdjustment >= 0 ? '+' : ''}₺{valuationResult.mileageAdjustment.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Durum Bazlı Düzeltme:</span>
                    <span className={`font-medium ${valuationResult.conditionAdjustment >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {valuationResult.conditionAdjustment >= 0 ? '+' : ''}₺{valuationResult.conditionAdjustment.toLocaleString()}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Benzer İlan Sayısı:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{valuationResult.similarListings}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Bu değerleme, benzer araçların fiyatları baz alınarak hesaplanmıştır. Gerçek piyasa değeri; aracın durumu, ek özellikleri ve piyasa koşullarına göre değişiklik gösterebilir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Yeni Değerleme
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Marka <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {carBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!formData.brand}
                  >
                    <option value="">Seçiniz</option>
                    {carModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yıl <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kilometre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    placeholder="Örn: 50000"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yakıt Tipi <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="benzin">Benzin</option>
                    <option value="dizel">Dizel</option>
                    <option value="lpg">LPG</option>
                    <option value="hybrid">Hibrit</option>
                    <option value="electric">Elektrik</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vites <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="manual">Manuel</option>
                    <option value="automatic">Otomatik</option>
                    <option value="semi-automatic">Yarı Otomatik</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durum <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="new">Sıfır</option>
                    <option value="used">İkinci El</option>
                    <option value="damaged">Hasarlı</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Bu araç değerleme aracı, benzer araçların fiyatlarını analiz ederek tahmini bir değer sunar. Sonuçlar, mevcut piyasa verilerine dayanır ve gerçek satış fiyatı farklılık gösterebilir.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!valuationResult && (
          <div className="p-4 border-t dark:border-gray-700 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={calculateValuation}
              disabled={calculating || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {calculating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Hesaplanıyor...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  <span>Değerleme Hesapla</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};