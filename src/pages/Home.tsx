import React, { useEffect, useState } from 'react';
import { Search, Car, TrendingUp, Shield, Clock, ArrowRight, ChevronRight, Star, CheckCircle, Heart, DollarSign, MapPin, Calendar, Users, Award, Zap, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCarListings } from '../lib/supabase';
import { CarListing } from '../lib/types';
import { motion } from 'framer-motion';
import { useAuth } from '../components/AuthContext';
import { AnimatedContainer } from '../components/AnimatedContainer';
import { AnimatedList } from '../components/AnimatedList';
import { MotionCard } from '../components/MotionCard';
import { supabase } from '../lib/supabase';
import { FavoriteButton } from '../components/FavoriteButton';

const Home = () => {
  const features = [
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: "Hızlı ve Kolay İlan Verme",
      description: "Dakikalar içinde aracınızı satışa çıkarın. Kullanıcı dostu arayüzümüz sayesinde ilan verme süreci hızlı ve kolaydır."
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: "Güvenli Alım Satım",
      description: "Doğrulanmış kullanıcılar ve güvenli mesajlaşma sistemi sayesinde güvenle alım satım yapabilirsiniz."
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: "7/24 Destek",
      description: "Sorularınız ve sorunlarınız için 7/24 destek ekibimiz her zaman yanınızda."
    }
  ];

  const navigate = useNavigate();
  const { user } = useAuth();
  const [featuredListings, setFeaturedListings] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [stats, setStats] = useState({
    totalListings: 0,
    totalUsers: 0,
    totalSales: 0
  });

  useEffect(() => {
    let mounted = true;

    const fetchFeaturedListings = async () => {
      try {
        setLoading(true);
        setError('');
        
        const listings = await getCarListings();
        
        if (!mounted) return;

        const approvedListings = listings.filter(listing => listing.status === 'approved');
        
        const featured = approvedListings.filter(listing => listing.is_featured);
        const recent = approvedListings.filter(listing => !listing.is_featured);
        
        const combinedListings = [...featured, ...recent].slice(0, 6);
        
        setFeaturedListings(combinedListings);
        
        setStats({
          totalListings: approvedListings.length,
          totalUsers: Math.floor(approvedListings.length * 1.5),
          totalSales: Math.floor(approvedListings.length * 0.7)
        });
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching listings:', error);
        setError('İlanlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const fetchTestimonials = async () => {
      try {
        setLoadingTestimonials(true);
        
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            *,
            user:users(full_name, profile_image_url),
            listing:car_listings(brand, model, year)
          `)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setTestimonials(data);
        } else {
          setTestimonials([]);
        }
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setTestimonials([]);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchFeaturedListings();
    fetchTestimonials();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/listings?search=${searchTerm}`);
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

  const handleListingClick = (listingId: string) => {
    navigate(`/listings/${listingId}`);
  };

  return (
    <div className="space-y-16 pb-safe">
      {/* Hero Section - Enhanced with parallax effect */}
      <div className="relative h-[600px] sm:h-[700px] md:h-[800px] -mt-8 rounded-b-[40px] overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src="https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Luxury Cars"
            className="w-full h-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent flex items-center">
          <div className="container mx-auto px-4">
            <AnimatedContainer 
              animation="slideUp" 
              delay={0.2}
              className="max-w-3xl space-y-8"
            >
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight"
              >
                Hayalinizdeki Araca <br />
                <span className="text-blue-400">Ulaşmanın</span> En Kolay Yolu
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg sm:text-xl md:text-2xl text-gray-200"
              >
                Binlerce araç arasından size en uygun olanı bulun, güvenle alın veya satın.
              </motion.p>
              
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onSubmit={handleSearch} 
                className="flex gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-xl"
              >
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Marka, model veya anahtar kelime"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/10 text-white placeholder-gray-300 border-0 focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                </div>
                <motion.button 
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 sm:px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 text-lg font-semibold shadow-lg"
                >
                  <Search className="w-6 h-6" />
                  <span className="hidden sm:inline">Ara</span>
                </motion.button>
              </motion.form>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-4 mt-6"
              >
                {[
                  { icon: <Car className="w-5 h-5" />, text: "10.000+ İlan" },
                  { icon: <CheckCircle className="w-5 h-5" />, text: "Güvenilir Satıcılar" },
                  { icon: <Heart className="w-5 h-5" />, text: "Favorilere Ekle" }
                ].map((item, index) => (
                  <motion.div 
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/15 backdrop-blur-md px-5 py-3 rounded-full text-white flex items-center space-x-2 shadow-lg"
                  >
                    {item.icon}
                    <span className="text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatedContainer>
          </div>
        </div>
      </div>

      {/* Stats Section - Enhanced with better animations */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Car className="w-10 h-10 text-blue-600 dark:text-blue-400" />,
              value: stats.totalListings,
              label: "Aktif İlan",
              color: "blue"
            },
            {
              icon: <Users className="w-10 h-10 text-green-600 dark:text-green-400" />,
              value: stats.totalUsers,
              label: "Mutlu Kullanıcı",
              color: "green"
            },
            {
              icon: <Award className="w-10 h-10 text-purple-600 dark:text-purple-400" />,
              value: stats.totalSales,
              label: "Tamamlanan Satış",
              color: "purple"
            }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center transform transition-all duration-300"
            >
              <div className={`w-20 h-20 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-full flex items-center justify-center mx-auto mb-6`}>
                {stat.icon}
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, type: "spring" }}
                className={`text-4xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400 mb-3`}
              >
                {stat.value}+
              </motion.div>
              <div className="text-lg text-gray-600 dark:text-gray-300">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Neden Autinoa?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Araç alım satım sürecinizi kolaylaştıran özelliklerle donatılmış platformumuz, güvenli ve hızlı işlemler yapmanızı sağlar.
          </p>
        </div>
        
        <AnimatedList 
          animation="slideUp" 
          staggerDelay={0.1}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <MotionCard
              key={index}
              hoverEffect="lift"
              className="p-6"
            >
              <div className="feature-card flex flex-col items-center text-center h-full p-4 space-y-4">
                <div className="feature-icon flex items-center justify-center p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                  {feature.icon}
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 flex-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </MotionCard>
          ))}
        </AnimatedList>
      </div>

      {/* How It Works Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Aracınızı satmak veya yeni bir araç almak hiç bu kadar kolay olmamıştı
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
                <div className="absolute -right-8 top-1/2 h-0.5 w-16 bg-blue-200 dark:bg-blue-800 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Üye Olun</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Hızlıca üye olun ve platformun tüm özelliklerinden yararlanmaya başlayın.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">2</span>
                <div className="absolute -right-8 top-1/2 h-0.5 w-16 bg-blue-200 dark:bg-blue-800 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">İlan Verin veya Arayın</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Aracınızı satmak için ilan verin veya binlerce araç arasından size uygun olanı bulun.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Anlaşın ve Satın Alın</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Satıcıyla iletişime geçin, aracı inceleyin ve güvenle alışverişinizi tamamlayın.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Öne Çıkan İlanlar
          </h2>
          <motion.button
            whileHover={{ x: 5 }}
            onClick={() => navigate('/listings')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center"
          >
            <span>Tümünü Gör</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </motion.button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <div className="text-gray-600 dark:text-gray-300">Yükleniyor...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </div>
        ) : featuredListings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-300">Henüz ilan bulunmuyor.</div>
          </div>
        ) : (
          <AnimatedList 
            animation="scale" 
            staggerDelay={0.1}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featuredListings.map((listing) => (
              <MotionCard
                key={listing.id}
                hoverEffect="scale"
                onClick={() => handleListingClick(listing.id)}
                className="overflow-hidden group relative"
              >
                <div className="aspect-w-16 aspect-h-9 h-48 relative overflow-hidden">
                  {listing.car_images && listing.car_images.length > 0 ? (
                    <img
                      src={listing.car_images[0].url}
                      alt={`${listing.brand} ${listing.model}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Car className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Featured badge */}
                  {listing.is_featured && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      <span>Öne Çıkan</span>
                    </div>
                  )}
                  
                  {/* Approved badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Onaylı
                    </span>
                  </div>
                  
                  {/* Favorite Button */}
                  <div className="absolute bottom-2 right-2">
                    <FavoriteButton 
                      listingId={listing.id}
                      userId={user?.id}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
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
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {listing.mileage.toLocaleString()} km • {listing.fuel_type}
                    </span>
                    <motion.span 
                      className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                      whileHover={{ x: 3 }}
                    >
                      <span>Detaylar</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </motion.span>
                  </div>
                </div>
              </MotionCard>
            ))}
          </AnimatedList>
        )}
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-gray-800 dark:text-white"
            >
              Neden Autinoa'yı Seçmelisiniz?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 dark:text-gray-300"
            >
              Autinoa, araç alım satım sürecinizi kolaylaştırmak için tasarlanmış modern bir platformdur. Güvenli, hızlı ve kullanıcı dostu arayüzümüzle araç alım satım deneyiminizi en üst seviyeye çıkarıyoruz.
            </motion.p>
            
            <div className="space-y-4">
              {[
                { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Doğrulanmış satıcılar ve güvenilir ilanlar" },
                { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Detaylı araç bilgileri ve yüksek kaliteli fotoğraflar" },
                { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Kolay ve hızlı ilan verme süreci" },
                { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Güvenli mesajlaşma sistemi" },
                { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: "Araç karşılaştırma ve favorilere ekleme özellikleri" }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  {item.icon}
                  <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                </motion.div>
              ))}
            </div>
            
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/listings')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Car className="w-5 h-5" />
              <span>İlanlara Göz At</span>
            </motion.button>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img 
              src="https://images.pexels.com/photos/3786091/pexels-photo-3786091.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
              alt="Luxury car" 
              className="rounded-xl shadow-xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-lg font-bold text-gray-800 dark:text-white">4.9</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Kullanıcı Memnuniyeti</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Müşteri Yorumları
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Platformumuzdan memnun kalan kullanıcılarımızın deneyimleri
            </p>
          </div>
          
          
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loadingTestimonials ? (
              <div className="col-span-3 flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="col-span-3 text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  Henüz yorum bulunmuyor. İlk yorumu siz yapın!
                </p>
              </div>
            ) : (
              testimonials.map((testimonial) => (
                <motion.div 
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
                >
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <div className="flex items-center space-x-1 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < testimonial.rating ? 'fill-current' : ''}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{testimonial.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 flex-grow">"{testimonial.content}"</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                        {testimonial.user?.profile_image_url ? (
                          <img 
                            src={testimonial.user.profile_image_url} 
                            alt={testimonial.user?.full_name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{testimonial.user?.full_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {testimonial.listing ? `${testimonial.listing.brand} ${testimonial.listing.model} Alıcısı` : 'Kullanıcı'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Popular Brands Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Popüler Markalar
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            En çok tercih edilen araç markaları
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
     {
      name: "BMW",
      logo: "https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg",
      color: "bg-blue-100 dark:bg-blue-900/20",
      description: "Alman lüks otomobil üreticisi"
    },
    {
      name: "Mercedes-Benz",
      logo: "https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg",
      color: "bg-gray-100 dark:bg-gray-900/20",
      description: "Premium segment lider"
    },
     {
      name: "Audi",
      logo: "https://logo.clearbit.com/audi.com",
      color: "bg-red-100 dark:bg-red-900/20",
      description: "Teknoloji ve performans"
    },
    {
      name: "Volkswagen",
      logo: "https://1000logos.net/wp-content/uploads/2021/04/Volkswagen-logo.png",
      color: "bg-blue-100 dark:bg-blue-900/20",
      description: "Alman mühendisliği"
    },
    {
      name: "Toyota",
      logo: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg",
      color: "bg-red-100 dark:bg-red-900/20",
      description: "Güvenilirlik ve kalite"
    },
  {
      name: "Honda",
      logo: "https://logo.clearbit.com/honda.com",
      color: "bg-red-100 dark:bg-red-900/20",
      description: "Yenilikçi teknoloji"
    }
         ].map((brand) => (
    <motion.div
      key={brand.name}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      className={`${brand.color} rounded-2xl p-6 transition-all duration-300 cursor-pointer hover:shadow-xl`}
    >
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl p-4">
                  <motion.img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="h-16 w-auto object-contain filter dark:brightness-200" 
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
                    {brand.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {brand.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
        <div className="container mx-auto px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Aracınızı Hemen Satışa Çıkarın
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Binlerce potansiyel alıcıya ulaşın, aracınızı en iyi fiyata satın.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateListing}
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                {user ? 'Hemen İlan Ver' : 'Giriş Yap ve İlan Ver'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/listings')}
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                İlanları Keşfet
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* App Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Özelliklerimiz
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Autinoa'nın sunduğu benzersiz özellikler
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              icon: <Zap className="w-8 h-8 text-yellow-500" />, 
              title: "Hızlı İlan Verme", 
              description: "Dakikalar içinde aracınızı satışa çıkarın" 
            },
            { 
              icon: <Heart className="w-8 h-8 text-red-500" />, 
              title: "Favori Listesi", 
              description: "Beğendiğiniz araçları kaydedin ve takip edin" 
            },
            { 
              icon: <MessageSquare className="w-8 h-8 text-blue-500" />, 
              title: "Güvenli Mesajlaşma", 
              description: "Satıcılarla doğrudan iletişime geçin" 
            },
            { 
              icon: <Shield className="w-8 h-8 text-green-500" />, 
              title: "Güvenli Ödeme", 
              description: "Güvenli ödeme seçenekleriyle alışveriş yapın" 
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;