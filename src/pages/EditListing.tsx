import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { getCarListingById, updateCarListing } from '../lib/supabase';
import { uploadCarImage } from '../lib/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, AlertCircle, DollarSign, Info, Camera, Check, X, ChevronDown } from 'lucide-react';
import { CarListing } from '../lib/types';
import { supabase } from '../lib/supabase';
import { ExchangeRates } from '../components/ExchangeRates';
import { MultiFileUploader } from '../components/MultiFileUploader';
import { ImageUploadPreview } from '../components/ImageUploadPreview';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const MAX_FILES = 16;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listing, setListing] = useState<CarListing | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    color: '',
    price: 0,
    currency: 'TRY',
    fuel_type: '',
    transmission: '',
    location: '',
    description: '',
    body_type: '',
    engine_size: '',
    power: '',
    doors: '4',
    condition: 'used',
    features: [] as string[],
    warranty: false,
    negotiable: false,
    exchange: false
  });
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [carModels, setCarModels] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<any>({});

  // Image handling
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  // Engine size options
  const engineSizeOptions = [
    { value: '', label: 'Seçiniz' },
    { value: '1.0', label: '1.0L' },
    { value: '1.2', label: '1.2L' },
    { value: '1.3', label: '1.3L' },
    { value: '1.4', label: '1.4L' },
    { value: '1.5', label: '1.5L' },
    { value: '1.6', label: '1.6L' },
    { value: '1.8', label: '1.8L' },
    { value: '2.0', label: '2.0L' },
    { value: '2.2', label: '2.2L' },
    { value: '2.4', label: '2.4L' },
    { value: '2.5', label: '2.5L' },
    { value: '2.7', label: '2.7L' },
    { value: '3.0', label: '3.0L' },
    { value: '3.5', label: '3.5L' },
    { value: '4.0', label: '4.0L' },
    { value: '4.5', label: '4.5L' },
    { value: '5.0', label: '5.0L' },
    { value: 'Elektrikli', label: 'Elektrikli' },
  ];

  // Engine power options
  const enginePowerOptions = [
    { value: '', label: 'Seçiniz' },
    { value: '75 HP', label: '75 HP' },
    { value: '90 HP', label: '90 HP' },
    { value: '105 HP', label: '105 HP' },
    { value: '120 HP', label: '120 HP' },
    { value: '136 HP', label: '136 HP' },
    { value: '150 HP', label: '150 HP' },
    { value: '170 HP', label: '170 HP' },
    { value: '190 HP', label: '190 HP' },
    { value: '210 HP', label: '210 HP' },
    { value: '230 HP', label: '230 HP' },
    { value: '250 HP', label: '250 HP' },
    { value: '270 HP', label: '270 HP' },
    { value: '300 HP', label: '300 HP' },
    { value: '330 HP', label: '330 HP' },
    { value: '360 HP', label: '360 HP' },
    { value: '400 HP', label: '400 HP' },
    { value: '450 HP', label: '450 HP' },
    { value: '500+ HP', label: '500+ HP' },
  ];

  // Predefined color options
  const colorOptions = [
    { value: 'Beyaz', label: 'Beyaz', color: '#FFFFFF', textColor: '#000000' },
    { value: 'Siyah', label: 'Siyah', color: '#000000', textColor: '#FFFFFF' },
    { value: 'Gri', label: 'Gri', color: '#808080', textColor: '#FFFFFF' },
    { value: 'Gümüş', label: 'Gümüş', color: '#C0C0C0', textColor: '#000000' },
    { value: 'Mavi', label: 'Mavi', color: '#0000FF', textColor: '#FFFFFF' },
    { value: 'Kırmızı', label: 'Kırmızı', color: '#FF0000', textColor: '#FFFFFF' },
    { value: 'Yeşil', label: 'Yeşil', color: '#008000', textColor: '#FFFFFF' },
    { value: 'Sarı', label: 'Sarı', color: '#FFFF00', textColor: '#000000' },
    { value: 'Turuncu', label: 'Turuncu', color: '#FFA500', textColor: '#000000' },
    { value: 'Kahverengi', label: 'Kahverengi', color: '#A52A2A', textColor: '#FFFFFF' },
    { value: 'Bordo', label: 'Bordo', color: '#800000', textColor: '#FFFFFF' },
    { value: 'Bej', label: 'Bej', color: '#F5F5DC', textColor: '#000000' },
    { value: 'Mor', label: 'Mor', color: '#800080', textColor: '#FFFFFF' },
    { value: 'Pembe', label: 'Pembe', color: '#FFC0CB', textColor: '#000000' },
    { value: 'Altın', label: 'Altın', color: '#FFD700', textColor: '#000000' },
    { value: 'Bronz', label: 'Bronz', color: '#CD7F32', textColor: '#FFFFFF' },
  ];
  
  const carFeatures = [
    'ABS', 'Klima', 'Hız Sabitleyici', 'Yokuş Kalkış Desteği', 'ESP',
    'Şerit Takip Sistemi', 'Geri Görüş Kamerası', 'Park Sensörü',
    'Deri Döşeme', 'Elektrikli Ayna', 'Elektrikli Cam', 'Merkezi Kilit',
    'Yağmur Sensörü', 'Far Sensörü', 'Start/Stop', 'Sunroof',
    'Navigasyon', 'Bluetooth', 'USB', 'Aux', 'Adaptive Cruise Control',
    'Çarpışma Önleyici Sistem', 'Otomatik Park Sistemi', 'Head-Up Display',
    'Harman Kardon Ses Sistemi', 'Android Auto', 'Apple CarPlay',
    'Isıtmalı Koltuklar', 'Havalandırmalı Koltuklar', 'Elektrikli Koltuklar',
    'Masajlı Koltuklar', 'Kablosuz Şarj Ünitesi', '360 Derece Kamera',
    'Otomatik Uzun Far Asistanı', 'Akıllı Şerit Değiştirme Sistemi'
];

  
  const carBrands = [
    'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Citroen', 'Dacia', 'Daewoo', 'Fiat',
    'Ford', 'GAZ', 'Geely', 'Genesis', 'Great Wall Motors', 'Honda', 'Hongqi', 'Hyundai', 'Jaguar',
    'Kia', 'Lada', 'Land Rover', 'Li Auto', 'Mercedes', 'Mini', 'Moskvitch', 'Nissan', 'Nio', 'Opel',
    'Peugeot', 'Porsche', 'Renault', 'Saab', 'Seat', 'Skoda', 'SsangYong', 'TOGG', 'Toyota',
    'Trumpchi', 'UAZ', 'Volkswagen', 'Volvo', 'XPeng', 'Zeekr', 'Ferrari'
  ];

  const bodyTypes = [
    'Sedan', 'Hatchback', 'Station Wagon', 'SUV', 'Crossover',
    'Coupe', 'Convertible', 'Van', 'Pickup'
  ];

  const conditions = [
    { value: 'new', label: 'Sıfır' },
    { value: 'used', label: 'İkinci El' },
    { value: 'damaged', label: 'Hasarlı' }
  ];

  const currencies = [
    { value: 'TRY', label: '₺ TL', symbol: '₺' },
    { value: 'USD', label: '$ USD', symbol: '$' },
    { value: 'EUR', label: '€ Euro', symbol: '€' },
    { value: 'GBP', label: '£ Sterlin', symbol: '£' }
  ];

  const validateStep1 = () => {
    if (existingImages.length === 0 && newImages.length === 0) {
      setError('En az bir fotoğraf bulunmalıdır.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    const errors: any = {};
    
    if (!formData.brand) errors.brand = 'Marka seçmelisiniz';
    if (!formData.model) errors.model = 'Model seçmelisiniz';
    if (!formData.year) errors.year = 'Yıl girmelisiniz';
    if (!formData.mileage) errors.mileage = 'Kilometre girmelisiniz';
    if (!formData.color) errors.color = 'Renk seçmelisiniz';
    if (!formData.body_type) errors.body_type = 'Kasa tipi seçmelisiniz';
    if (!formData.fuel_type) errors.fuel_type = 'Yakıt tipi seçmelisiniz';
    if (!formData.transmission) errors.transmission = 'Vites tipi seçmelisiniz';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;
    
    switch (activeStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  // Update car models when brand changes
  useEffect(() => {
    if (formData.brand) {
      const models = getCarModels(formData.brand);
      setCarModels(models);
      
      // If current model is not in the new models list, reset it
      if (!models.includes(formData.model)) {
        setFormData(prev => ({ ...prev, model: '' }));
      }
    } else {
      setCarModels([]);
    }
  }, [formData.brand]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.currency-dropdown') && showCurrencyDropdown) {
        setShowCurrencyDropdown(false);
      }
      if (!target.closest('.color-modal') && showColorModal) {
        setShowColorModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCurrencyDropdown, showColorModal]);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchListing = async () => {
      try {
        const data = await getCarListingById(id);
        if (!data) {
          setError('İlan bulunamadı.');
          return;
        }
        
        if (data.user_id !== user.id) {
          setError('Bu ilanı düzenleme yetkiniz yok.');
          return;
        }

        setListing(data);
        setFormData({
          brand: data.brand,
          model: data.model,
          year: data.year,
          mileage: data.mileage,
          color: data.color,
          price: data.price,
          currency: data.currency || 'TRY',
          fuel_type: data.fuel_type,
          transmission: data.transmission,
          location: data.location,
          description: data.description || '',
          body_type: data.body_type,
          engine_size: data.engine_size || '',
          power: data.power || '',
          doors: data.doors || '4',
          condition: data.condition,
          features: data.features || [],
          warranty: data.warranty || false,
          negotiable: data.negotiable || false,
          exchange: data.exchange || false
        });

        // Set car models based on brand
        setCarModels(getCarModels(data.brand));

        // Set existing images
        if (data.car_images && data.car_images.length > 0) {
          setExistingImages(data.car_images.map(img => ({
            id: img.id,
            url: img.url
          })));
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('İlan yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, user]);

  const handleNewImageAdd = (files: File[]) => {
    setNewImages(files);
    
    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    // Revoke any existing preview URLs to prevent memory leaks
    newImagePreviews.forEach(url => URL.revokeObjectURL(url));
    
    setNewImagePreviews(newPreviews);
  };

  const handleRemoveNewImage = (index: number) => {
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(newImagePreviews[index]);
    
    // Remove the image and its preview
    const newImagesArray = [...newImages];
    newImagesArray.splice(index, 1);
    setNewImages(newImagesArray);
    
    const newPreviewsArray = [...newImagePreviews];
    newPreviewsArray.splice(index, 1);
    setNewImagePreviews(newPreviewsArray);
  };

  const handleRemoveExistingImage = (index: number) => {
    const imageToRemove = existingImages[index];
    setImagesToDelete(prev => [...prev, imageToRemove.id]);
    
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setSaving(true);
    setError('');

    try {
      // Clean numeric values before submission
      const cleanedFormData = {
        ...formData,
        price: parseInt(formData.price.toString().replace(/[^\d]/g, ''), 10),
        mileage: parseInt(formData.mileage.toString().replace(/[^\d]/g, ''), 10),
        year: parseInt(formData.year.toString(), 10)
      };

      // Update listing
      await updateCarListing(id, cleanedFormData);

      // Delete images marked for deletion
      if (imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          await supabase
            .from('car_images')
            .delete()
            .eq('id', imageId);
        }
      }

      // Upload new images
      if (newImages.length > 0) {
        for (const file of newImages) {
          // Upload the image
          const result = await uploadCarImage(user.id, id, file);
          
          // Create car_images record
          await supabase
            .from('car_images')
            .insert([{
              listing_id: id,
              url: result.url
            }]);
        }
      }

      toast.success('İlan başarıyla güncellendi');
      navigate(`/listings/${id}`);
    } catch (err) {
      console.error('Error updating listing:', err);
      setError('İlan güncellenirken bir hata oluştu.');
      toast.error('İlan güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else if (name === 'price' || name === 'mileage') {
      // Remove non-numeric characters and format with thousands separator
      const numericValue = value.replace(/[^\d]/g, '');
      const formattedValue = numericValue ? parseInt(numericValue, 10).toLocaleString('tr-TR') : '';
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleCurrencySelect = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      currency
    }));
    setShowCurrencyDropdown(false);
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
    setShowColorModal(false);
  };

  // Function to get car models based on brand
  const getCarModels = (brand: string): string[] => {
    const modelsByBrand: Record<string, string[]> = {
      'TOGG': ['T10X', 'T10F'],
      'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron'],
      'BMW': ['1 Serisi', '2 Serisi', '3 Serisi', '4 Serisi', '5 Serisi', '6 Serisi', '7 Serisi', '8 Serisi', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX', 'i8'],
      'Chevrolet': ['Aveo', 'Captiva', 'Cruze', 'Spark', 'Orlando', 'Camaro', 'Corvette', 'Tahoe', 'Malibu'],
      'Citroen': ['C1', 'C3', 'C4', 'C5', 'Berlingo', 'C-Elysee', 'C4 Cactus'],
      'Dacia': ['Sandero', 'Duster', 'Logan', 'Lodgy', 'Dokker', 'Jogger', 'Dokker Van'],
      'Daewoo': ['Matiz', 'Lanos', 'Nubira', 'Leganza'],
      'Fiat': ['500', 'Panda', 'Tipo', 'Egea', 'Doblo', 'Fiorino', '500L', '500X'],
      'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Kuga', 'Puma', 'EcoSport', 'Mustang', 'Ranger', 'Explorer'],
      'Honda': ['Civic', 'Accord', 'Jazz', 'CR-V', 'HR-V', 'e'],
      'Hyundai': ['i10', 'i20', 'i30', 'Accent', 'Elantra', 'Tucson', 'Santa Fe', 'Kona', 'Ioniq 5', 'Ioniq 6'],
      'Kia': ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Stonic', 'Niro', 'EV6', 'K5', 'K8', 'K9', 'Carnival', 'Seltos', 'Telluride'],
      'Mercedes': ['A-Serisi', 'B-Serisi', 'C-Serisi', 'E-Serisi', 'S-Serisi', 'GLA', 'GLC', 'GLE', 'GLS', 'CLA', 'CLS', 'EQC', 'EQA', 'EQB', 'EQE', 'EQS'],
      'Nissan': ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Navara', 'Ariya'],
      'Opel': ['Corsa', 'Astra', 'Insignia', 'Mokka', 'Crossland', 'Grandland'],
      'Peugeot': ['108', '208', '308', '508', '2008', '3008', '5008'],
      'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Talisman', 'Zoe', 'Symbol', 'Austral'],
      'Seat': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'],
      'Skoda': ['Fabia', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Scala', 'Enyaq'],
      'Toyota': ['Yaris', 'Corolla', 'Camry', 'C-HR', 'RAV4', 'Prius', 'Auris', 'Hilux'],
      'Volkswagen': ['Polo', 'Golf', 'Passat', 'Tiguan', 'T-Roc', 'T-Cross', 'Touareg', 'Arteon', 'ID.3', 'ID.4'],
      'Volvo': ['S60', 'S90', 'V40', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
      'BYD': ['Seagull', 'Dolphin', 'Qin', 'Song', 'Yuan Plus', 'Seal', 'Han', 'Tang', 'Atto 3', 'Sealion 7'],
      'Chery': ['Tiggo 3x', 'Tiggo 5x', 'Tiggo 7', 'Tiggo 8', 'Tiggo 9', 'Omoda 5', 'Omoda E5', 'Arrizo 5', 'Arrizo 8'],
      'Geely': ['Emgrand', 'Binrui', 'Xingyue', 'Boyue', 'Geometry A', 'Geometry C'],
      'Nio': ['ET5', 'ET7', 'ES6', 'ES8', 'EC6', 'EL6'],
      'XPeng': ['P5', 'P7', 'G3', 'G6', 'G9'],
      'Li Auto': ['Li ONE', 'L7', 'L8', 'L9'],
      'Great Wall Motors': ['Haval H6', 'Haval Jolion', 'Tank 300', 'Tank 500', 'Ora Good Cat', 'Ora Ballet Cat'],
      'Zeekr': ['001', '009', 'X'],
      'Trumpchi': ['GS3', 'GS4', 'GS8', 'Emkoo', 'Empow', 'M6', 'M8'],
      'Hongqi': ['H5', 'H6', 'H9', 'E-HS9', 'HS5', 'HS7', 'HQ9'],
      'Lada': ['Granta', 'Vesta', 'Niva Legend', 'Niva Travel', 'Largus'],
      'Moskvitch': ['Moskvitch 3', 'Moskvitch 3e', 'Moskvitch 5', 'Moskvitch 6', 'Moskvitch 8'],
      'GAZ': ['Volga Siber', 'GAZelle Next', 'GAZ M20 Pobeda'],
      'UAZ': ['Patriot', 'Hunter', 'Pickup', 'Profi'],
      'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale'],
      'Jaguar': ['XE', 'XF', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace'],
      'Land Rover': ['Defender', 'Discovery', 'Range Rover Evoque', 'Range Rover Sport'],
      'Mini': ['Cooper', 'Clubman', 'Countryman', 'Electric'],
      'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
      'Saab': ['9-3', '9-5'],
      'Ferrari': ['488', '812 Superfast', 'F8 Tributo', 'SF90 Stradale', 'Roma', 'Portofino', 'LaFerrari', 'California', 'Purosangue'],
      'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
      'SsangYong': ['Tivoli', 'Korando', 'Rexton', 'Musso', 'Torres', 'Torres EVX']
    };
    return modelsByBrand[brand] || [];
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8 px-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                activeStep === step 
                  ? 'bg-blue-600 text-white' 
                  : activeStep > step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {activeStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            <span className={`mt-2 text-sm ${
              activeStep === step 
                ? 'text-blue-600 dark:text-blue-400 font-medium' 
                : activeStep > step 
                  ? 'text-green-500 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
            }`}>
              {step === 1 ? 'Fotoğraflar' : step === 2 ? 'Araç Bilgileri' : 'Detaylar'}
            </span>
          </div>
        ))}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
        {error || 'İlan bulunamadı.'}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <ExchangeRates onRatesChange={setExchangeRates} />
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">İlanı Düzenle</h1>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative mb-8">
          {renderStepIndicator()}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Images */}
          {activeStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-start mb-4">
                  <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Araç Fotoğrafları</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Mevcut fotoğrafları düzenleyin veya yeni fotoğraflar ekleyin.
                    </p>
                  </div>
                </div>
                
                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Mevcut Fotoğraflar</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {existingImages.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <img 
                            src={image.url} 
                            alt={`Car ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add New Images */}
                <div>
                  <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Yeni Fotoğraf Ekle</h3>
                  <MultiFileUploader
                    onFilesSelected={handleNewImageAdd}
                    onFileRemoved={handleRemoveNewImage}
                    accept="image/*"
                    maxSize={30}
                    maxFiles={16 - existingImages.length}
                    label="Araç Fotoğrafları"
                    description={`PNG, JPG, WEBP - Minimum HD (1280x720) çözünürlükte, maksimum 30MB, en fazla ${16 - existingImages.length} fotoğraf`}
                    minWidth={MIN_WIDTH}
                    minHeight={MIN_HEIGHT}
                  />
                  
                  {newImagePreviews.length > 0 && (
                    <ImageUploadPreview
                      images={newImages}
                      previews={newImagePreviews}
                      onRemove={handleRemoveNewImage}
                      maxImages={16 - existingImages.length}
                      className="mt-4"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>Devam Et</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Basic Car Info */}
          {activeStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-start mb-4">
                  <Car className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Araç Bilgileri</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Aracınızın temel özelliklerini güncelleyin.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Marka <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.brand ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">Marka Seçin</option>
                      {carBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                    {formErrors.brand && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.brand}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.model ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                      disabled={!formData.brand}
                    >
                      <option value="">Model Seçin</option>
                      {carModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    {formErrors.model && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.model}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Yıl <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear()}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.year ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {formErrors.year && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.year}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kilometre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="mileage"
                      name="mileage"
                      value={formData.mileage}
                      onChange={handleChange}
                      placeholder="0"
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.mileage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    />
                    {formErrors.mileage && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.mileage}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Renk <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowColorModal(true)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.color ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between`}
                    >
                      <div className="flex items-center space-x-3">
                        {formData.color ? (
                          <>
                            <div 
                              className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: colorOptions.find(c => c.value === formData.color)?.color }}
                            />
                            <span>{formData.color}</span>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Renk seçin</span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {formErrors.color && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.color}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Durum <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.condition ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      {conditions.map(condition => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.condition && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.condition}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="body_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kasa Tipi <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="body_type"
                      name="body_type"
                      value={formData.body_type}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.body_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">Seçiniz</option>
                      {bodyTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {formErrors.body_type && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.body_type}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Yakıt Tipi <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="fuel_type"
                      name="fuel_type"
                      value={formData.fuel_type}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.fuel_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">Seçiniz</option>
                      <option value="benzin">Benzin</option>
                      <option value="dizel">Dizel</option>
                      <option value="lpg">LPG</option>
                      <option value="hybrid">Hibrit</option>
                      <option value="electric">Elektrik</option>
                    </select>
                    {formErrors.fuel_type && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.fuel_type}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="transmission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vites <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="transmission"
                      name="transmission"
                      value={formData.transmission}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border ${
                        formErrors.transmission ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      required
                    >
                      <option value="">Seçiniz</option>
                      <option value="manual">Manuel</option>
                      <option value="automatic">Otomatik</option>
                      <option value="semi-automatic">Yarı Otomatik</option>
                    </select>
                    {formErrors.transmission && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.transmission}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Devam Et
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Additional Details */}
          {activeStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Technical Details */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-start mb-4">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Teknik Özellikler</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Aracınızın teknik özelliklerini güncelleyin.
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="engine_size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motor Hacmi <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="engine_size"
                      name="engine_size"
                      value={formData.engine_size}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {engineSizeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="power" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Motor Gücü <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="power"
                      name="power"
                      value={formData.power}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {enginePowerOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="doors" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kapı Sayısı
                    </label>
                    <select
                      id="doors"
                      name="doors"
                      value={formData.doors}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Konum <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Şehir, İlçe"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
                <div className="flex items-start mb-4">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 mt-1" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Fiyat Bilgisi</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Aracınızın satış fiyatını güncelleyin.
                    </p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fiyat <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {currencies.find(c => c.value === formData.currency)?.symbol}
                    </div>
                    <input
                      type="text"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full pl-8 pr-20 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <div className="relative currency-dropdown">
                        <button
                          type="button"
                          onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                          className="h-full flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-r-lg border-l border-gray-300 dark:border-gray-500 focus:outline-none"
                        >
                          <span className="mr-1">{currencies.find(c => c.value === formData.currency)?.label}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        
                        {showCurrencyDropdown && (
                          <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-600 overflow-hidden">
                            {currencies.map(currency => (
                              <button
                                key={currency.value}
                                type="button"
                                onClick={() => handleCurrencySelect(currency.value)}
                                className={`w-full text-left px-4 py-2 text-sm ${
                                  formData.currency === currency.value
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                              >
                                {currency.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Exchange Rate Info */}
                  {formData.currency !== 'TRY' && exchangeRates && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>
                        1 {formData.currency} ≈ {(1 / exchangeRates.rates[formData.currency]).toFixed(2)} TL
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="negotiable"
                      checked={formData.negotiable}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      Pazarlık Payı Var
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="exchange"
                      checked={formData.exchange}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      Takas Yapılır
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="warranty"
                      checked={formData.warranty}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                      Garantisi Var
                    </span>
                  </label>
                </div>
              </div>

              {/* Features */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Özellikler</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {carFeatures.map(feature => (
                    <label key={feature} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature)}
                        onChange={() => handleFeatureToggle(feature)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                        {feature}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Açıklama</h2>
                
                <div>
                  <label htmlFor="description" className="sr-only">
                    Açıklama
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Aracınız hakkında detaylı bilgi verin..."
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <span>Değişiklikleri Kaydet</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>

      {/* Color Selection Modal */}
      <AnimatePresence>
        {showColorModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="color-modal bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Renk Seçin</h3>
                <button
                  onClick={() => setShowColorModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => handleColorSelect(colorOption.value)}
                    className={`w-full p-3 rounded-lg flex items-center space-x-3 border transition-colors ${
                      formData.color === colorOption.value 
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: colorOption.color }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {colorOption.label}
                    </span>
                    {formData.color === colorOption.value && (
                      <Check className="w-4 h-4 text-blue-500 dark:text-blue-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EditListing;