import React, { useState, useEffect } from 'react';
import { User, Car, MessageSquare, Settings, Trash2, X, AlertCircle, Phone, Mail, Calendar, Edit, Lock, Building2, Plus, CreditCard, Flag, CheckCircle, XCircle, Ban, DollarSign } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { getUserProfile, updateUserProfile, getUserListings, deleteCarListing, deleteAccount, getMessages } from '../lib/supabase';
import { supabase, formatError } from '../lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { VerificationDialog } from '../components/VerificationDialog';
import { PasswordDialog } from '../components/PasswordDialog';
import { Message } from '../lib/types';
import { PhoneInput } from '../components/PhoneInput';
import { ProfileForm } from '../components/ProfileForm';
import { PurchaseListingDialog } from '../components/PurchaseListingDialog';
import { ListingLimitInfo } from '../components/ListingLimitInfo';
import { ProfileImageUploader } from '../components/ProfileImageUploader';

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [listingLimitInfo, setListingLimitInfo] = useState<any>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [listingReports, setListingReports] = useState<any[]>([]);
  const [adminReports, setAdminReports] = useState<any[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
      fetchExchangeRates();
    }
  }, [user]);

  const fetchExchangeRates = async () => {
    try {
      // In a real app, you would fetch from an API like:
      // const response = await fetch('https://api.exchangerate-api.com/v4/latest/TRY');
      // const data = await response.json();
      
      // For demo purposes, we'll use hardcoded rates
      setExchangeRates({
        rates: {
          TRY: 1,
          USD: 0.031, // 1 TRY = 0.031 USD
          EUR: 0.029, // 1 TRY = 0.029 EUR
          GBP: 0.025  // 1 TRY = 0.025 GBP
        },
        last_updated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
    }
  };

  const fetchProfileData = async () => {
    if (!user?.id) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        // If the user doesn't exist in the database, create a new profile
        const newProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          role: 'user',
          listing_limit: 1,
          created_at: new Date().toISOString()
        };
        
        const { data: insertedProfile, error: insertError } = await supabase
          .from('users')
          .insert([newProfile])
          .select()
          .maybeSingle();
          
        if (insertError) throw insertError;
        if (!insertedProfile) throw new Error('Failed to create user profile');
        
        setProfile(insertedProfile);
        setEditForm({
          full_name: insertedProfile.full_name || '',
          phone: insertedProfile.phone || '',
        });
        setProfileImageUrl(insertedProfile.profile_image_url);
      } else {
        setProfile(profileData);
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
        });
        setProfileImageUrl(profileData.profile_image_url);
      }

      const [listingsData, messagesData] = await Promise.all([
        getUserListings(user.id),
        getMessages(user.id)
      ]);
      
      setListings(listingsData || []);
      setMessages(messagesData || []);

      // Get listing limit info with corrected parameter name
      const { data: limitData, error: limitError } = await supabase.rpc('check_listing_limit', {
        p_user_id: user.id
      });
      
      if (limitError) throw limitError;
      
      setListingLimitInfo(limitData);

      // Fetch listing reports for this user's listings
      const { data: reportsData, error: reportsError } = await supabase
        .from('listing_reports')
        .select(`
          *,
          car_listings!inner (
            id,
            brand,
            model,
            year
          )
        `)
        .eq('car_listings.user_id', user.id);

      if (!reportsError) {
        setListingReports(reportsData || []);
      }

      // Fetch admin reports for this user's listings
      const { data: adminReportsData, error: adminReportsError } = await supabase
        .from('admin_reports')
        .select(`
          *,
          car_listings!inner (
            id,
            brand,
            model,
            year
          )
        `)
        .eq('car_listings.user_id', user.id);

      if (!adminReportsError) {
        setAdminReports(adminReportsData || []);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(formatError(err));
      toast.error('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setError('');

    try {
      const updatedProfile = await updateUserProfile(user.id, editForm);
      setProfile(updatedProfile);
      setIsEditing(false);
      toast.success('Profil başarıyla güncellendi');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Profil güncellenirken bir hata oluştu.');
      toast.error('Profil güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailVerified = (newEmail: string) => {
    setProfile(prev => ({ ...prev, email: newEmail }));
  };

  const handlePhoneVerified = (newPhone: string) => {
    setProfile(prev => ({ ...prev, phone: newPhone }));
    setEditForm(prev => ({ ...prev, phone: newPhone }));
  };

  const handleDeleteListing = async (listingId: string) => {
    if (deleting || !user?.id) return;
    setDeleting(listingId);
    setError('');

    try {
      await deleteCarListing(listingId);
      const listingsData = await getUserListings(user.id);
      setListings(listingsData);
      
      // Refresh listing limit info with corrected parameter name
      const { data: limitData } = await supabase.rpc('check_listing_limit', {
        p_user_id: user.id
      });
      
      if (limitData) {
        setListingLimitInfo(limitData);
      }
      
      toast.success('İlan başarıyla silindi');
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError('İlan silinirken bir hata oluştu.');
      toast.error('İlan silinirken bir hata oluştu');
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setError('');
      setAccountDeleting(true);
      
      const result = await deleteAccount();
      
      if (result.success) {
        await signOut();
        navigate('/login');
        toast.success('Hesabınız başarıyla silindi');
      } else {
        throw new Error(result.error || 'Hesap silme işlemi başarısız oldu');
      }
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Hesap silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      toast.error(err.message || 'Hesap silinirken bir hata oluştu');
    } finally {
      setAccountDeleting(false);
      setShowDeleteConfirm(null);
    }
  };

  const handlePurchaseComplete = () => {
    fetchProfileData();
  };

  const handleProfileImageUploaded = (url: string) => {
    setProfileImageUrl(url);
    setProfile(prev => ({ ...prev, profile_image_url: url }));
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-300">Yükleniyor...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-300">
        Profil bulunamadı.
      </div>
    );
  }

  const membershipDuration = formatDistanceToNow(new Date(profile.created_at), {
    addSuffix: true,
    locale: tr
  });

  // Kullanıcı engellenmiş mi kontrol et
  const isUserBlocked = profile.is_blocked;
  const blockEndDate = profile.block_end_date ? new Date(profile.block_end_date) : null;
  const now = new Date();
  const isBlockActive = isUserBlocked && (!blockEndDate || blockEndDate > now);
  
  // Engel kalan süresini hesapla
  const getRemainingBlockTime = () => {
    if (!isUserBlocked || !blockEndDate) return null;
    
    if (blockEndDate <= now) {
      return 'Engel süresi doldu';
    }
    
    const diffTime = Math.abs(blockEndDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} gün kaldı`;
  };

  // Tüm raporları birleştir (kullanıcı raporları ve admin raporları)
  const allReports = [...listingReports, ...adminReports];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0"
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Engelleme Uyarısı */}
      {isBlockActive && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Ban className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-300">Hesabınız Engellenmiştir</h3>
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                Sebep: {profile.block_reason || 'Belirtilmemiş'}
              </p>
              {blockEndDate && (
                <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                  Kalan süre: {getRemainingBlockTime()}
                </p>
              )}
              <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                Engelleme süresince ilan veremez ve mesaj gönderemezsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <ProfileImageUploader 
              userId={user.id}
              currentImageUrl={profileImageUrl}
              onImageUploaded={handleProfileImageUploaded}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <ProfileForm
                  profile={profile}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSubmit={handleEditSubmit}
                  saving={saving}
                  onEmailClick={() => setShowEmailDialog(true)}
                  onPasswordClick={() => setShowPasswordDialog(true)}
                />
              ) : (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white truncate">
                    {profile.full_name}
                  </h1>
                  <div className="space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{profile.phone || 'Telefon numarası eklenmemiş'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Üyelik: {membershipDuration}</span>
                    </div>
                    
                    {/* Corporate Information */}
                    {profile.is_corporate && (
                      <>
                        <div className="pt-2 mt-2 border-t dark:border-gray-700">
                          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-medium">
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <span>Kurumsal Hesap Bilgileri</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Firma Adı:</span>
                          <span>{profile.company_name || '-'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Vergi Numarası:</span>
                          <span>{profile.tax_number || '-'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Sicil Numarası:</span>
                          <span>{profile.registration_number || '-'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Onay Durumu:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            profile.approval_status === 'approved' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : profile.approval_status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {profile.approval_status === 'approved' 
                              ? 'Onaylandı' 
                              : profile.approval_status === 'rejected'
                                ? 'Reddedildi'
                                : 'Beklemede'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Düzenle</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm('account')}
                className="btn-secondary text-red-600 dark:text-red-400 flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hesabı Sil</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Listing Limit Info */}
      {listingLimitInfo && (
        <ListingLimitInfo 
          listingLimitInfo={listingLimitInfo}
          onPurchaseClick={() => setShowPurchaseDialog(true)}
          isBlocked={isBlockActive}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md"
        >
          <div className="flex items-center space-x-3">
            <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">İlanlarım</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{listings.length}</p>
              {listingLimitInfo && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Limit: {listingLimitInfo.current_count} / {listingLimitInfo.max_limit}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md cursor-pointer"
          onClick={() => navigate('/messages')}
        >
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Mesajlar</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{messages.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md cursor-pointer"
          onClick={() => setShowReportsModal(true)}
        >
          <div className="flex items-center space-x-3">
            <Flag className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Raporlar</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{allReports.length}</p>
              {allReports.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  İlanlarınızla ilgili raporlar
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* My Listings */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">İlanlarım</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>İlan Hakkı Satın Al</span>
            </button>
            <button
              onClick={() => navigate('/create-listing')}
              disabled={(!listingLimitInfo?.can_create || isBlockActive)}
              className={`btn-primary flex items-center space-x-2 ${
                (!listingLimitInfo?.can_create || isBlockActive) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={isBlockActive ? 'Engellendiğiniz için düzenleyemezsiniz' : ''}
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İlan Ekle</span>
            </button>
          </div>
        </div>

        {isBlockActive && (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-300">
              <strong>Hesabınız engellenmiştir!</strong> Engelleme süresi boyunca yeni ilan oluşturamazsınız.
              {blockEndDate && (
                <span className="block mt-1">
                  Engel bitiş tarihi: {format(blockEndDate, 'dd.MM.yyyy', { locale: tr })} ({getRemainingBlockTime()})
                </span>
              )}
            </p>
          </div>
        )}
        
        {!isBlockActive && listingLimitInfo && !listingLimitInfo.can_create && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-yellow-700 dark:text-yellow-300">
              <strong>İlan limitine ulaştınız!</strong> Bireysel kullanıcılar en fazla {listingLimitInfo.max_limit} ilan oluşturabilir. 
              Yeni ilan eklemek için mevcut ilanlarınızdan birini silmeniz veya ek ilan hakkı satın almanız gerekmektedir.
            </p>
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>İlan Hakkı Satın Al</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((listing, index) => (
            <motion.div 
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
            >
              <div 
                className="aspect-w-16 aspect-h-9 h-48 cursor-pointer relative"
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
                
                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(listing.status)}
                </div>
                
                {/* Featured badge */}
                {listing.is_featured && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                    Öne Çıkan
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {listing.brand} {listing.model} {listing.year}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {listing.mileage.toLocaleString()} km • {listing.fuel_type}
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {getCurrencySymbol(listing.currency || 'TRY')}{listing.price.toLocaleString()} {listing.currency !== 'TRY' ? getCurrencyName(listing.currency || 'TRY') : ''}
                </p>
                
                {/* Exchange Rate Info */}
                {listing.currency !== 'TRY' && exchangeRates && (
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span>
                      Yaklaşık: ₺{(listing.price * (1 / exchangeRates.rates[listing.currency])).toLocaleString()} TL
                    </span>
                  </div>
                )}
                
                {/* Rejection reason */}
                {listing.status === 'rejected' && listing.moderation_reason && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <span className="font-medium">Red sebebi:</span> {listing.moderation_reason}
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/listings/${listing.id}/edit`)}
                    disabled={isBlockActive}
                    className={`btn-primary flex items-center space-x-2 ${
                      isBlockActive ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={isBlockActive ? 'Engellendiğiniz için düzenleyemezsiniz' : ''}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Düzenle</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(listing.id)}
                    className="btn-secondary text-red-600 dark:text-red-400 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {listings.length === 0 && (
            <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
              Henüz ilan oluşturmadınız.
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-xl font-semibold">
                    {showDeleteConfirm === 'account' ? 'Hesabı Sil' : 'İlanı Sil'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {showDeleteConfirm === 'account'
                  ? 'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.'
                  : 'Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm === 'account') {
                      handleDeleteAccount();
                    } else {
                      handleDeleteListing(showDeleteConfirm);
                    }
                  }}
                  disabled={deleting === showDeleteConfirm || accountDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  {deleting === showDeleteConfirm || accountDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Flag className="w-6 h-6 mr-2 text-orange-500" />
                İlan Raporları
              </h3>
              <button 
                onClick={() => setShowReportsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {allReports.length === 0 ? (
              <div className="text-center py-12">
                <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  İlanlarınızla ilgili henüz rapor bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allReports.map((report) => (
                  <div 
                    key={report.id}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {report.car_listings.brand} {report.car_listings.model} {report.car_listings.year}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Rapor Tarihi: {format(new Date(report.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        report.status === 'resolved' || report.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : report.status === 'dismissed' || report.status === 'rejected'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {report.status === 'resolved' || report.status === 'approved'
                          ? 'Çözüldü' 
                          : report.status === 'dismissed' || report.status === 'rejected'
                            ? 'Reddedildi'
                            : 'Beklemede'}
                      </span>
                    </div>
                    
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Rapor Sebebi:</span> {report.reason}
                      </p>
                      {report.details && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Detaylar:</span> {report.details}
                        </p>
                      )}
                    </div>
                    
                    {(report.status === 'resolved' || report.status === 'approved') && report.resolved_at && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Çözüm Tarihi: {format(new Date(report.resolved_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <button
                        onClick={() => navigate(`/listings/${report.car_listings.id}`)}
                        className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        İlanı Görüntüle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowReportsModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Verification Dialogs */}
      <VerificationDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        type="email"
        currentValue={profile.email}
        onVerified={handleEmailVerified}
      />

      <VerificationDialog
        isOpen={showPhoneDialog}
        onClose={() => setShowPhoneDialog(false)}
        type="phone"
        currentValue={profile.phone}
        onVerified={handlePhoneVerified}
      />

      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />

      {/* Purchase Listing Dialog */}
      <PurchaseListingDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onPurchaseComplete={handlePurchaseComplete}
        userId={user.id}
      />
    </motion.div>
  );
};

export default Profile;