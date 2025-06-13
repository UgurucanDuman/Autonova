import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Car, ChevronLeft, ChevronRight, Check, Calendar, Phone, PhoneCall, MapPin, Share2, Plus, Star, Flag, AlertCircle, XCircle, CheckCircle, DollarSign, X, Instagram, Facebook, Twitter, User, FileText } from 'lucide-react';
import { getCarListingById, sendMessage } from '../lib/supabase';
import { CarListing } from '../lib/types';
import { useAuth } from '../components/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ImageGallery } from '../components/ImageGallery';
import { AnimatedContainer } from '../components/AnimatedContainer';
import { AnimatedList } from '../components/AnimatedList';
import { MotionCard } from '../components/MotionCard';
import { ReviewSection } from '../components/ReviewSection';
import { ExchangeRates } from '../components/ExchangeRates';
import { CurrencyConverter } from '../components/CurrencyConverter';
import { FavoriteButton } from '../components/FavoriteButton';
import { VehicleHistoryReport } from '../components/VehicleHistoryReport';
import { VehicleDamageReport } from '../components/VehicleDamageReport';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<CarListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingListing, setReportingListing] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [showSocialShareModal, setShowSocialShareModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sharingSocial, setSharingSocial] = useState(false);
  const [shareResult, setShareResult] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [similarListings, setSimilarListings] = useState<CarListing[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showHistoryReport, setShowHistoryReport] = useState(false);
  const [showDamageReport, setShowDamageReport] = useState(false);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [loadingDamageReports, setLoadingDamageReports] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        if (!id) return;
        const data = await getCarListingById(id);
        setListing(data);
        
        // Fetch seller profile
        if (data && data.user_id) {
          fetchSellerProfile(data.user_id);
          fetchSimilarListings(data);
          fetchDamageReports(data.id);
        }
      } catch (err) {
        setError('İlan yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  // Döviz kurlarını güncellemek için yeni useEffect
  useEffect(() => {
    if (!listing) return;

    // Her 5 dakikada bir döviz kurlarını güncelle
    const updateRates = () => {
      if (exchangeRates) {
        const lastUpdate = new Date(exchangeRates.last_updated).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // Son güncellemeden 5 dakika geçtiyse ExchangeRates bileşenini yeniden render et
        if (now - lastUpdate > fiveMinutes) {
          setExchangeRates(null); // Bu, ExchangeRates bileşeninin yeniden render olmasını sağlar
        }
      }
    };

    const intervalId = setInterval(updateRates, 60000); // Her dakika kontrol et

    return () => clearInterval(intervalId);
  }, [listing, exchangeRates]);

  // Fetch seller profile
  const fetchSellerProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setSellerProfile(data);
      } else {
        setSellerProfile(null);
        console.log('Seller profile not found');
      }
    } catch (err) {
      console.error('Error fetching seller profile:', err);
      toast.error('Satıcı profili yüklenemedi');
    }
  };

  // Fetch similar listings
  const fetchSimilarListings = async (currentListing: CarListing) => {
    setLoadingSimilar(true);
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
        .eq('brand', currentListing.brand)
        .eq('status', 'approved')
        .neq('id', currentListing.id)
        .limit(3);
        
      if (error) throw error;
      
      setSimilarListings(data || []);
    } catch (err) {
      console.error('Error fetching similar listings:', err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Fetch damage reports
  const fetchDamageReports = async (listingId: string) => {
    setLoadingDamageReports(true);
    try {
      const { data, error } = await supabase
        .from('damage_reports')
        .select(`
          *,
          damage_images (
            id,
            url
          )
        `)
        .eq('listing_id', listingId)
        .eq('status', 'approved');
        
      if (error) throw error;
      
      setDamageReports(data || []);
    } catch (err) {
      console.error('Error fetching damage reports:', err);
    } finally {
      setLoadingDamageReports(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listing || !messageContent.trim()) return;

    setSendingMessage(true);
    try {
      // Check if user is blocked
      if (user && sellerProfile) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_blocked, block_end_date')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;
        
        if (userData.is_blocked) {
          const blockEndDate = userData.block_end_date ? new Date(userData.block_end_date) : null;
          const now = new Date();
          
          if (!blockEndDate || blockEndDate > now) {
            throw new Error('Hesabınız engellenmiştir. Mesaj gönderemezsiniz.');
          }
        }
      }

      await sendMessage({
        sender_id: user.id,
        receiver_id: listing.user_id,
        listing_id: listing.id,
        content: messageContent.trim()
      });
      
      setMessageContent('');
      setShowMessageModal(false);
      toast.success('Mesaj gönderildi');
      navigate('/messages');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      toast.error(err.message || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReportListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listing || !reportReason.trim()) return;

    setReportingListing(true);
    try {
      const { error } = await supabase
        .from('listing_reports')
        .insert({
          listing_id: listing.id,
          reporter_id: user.id,
          reason: reportReason.trim(),
          details: 'Kullanıcı tarafından raporlandı',
          status: 'pending'
        });

      if (error) throw error;

      setReportReason('');
      setShowReportModal(false);
      toast.success('İlan başarıyla raporlandı. Yöneticiler en kısa sürede inceleyecektir.');
    } catch (err) {
      setError('İlan raporlanamadı. Lütfen tekrar deneyin.');
      toast.error('İlan raporlanamadı');
    } finally {
      setReportingListing(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappNumber = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone}`;
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const handleSocialShare = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Lütfen en az bir platform seçin');
      return;
    }

    setSharingSocial(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-share`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            listingId: listing?.id,
            platforms: selectedPlatforms
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        throw new Error(errorData.error || 'Paylaşım talebi gönderilemedi');
      }

      const result = await response.json();
      setShareResult(result);
      toast.success('Paylaşım talebi gönderildi');
    } catch (err: any) {
      console.error('Error sending social share request:', err);
      toast.error(err.message || 'Paylaşım talebi gönderilemedi');
    } finally {
      setSharingSocial(false);
    }
  };

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

  // Function to get currency symbol
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY':
      default: return '₺';
    }
  };

  // Function to get currency name
  const getCurrencyName = (currency: string) => {
    switch (currency) {
      case 'USD': return 'Dolar';
      case 'EUR': return 'Euro';
      case 'GBP': return 'Sterlin';
      case 'TRY':
      default: return 'TL';
    }
  };

  const getStatusBadge = () => {
    switch (listing?.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylı İlan
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedilmiş İlan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Onay Bekliyor
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
        {error || 'İlan bulunamadı.'}
      </div>
    );
  }

  const membershipDuration = listing.users?.created_at 
    ? formatDistanceToNow(new Date(listing.users.created_at), { 
        addSuffix: true,
        locale: tr 
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Image Gallery */}
      <AnimatedContainer animation="fadeIn" className="card p-4 relative">
        {/* Favorite Button - Moved to top-6 left-6 to avoid overlap */}
        <div className="absolute top-6 left-6 z-10">
          <FavoriteButton 
            listingId={listing.id}
            userId={user?.id}
            size="lg"
          />
        </div>
        
        {listing.car_images && listing.car_images.length > 0 ? (
          <ImageGallery 
            images={listing.car_images.map(img => img.url)} 
            alt={`${listing.brand} ${listing.model}`}
          />
        ) : (
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Car className="w-20 h-20 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </AnimatedContainer>

      {/* Listing Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Basic Info */}
          <MotionCard className="p-4 sm:p-6" hoverEffect="none">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 break-words">
                {listing.brand} {listing.model} {listing.year}
              </h1>
              <div className="flex space-x-2">
                {listing.is_featured && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    <Star className="w-3 h-3 mr-1" />
                    Öne Çıkan
                  </span>
                )}
                {getStatusBadge()}
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {getCurrencySymbol(listing.currency || 'TRY')}{listing.price.toLocaleString()} {listing.currency !== 'TRY' ? getCurrencyName(listing.currency || 'TRY') : ''}
            </p>
            
            {/* Exchange Rate Component */}
            <ExchangeRates onRatesChange={setExchangeRates} />
            
            {/* Currency Converter */}
            {exchangeRates && listing.currency && (
              <CurrencyConverter 
                rates={exchangeRates.rates}
                fromCurrency={listing.currency}
                amount={listing.price}
                className="mt-2"
              />
            )}
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kilometre</p>
                <p className="font-semibold text-gray-800 dark:text-white">{listing.mileage.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Yakıt Tipi</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.fuel_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vites</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.transmission}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Renk</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.color}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kasa Tipi</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.body_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Motor Hacmi</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.engine_size || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Motor Gücü</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.power || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kapı Sayısı</p>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{listing.doors || '-'}</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowHistoryReport(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="w-5 h-5" />
                <span>Araç Geçmişi Raporu</span>
              </button>
              
              <button
                onClick={() => setShowDamageReport(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Car className="w-5 h-5" />
                <span>Hasar Raporu Oluştur</span>
              </button>
            </div>
            
            {listing.status === 'rejected' && listing.moderation_reason && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">İlan Reddedildi</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Sebep: {listing.moderation_reason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </MotionCard>

          {/* Damage Reports */}
          {damageReports.length > 0 && (
            <MotionCard className="p-4 sm:p-6" hoverEffect="none">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <Car className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                Hasar Raporları
              </h2>
              
              <div className="space-y-4">
                {damageReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-white">
                          {report.location}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(report.incident_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.damage_type === 'minor' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : report.damage_type === 'moderate'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {report.damage_type === 'minor' 
                          ? 'Hafif Hasar' 
                          : report.damage_type === 'moderate' 
                            ? 'Orta Hasar' 
                            : 'Ağır Hasar'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {report.description}
                    </p>
                    
                    {report.damage_images && report.damage_images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {report.damage_images.slice(0, 3).map((image: any) => (
                          <a 
                            key={image.id} 
                            href={image.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img 
                              src={image.url} 
                              alt="Hasar Fotoğrafı" 
                              className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                        {report.damage_images.length > 3 && (
                          <div className="relative">
                            <img 
                              src={report.damage_images[3].url} 
                              alt="Hasar Fotoğrafı" 
                              className="w-full h-20 object-cover rounded-lg opacity-70"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                              <span className="text-white font-medium">+{report.damage_images.length - 3}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </MotionCard>
          )}

          {/* Features */}
          {listing.features && listing.features.length > 0 && (
            <MotionCard className="p-4 sm:p-6" hoverEffect="none">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4">Özellikler</h2>
              <AnimatedList 
                animation="fadeIn" 
                staggerDelay={0.05}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {listing.features.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                  >
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm break-words">{feature}</span>
                  </div>
                ))}
              </AnimatedList>
            </MotionCard>
          )}

          {/* Description */}
          <MotionCard className="p-4 sm:p-6" hoverEffect="none">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4">Açıklama</h2>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line break-words">{listing.description}</p>
          </MotionCard>

          {/* Location */}
          <MotionCard className="p-4 sm:p-6" hoverEffect="none">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Konum</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 break-words">{listing.location}</p>
          </MotionCard>

          {/* Reviews Section */}
          <ReviewSection 
            listingId={listing.id}
            sellerId={listing.user_id}
            className="mt-8"
          />
        </div>

        {/* Contact Section */}
        <div className="space-y-4">
          <MotionCard className="p-4 sm:p-6" hoverEffect="none">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4">Satıcı ile İletişim</h2>
            
            {/* Seller Profile */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {sellerProfile?.profile_image_url ? (
                  <img 
                    src={sellerProfile.profile_image_url} 
                    alt={sellerProfile.full_name || 'Satıcı'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  {sellerProfile?.full_name || listing.users?.full_name || 'Satıcı'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sellerProfile?.is_corporate ? 'Kurumsal Satıcı' : 'Bireysel Satıcı'}
                </p>
              </div>
            </div>
            
            {listing.users?.phone && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span className="break-words">{listing.users.phone}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleWhatsApp(listing.users.phone!)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PhoneCall className="w-5 h-5 flex-shrink-0" />
                  <span>WhatsApp ile İletişime Geç</span>
                </motion.button>
              </div>
            )}
            {membershipDuration && (
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 mb-4">
                <Calendar className="w-5 h-5 flex-shrink-0" />
                <span className="break-words">Üyelik: {membershipDuration}</span>
              </div>
            )}
            {user ? (
              user.id !== listing.user_id ? (
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowMessageModal(true)}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Mesaj Gönder</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowReportModal(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Flag className="w-5 h-5" />
                    <span>İlanı Raporla</span>
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-300">Bu ilan size ait.</p>
                  
                  {/* Social Media Share Button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowSocialShareModal(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Sosyal Medyada Paylaşım Talebi</span>
                  </motion.button>
                </div>
              )
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login', { 
                  state: { 
                    message: 'Mesaj göndermek için lütfen giriş yapın.',
                    returnTo: `/listings/${id}`
                  }
                })}
                className="w-full btn-primary"
              >
                Mesaj göndermek için giriş yapın
              </motion.button>
            )}
          </MotionCard>

          {/* Additional Info */}
          <MotionCard className="p-4 sm:p-6 space-y-3" hoverEffect="none">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4">Ek Bilgiler</h2>
            {listing.warranty && (
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="break-words">Garantili</span>
              </div>
            )}
            {listing.negotiable && (
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="break-words">Pazarlık Payı Var</span>
              </div>
            )}
            {listing.exchange && (
              <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="break-words">Takas Yapılır</span>
              </div>
            )}
          </MotionCard>
        </div>
      </div>

      {/* Similar Listings */}
      {similarListings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Benzer İlanlar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similarListings.map((similar) => (
              <MotionCard
                key={similar.id}
                hoverEffect="scale"
                onClick={() => navigate(`/listings/${similar.id}`)}
                className="overflow-hidden group relative"
              >
                <div className="aspect-w-16 aspect-h-9 h-40 relative">
                  {similar.car_images && similar.car_images.length > 0 ? (
                    <img
                      src={similar.car_images[0].url}
                      alt={`${similar.brand} ${similar.model}`}
                      className="w-full h-full object-cover rounded-t-xl group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-t-xl flex items-center justify-center">
                      <Car className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  
                  {/* Favorite Button - Positioned in top-left */}
                  <div className="absolute top-2 left-2">
                    <FavoriteButton 
                      listingId={similar.id}
                      userId={user?.id}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-800 dark:text-white">
                    {similar.brand} {similar.model} {similar.year}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {similar.mileage.toLocaleString()} km • {similar.fuel_type}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                    ₺{similar.price.toLocaleString()}
                  </p>
                </div>
              </MotionCard>
            ))}
          </div>
        </div>
      )}

      {/* Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full"
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Satıcıya Mesaj Gönder
              </h3>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="w-full h-32 px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <div className="flex justify-end space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowMessageModal(false)}
                    className="btn-secondary"
                  >
                    İptal
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={sendingMessage || !messageContent.trim()}
                    className="btn-primary"
                  >
                    {sendingMessage ? 'Gönderiliyor...' : 'Gönder'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full"
            >
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                İlanı Raporla
              </h3>
              <form onSubmit={handleReportListing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rapor Sebebi
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="İlanı neden raporlamak istediğinizi açıklayın..."
                    className="w-full h-32 px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="btn-secondary"
                  >
                    İptal
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={reportingListing || !reportReason.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    {reportingListing ? 'Raporlanıyor...' : 'Raporla'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Social Media Share Modal */}
      <AnimatePresence>
        {showSocialShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Sosyal Medyada Paylaşım Talebi
                </h3>
                <button 
                  onClick={() => {
                    setShowSocialShareModal(false);
                    setShareResult(null);
                    setSelectedPlatforms([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {shareResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                  </div>
                  
                  <h4 className="text-center text-xl font-semibold text-gray-900 dark:text-white">
                    Paylaşım Talebi Gönderildi
                  </h4>
                  
                  <p className="text-center text-gray-600 dark:text-gray-300">
                    İlanınız seçtiğiniz platformlarda admin tarafından paylaşılacaktır. Bu işlem biraz zaman alabilir.
                  </p>
                  
                  <div className="space-y-2">
                    {selectedPlatforms.map((platform) => (
                      <div 
                        key={platform}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-center space-x-3">
                          {platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
                          {platform === 'facebook' && <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          {platform === 'twitter' && <Twitter className="w-5 h-5 text-blue-400 dark:text-blue-300" />}
                          <span className="text-gray-700 dark:text-gray-300">
                            {platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : 'Twitter'}
                          </span>
                        </div>
                        
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowSocialShareModal(false);
                      setShareResult(null);
                      setSelectedPlatforms([]);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    İlanınızın paylaşılmasını istediğiniz platformları seçin:
                  </p>
                  
                  <div className="space-y-3">
                    {/* Instagram */}
                    <div 
                      onClick={() => handleTogglePlatform('instagram')}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedPlatforms.includes('instagram') 
                          ? 'bg-pink-100 dark:bg-pink-900/20 border-2 border-pink-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/20">
                          <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Instagram
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatforms.includes('instagram') 
                          ? 'bg-pink-500 border-pink-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedPlatforms.includes('instagram') && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Facebook */}
                    <div 
                      onClick={() => handleTogglePlatform('facebook')}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedPlatforms.includes('facebook') 
                          ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                          <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Facebook
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatforms.includes('facebook') 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedPlatforms.includes('facebook') && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Twitter */}
                    <div 
                      onClick={() => handleTogglePlatform('twitter')}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedPlatforms.includes('twitter') 
                          ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                          <Twitter className="w-5 h-5 text-blue-400 dark:text-blue-300" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Twitter
                        </span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlatforms.includes('twitter') 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedPlatforms.includes('twitter') && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          İlanınız admin tarafından seçtiğiniz platformlarda paylaşılacaktır. Bu süreç manuel olarak gerçekleştirildiği için biraz zaman alabilir.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setShowSocialShareModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSocialShare}
                      disabled={sharingSocial || selectedPlatforms.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      {sharingSocial ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>İşleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Talep Gönder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vehicle History Report Modal */}
      <VehicleHistoryReport
        isOpen={showHistoryReport}
        onClose={() => setShowHistoryReport(false)}
        vehicleInfo={{
          brand: listing.brand,
          model: listing.model,
          year: listing.year
        }}
      />

      {/* Vehicle Damage Report Modal */}
      <VehicleDamageReport
        isOpen={showDamageReport}
        onClose={() => setShowDamageReport(false)}
        listingId={listing.id}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default ListingDetail;