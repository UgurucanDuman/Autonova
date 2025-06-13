import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Filter,
  Search,
  Car,
  HelpCircle,
  X,
  ChevronDown,
  Plus,
  Star,
  CheckCircle,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  Shield,
  Users,
  Award,
  Building
} from 'lucide-react';
import { getCarListings } from '../lib/supabase';
import { CarListing } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../components/AuthContext';
import { AnimatedContainer } from '../components/AnimatedContainer';
import { AnimatedList } from '../components/AnimatedList';
import { MotionCard } from '../components/MotionCard';
import { FavoriteButton } from '../components/FavoriteButton';
import { NavbarActions } from '../components/NavbarActions';
import { AdvancedSearchFilters } from '../components/AdvancedSearchFilters';

const CarListings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    minMileage: '',
    maxMileage: '',
    fuelType: '',
    transmission: '',
    bodyType: '',
    color: '',
    features: [] as string[],
    condition: '',
    location: '',
    searchTerm: '',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const carBrands = [
    'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Citroen', 'Dacia', 'Daewoo', 'Fiat',
    'Ford', 'GAZ', 'Geely', 'Genesis', 'Great Wall Motors', 'Honda', 'Hongqi', 'Hyundai', 'Jaguar',
    'Kia', 'Lada', 'Land Rover', 'Li Auto', 'Mercedes', 'Mini', 'Moskvitch', 'Nissan', 'Nio', 'Opel',
    'Peugeot', 'Porsche', 'Renault', 'Saab', 'Seat', 'Skoda', 'SsangYong', 'TOGG', 'Toyota',
    'Trumpchi', 'UAZ', 'Volkswagen', 'Volvo', 'XPeng', 'Zeekr', 'Ferrari'
  ];

  const fuelTypes = [
    { value: '', label: 'Tümü' },
    { value: 'benzin', label: 'Benzin' },
    { value: 'dizel', label: 'Dizel' },
    { value: 'lpg', label: 'LPG' },
    { value: 'elektrik', label: 'Elektrik' },
    { value: 'hibrit', label: 'Hibrit' }
  ];

  const transmissionTypes = [
    { value: '', label: 'Tümü' },
    { value: 'manual', label: 'Manuel' },
    { value: 'automatic', label: 'Otomatik' },
    { value: 'semi-automatic', label: 'Yarı Otomatik' }
  ];

  const bodyTypes = [
    { value: '', label: 'Tümü' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'station_wagon', label: 'Station Wagon' },
    { value: 'suv', label: 'SUV' },
    { value: 'crossover', label: 'Crossover' },
    { value: 'coupe', label: 'Coupe' },
    { value: 'convertible', label: 'Convertible' },
    { value: 'van', label: 'Van' },
    { value: 'pickup', label: 'Pickup' }
  ];

  const conditions = [
    { value: '', label: 'Tümü' },
    { value: 'new', label: 'Sıfır' },
    { value: 'used', label: 'İkinci El' },
    { value: 'damaged', label: 'Hasarlı' }
  ];

  const colors = [
    { value: '', label: 'Tümü' },
    { value: 'beyaz', label: 'Beyaz' },
    { value: 'siyah', label: 'Siyah' },
    { value: 'gri', label: 'Gri' },
    { value: 'kırmızı', label: 'Kırmızı' },
    { value: 'mavi', label: 'Mavi' },
    { value: 'yeşil', label: 'Yeşil' },
    { value: 'sarı', label: 'Sarı' },
    { value: 'kahverengi', label: 'Kahverengi' },
    { value: 'gümüş', label: 'Gümüş' }
  ];

  const features = [
    'ABS', 'Klima', 'Hız Sabitleyici', 'Şerit Takip', 'Geri Görüş Kamerası',
    'Park Sensörü', 'Deri Döşeme', 'Sunroof', 'Navigasyon'
  ];

  const sortOptions = [
    { value: 'newest', label: 'En Yeni' },
    { value: 'oldest', label: 'En Eski' },
    { value: 'price_low', label: 'Fiyat (Düşükten Yükseğe)' },
    { value: 'price_high', label: 'Fiyat (Yüksekten Düşüğe)' },
    { value: 'year_new', label: 'Yıl (Yeniden Eskiye)' },
    { value: 'year_old', label: 'Yıl (Eskiden Yeniye)' },
    { value: 'mileage_low', label: 'Kilometre (Azdan Çoğa)' },
    { value: 'mileage_high', label: 'Kilometre (Çoktan Aza)' }
  ];

  useEffect(() => {
    // URL parametrelerinden arama terimini al
    const queryParams = new URLSearchParams(location.search);
    const searchTerm = queryParams.get('search');
    if (searchTerm) {
      setFilters(prev => ({ ...prev, searchTerm }));
    }
    fetchListings();
  }, [location.search]);

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await getCarListings(filters);
      // Sadece onaylanmış ilanları filtrele
      const approvedListings = data.filter(listing => listing.status === 'approved');
      setListings(approvedListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError('İlanlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = () => {
    if (!user) {
      navigate('/login', {
        state: {
          message: 'İlan vermek için lütfen giriş yapın.',
          returnTo: '/create-listing'
        }
      });
      return;
    }
    navigate('/create-listing');
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const resetFilters = () => {
    setFilters({
      brand: '',
      model: '',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      minMileage: '',
      maxMileage: '',
      fuelType: '',
      transmission: '',
      bodyType: '',
      color: '',
      features: [],
      condition: '',
      location: '',
      searchTerm: '',
    });
  };

  const handleAdvancedSearch = (advancedFilters: any) => {
    setFilters({
      ...filters,
      ...advancedFilters
    });
    setShowAdvancedFilters(false);
  };

  const filteredListings = listings.filter(listing => {
    if (!filters.searchTerm) return true;
    const searchTerm = filters.searchTerm.toLowerCase();
    return (
      listing.brand.toLowerCase().includes(searchTerm) ||
      listing.model.toLowerCase().includes(searchTerm) ||
      listing.location.toLowerCase().includes(searchTerm)
    );
  });

  // Sıralama seçeneklerine göre ilanları düzenle
  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'price_low':
        return a.price - b.price;
      case 'price_high':
        return b.price - a.price;
      case 'year_new':
        return b.year - a.year;
      case 'year_old':
        return a.year - b.year;
      case 'mileage_low':
        return a.mileage - b.mileage;
      case 'mileage_high':
        return b.mileage - a.mileage;
      default:
        return 0;
    }
  });

  // getColorDisplay: İstenen renge göre küçük bir daire ve renk adını gösterir.
  const getColorDisplay = (color: string) => {
    const colorMap: Record<string, string> = {
      beyaz: 'bg-white',
      siyah: 'bg-black',
      gri: 'bg-gray-500',
      kırmızı: 'bg-red-500',
      mavi: 'bg-blue-500',
      yeşil: 'bg-green-500',
      sarı: 'bg-yellow-500',
      kahverengi: 'bg-orange-500',
      gümüş: 'bg-gray-300'
    };

    const lowerColor = color.toLowerCase();
    const chosenColor = colorMap[lowerColor];

    return (
      <div className="flex items-center space-x-2">
        <div
          className={`w-6 h-6 rounded-full ${chosenColor ? chosenColor : 'bg-transparent'} border border-gray-300`}
        ></div>
        <span className="text-sm">{color}</span>
      </div>
    );
  };

  // Optimized About Modal Content - Lazy loaded
  const AboutModalContent = React.memo(() => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Autinoa
        </h4>
        <p className="text-gray-600 dark:text-gray-300">
          Türkiye'nin en güvenilir araç alım-satım platformu
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 dark:text-white">
              Güvenli İşlemler
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tüm ilanlar AI destekli doğrulama sistemi ile kontrol edilir
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 dark:text-white">
              Geniş Kullanıcı Kitlesi
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Binlerce aktif kullanıcı ile hızlı alım-satım imkanı
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 dark:text-white">
              Kaliteli Hizmet
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              7/24 müşteri desteği ve profesyonel hizmet anlayışı
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Building className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-800 dark:text-white">
              Kurumsal Çözümler
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Galeriler ve kurumsal satıcılar için özel çözümler
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <h5 className="font-semibold text-gray-800 dark:text-white mb-2">
          Misyonumuz
        </h5>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Araç alım-satım sürecini daha güvenli, şeffaf ve kolay hale getirerek,
          kullanıcılarımızın en iyi deneyimi yaşamasını sağlamak.
        </p>
      </div>

      <div className="border-t dark:border-gray-700 pt-4">
        <h5 className="font-semibold text-gray-800 dark:text-white mb-3">
          İletişim
        </h5>
        <div className="space-y-2 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            <strong>E-posta:</strong> ugurcanduman48@gmail.com
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            <strong>Telefon:</strong> 0548 820 02 67
          </p>
        </div>
      </div>
    </div>
  ));

  return (
    <AnimatedContainer animation="fadeIn" className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Araba İlanları</h1>
        <div className="flex flex-wrap gap-2">
          <NavbarActions onSearch={handleAdvancedSearch} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAboutModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Hakkımızda</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateListing}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{user ? 'İlan Ver' : 'Giriş'}</span>
          </motion.button>
        </div>
      </div>

      <MotionCard className="p-4 space-y-4" hoverEffect="none">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleFilterChange}
            placeholder="Marka, model veya konum ara..."
            className="form-input pl-10"
          />
        </div>

        <motion.button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtreler</span>
          </div>
          <motion.div
            animate={{ rotate: showFilters ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Marka</label>
                    <select
                      name="brand"
                      value={filters.brand}
                      onChange={handleFilterChange}
                      className="form-select"
                    >
                      <option value="">Tümü</option>
                      {carBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Model</label>
                    <input
                      type="text"
                      name="model"
                      value={filters.model}
                      onChange={handleFilterChange}
                      placeholder="Model ara..."
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Fiyat Aralığı (₺)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="minPrice"
                      value={filters.minPrice}
                      onChange={handleFilterChange}
                      placeholder="Min"
                      className="form-input"
                    />
                    <input
                      type="number"
                      name="maxPrice"
                      value={filters.maxPrice}
                      onChange={handleFilterChange}
                      placeholder="Max"
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Yıl</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="minYear"
                      value={filters.minYear}
                      onChange={handleFilterChange}
                      placeholder="Min"
                      className="form-input"
                    />
                    <input
                      type="number"
                      name="maxYear"
                      value={filters.maxYear}
                      onChange={handleFilterChange}
                      placeholder="Max"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <select
                    name="fuelType"
                    value={filters.fuelType}
                    onChange={handleFilterChange}
                    className="form-select text-sm"
                  >
                    {fuelTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>

                  <select
                    name="transmission"
                    value={filters.transmission}
                    onChange={handleFilterChange}
                    className="form-select text-sm"
                  >
                    {transmissionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>

                  <select
                    name="condition"
                    value={filters.condition}
                    onChange={handleFilterChange}
                    className="form-select text-sm"
                  >
                    {conditions.map(condition => (
                      <option key={condition.value} value={condition.value}>{condition.label}</option>
                    ))}
                  </select>
                </div>

                {/* Color Filter with Visual Colors */}
                <div>
                  <label className="form-label">Renk</label>
                  <select
                    name="color"
                    value={filters.color}
                    onChange={handleFilterChange}
                    className="form-select"
                  >
                    {colors.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  {filters.color && (
                    <div className="mt-2">
                      {getColorDisplay(filters.color)}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAdvancedFilters(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Gelişmiş Filtreler
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={resetFilters}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Filtreleri Sıfırla
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionCard>

      {/* Sort and View Options */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center">
          <span className="text-gray-600 dark:text-gray-300 mr-2">Sırala:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="form-select text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-600 dark:text-gray-300">{sortedListings.length} ilan</span>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              aria-label="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              aria-label="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <AnimatedList
          animation="scale"
          staggerDelay={0.05}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-600 dark:text-gray-300">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p>İlanlar yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-8 text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : sortedListings.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-600 dark:text-gray-300">
              İlan bulunamadı.
            </div>
          ) : (
            sortedListings.map((listing) => (
              <MotionCard
                key={listing.id}
                hoverEffect="scale"
                className="listing-card overflow-hidden group relative"
              >
                <div
                  className="listing-card-image cursor-pointer"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  {listing.car_images && listing.car_images.length > 0 ? (
                    <img
                      src={listing.car_images[0].url}
                      alt={`${listing.brand} ${listing.model}`}
                      className="w-full h-full object-cover rounded-t-xl group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-t-xl flex items-center justify-center">
                      <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  {listing.is_featured && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      <span>Öne Çıkan</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span className="badge badge-green">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Onaylı
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2">
                    <FavoriteButton
                      listingId={listing.id}
                      userId={user?.id}
                      size="sm"
                    />
                  </div>
                </div>
                <div
                  className="listing-card-content cursor-pointer"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  <h3 className="listing-card-title group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {listing.brand} {listing.model} {listing.year}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <DollarSign className="w-4 h-4 mr-1 text-blue-500" />
                      <span className="font-semibold">₺{listing.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4 mr-1 text-red-500" />
                      <span>{listing.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4 mr-1 text-green-500" />
                      <span>{listing.year}</span>
                    </div>
                  </div>

                  <p className="listing-card-price">
                    ₺{listing.price.toLocaleString()}
                  </p>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                    {listing.mileage.toLocaleString()} km • {listing.fuel_type} • {listing.transmission}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getColorDisplay(listing.color)}
                    </div>
                  </div>
                </div>
              </MotionCard>
            ))
          )}
        </AnimatedList>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p>İlanlar yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : sortedListings.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">
              İlan bulunamadı.
            </div>
          ) : (
            sortedListings.map((listing) => (
              <MotionCard
                key={listing.id}
                hoverEffect="none"
                className="overflow-hidden group relative"
              >
                <div className="flex flex-col md:flex-row">
                  <div
                    className="md:w-1/3 h-48 md:h-auto relative cursor-pointer"
                    onClick={() => navigate(`/listings/${listing.id}`)}
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

                    {listing.is_featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        <span>Öne Çıkan</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <span className="badge badge-green">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylı
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2">
                      <FavoriteButton
                        listingId={listing.id}
                        userId={user?.id}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div
                    className="p-4 md:p-6 md:w-2/3 cursor-pointer"
                    onClick={() => navigate(`/listings/${listing.id}`)}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {listing.brand} {listing.model} {listing.year}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-3">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <MapPin className="w-4 h-4 mr-1 text-red-500" />
                            <span>{listing.location}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <Calendar className="w-4 h-4 mr-1 text-green-500" />
                            <span>{listing.year}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ₺{listing.price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Kilometre</p>
                        <p className="font-medium text-gray-800 dark:text-white">
                          {listing.mileage.toLocaleString()} km
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Yakıt</p>
                        <p className="font-medium text-gray-800 dark:text-white">{listing.fuel_type}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Vites</p>
                        <p className="font-medium text-gray-800 dark:text-white">{listing.transmission}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Renk</p>
                        <div className="flex items-center justify-center">
                          {getColorDisplay(listing.color) || (
                            <span className="font-medium text-gray-800 dark:text-white">
                              {listing.color}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <motion.button
                        whileHover={{ x: 3 }}
                        className="text-blue-600 dark:text-blue-400 font-medium flex items-center"
                      >
                        <span>Detayları Görüntüle</span>
                        <ChevronRight className="w-5 h-5 ml-1" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </MotionCard>
            ))
          )}
        </div>
      )}

      <AdvancedSearchFilters
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApplyFilters={handleAdvancedSearch}
        initialFilters={filters}
      />

      {/* Optimized About Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Hakkımızda
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAboutModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <React.Suspense fallback={<div className="animate-pulse">Yükleniyor...</div>}>
                <AboutModalContent />
              </React.Suspense>

              <div className="mt-6 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAboutModal(false)}
                  className="btn-primary"
                >
                  Kapat
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedContainer>
  );
};

export default CarListings;