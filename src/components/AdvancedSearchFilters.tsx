import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, Search, Sliders, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdvancedSearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  initialFilters?: any;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters = {}
}) => {
  const [filters, setFilters] = useState({
    brand: initialFilters.brand || '',
    model: initialFilters.model || '',
    minYear: initialFilters.minYear || '',
    maxYear: initialFilters.maxYear || '',
    minPrice: initialFilters.minPrice || '',
    maxPrice: initialFilters.maxPrice || '',
    minMileage: initialFilters.minMileage || '',
    maxMileage: initialFilters.maxMileage || '',
    fuelType: initialFilters.fuelType || '',
    transmission: initialFilters.transmission || '',
    bodyType: initialFilters.bodyType || '',
    color: initialFilters.color || '',
    features: initialFilters.features || [],
    condition: initialFilters.condition || '',
    location: initialFilters.location || '',
    minEngineSize: initialFilters.minEngineSize || '',
    maxEngineSize: initialFilters.maxEngineSize || '',
    minPower: initialFilters.minPower || '',
    maxPower: initialFilters.maxPower || '',
    doors: initialFilters.doors || '',
    warranty: initialFilters.warranty || false,
    negotiable: initialFilters.negotiable || false,
    exchange: initialFilters.exchange || false
  });

  const [carBrands, setCarBrands] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (filters.brand) {
      fetchModels(filters.brand);
    } else {
      setCarModels([]);
    }
  }, [filters.brand]);

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      // Fetch unique brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('car_listings')
        .select('brand')
        .eq('status', 'approved')
        .order('brand');
        
      if (brandsError) throw brandsError;
      
      const uniqueBrands = Array.from(new Set(brandsData.map(item => item.brand))).filter(Boolean);
      setCarBrands(uniqueBrands);
      
      // Fetch unique colors
      const { data: colorsData, error: colorsError } = await supabase
        .from('car_listings')
        .select('color')
        .eq('status', 'approved')
        .order('color');
        
      if (colorsError) throw colorsError;
      
      const uniqueColors = Array.from(new Set(colorsData.map(item => item.color))).filter(Boolean);
      setColors(uniqueColors);
      
      // Fetch unique locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('car_listings')
        .select('location')
        .eq('status', 'approved')
        .order('location');
        
      if (locationsError) throw locationsError;
      
      const uniqueLocations = Array.from(new Set(locationsData.map(item => item.location))).filter(Boolean);
      setLocations(uniqueLocations);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (brand: string) => {
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
      console.error('Error fetching models:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFilters(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      brand: '',
      model: '',
      minYear: '',
      maxYear: '',
      minPrice: '',
      maxPrice: '',
      minMileage: '',
      maxMileage: '',
      fuelType: '',
      transmission: '',
      bodyType: '',
      color: '',
      features: [],
      condition: '',
      location: '',
      minEngineSize: '',
      maxEngineSize: '',
      minPower: '',
      maxPower: '',
      doors: '',
      warranty: false,
      negotiable: false,
      exchange: false
    });
  };

  const carFeatures = [
    'ABS', 'Klima', 'Hız Sabitleyici', 'Yokuş Kalkış Desteği', 'ESP',
    'Şerit Takip Sistemi', 'Geri Görüş Kamerası', 'Park Sensörü',
    'Deri Döşeme', 'Elektrikli Ayna', 'Elektrikli Cam', 'Merkezi Kilit',
    'Yağmur Sensörü', 'Far Sensörü', 'Start/Stop', 'Sunroof',
    'Navigasyon', 'Bluetooth', 'USB', 'Aux'
  ];

  const bodyTypes = [
    'Sedan', 'Hatchback', 'Station Wagon', 'SUV', 'Crossover',
    'Coupe', 'Convertible', 'Van', 'Pickup'
  ];

  const conditions = [
    { value: '', label: 'Tümü' },
    { value: 'new', label: 'Sıfır' },
    { value: 'used', label: 'İkinci El' },
    { value: 'damaged', label: 'Hasarlı' }
  ];

  const fuelTypes = [
    { value: '', label: 'Tümü' },
    { value: 'benzin', label: 'Benzin' },
    { value: 'dizel', label: 'Dizel' },
    { value: 'lpg', label: 'LPG' },
    { value: 'hybrid', label: 'Hibrit' },
    { value: 'electric', label: 'Elektrik' }
  ];

  const transmissionTypes = [
    { value: '', label: 'Tümü' },
    { value: 'manual', label: 'Manuel' },
    { value: 'automatic', label: 'Otomatik' },
    { value: 'semi-automatic', label: 'Yarı Otomatik' }
  ];

  const doorOptions = [
    { value: '', label: 'Tümü' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' }
  ];

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
            <Sliders className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Gelişmiş Arama Filtreleri
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Info Section */}
            <div className="lg:col-span-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Temel Bilgiler
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Marka
                  </label>
                  <select
                    name="brand"
                    value={filters.brand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    {carBrands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model
                  </label>
                  <select
                    name="model"
                    value={filters.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!filters.brand}
                  >
                    <option value="">Tümü</option>
                    {carModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Durum
                  </label>
                  <select
                    name="condition"
                    value={filters.condition}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {conditions.map(condition => (
                      <option key={condition.value} value={condition.value}>{condition.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Price Range */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Fiyat Aralığı
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min (₺)
                  </label>
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max (₺)
                  </label>
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={handleChange}
                    placeholder="Limitsiz"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Year Range */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Yıl Aralığı
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    name="minYear"
                    value={filters.minYear}
                    onChange={handleChange}
                    placeholder="1900"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    name="maxYear"
                    value={filters.maxYear}
                    onChange={handleChange}
                    placeholder={new Date().getFullYear().toString()}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Mileage Range */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Kilometre Aralığı
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min (km)
                  </label>
                  <input
                    type="number"
                    name="minMileage"
                    value={filters.minMileage}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max (km)
                  </label>
                  <input
                    type="number"
                    name="maxMileage"
                    value={filters.maxMileage}
                    onChange={handleChange}
                    placeholder="Limitsiz"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Fuel Type */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Yakıt Tipi
              </h3>
              <select
                name="fuelType"
                value={filters.fuelType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {fuelTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            {/* Transmission */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Vites
              </h3>
              <select
                name="transmission"
                value={filters.transmission}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {transmissionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            {/* Body Type */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Kasa Tipi
              </h3>
              <select
                name="bodyType"
                value={filters.bodyType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {bodyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Color */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Renk
              </h3>
              <select
                name="color"
                value={filters.color}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {colors.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            
            {/* Location */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Konum
              </h3>
              <select
                name="location"
                value={filters.location}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tümü</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
            
            {/* Engine Size Range */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Motor Hacmi
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min
                  </label>
                  <input
                    type="text"
                    name="minEngineSize"
                    value={filters.minEngineSize}
                    onChange={handleChange}
                    placeholder="Örn: 1.0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max
                  </label>
                  <input
                    type="text"
                    name="maxEngineSize"
                    value={filters.maxEngineSize}
                    onChange={handleChange}
                    placeholder="Örn: 2.0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Power Range */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Motor Gücü (HP)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min
                  </label>
                  <input
                    type="number"
                    name="minPower"
                    value={filters.minPower}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max
                  </label>
                  <input
                    type="number"
                    name="maxPower"
                    value={filters.maxPower}
                    onChange={handleChange}
                    placeholder="Limitsiz"
                    min="0"
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Doors */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Kapı Sayısı
              </h3>
              <select
                name="doors"
                value={filters.doors}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {doorOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            {/* Additional Options */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Ek Özellikler
              </h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="warranty"
                    checked={filters.warranty}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Garantili
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="negotiable"
                    checked={filters.negotiable}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Pazarlık Payı Var
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="exchange"
                    checked={filters.exchange}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Takas Yapılır
                  </span>
                </label>
              </div>
            </div>
            
            {/* Features */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">
                Özellikler
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {carFeatures.map(feature => (
                  <label key={feature} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.features.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Filtreleri Sıfırla
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filtreleri Uygula</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};