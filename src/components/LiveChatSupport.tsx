import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, X, User, Phone, Mail, Paperclip, 
  Image, Smile, ChevronDown, ChevronUp, AlertCircle, 
  Car, Search, Filter, Calculator, HelpCircle, CreditCard,
  FileText, Settings, Info, ArrowRight, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface LiveChatSupportProps {
  onClose?: () => void;
}

export const LiveChatSupport: React.FC<LiveChatSupportProps> = ({
  onClose
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [agentOnline, setAgentOnline] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showHelpTopics, setShowHelpTopics] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showModelInput, setShowModelInput] = useState(false);
  const [modelInput, setModelInput] = useState('');
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({min: '', max: ''});
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [yearRange, setYearRange] = useState<{min: string, max: string}>({min: '', max: ''});
  const [showYearInput, setShowYearInput] = useState(false);

  // Car brands array - using the same list as in CarListings for consistency
  const carBrands = [
    'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Citroen', 'Dacia', 'Daewoo', 'Fiat',
    'Ford', 'GAZ', 'Geely', 'Genesis', 'Great Wall Motors', 'Honda', 'Hongqi', 'Hyundai', 'Jaguar',
    'Kia', 'Lada', 'Land Rover', 'Li Auto', 'Mercedes', 'Mini', 'Moskvitch', 'Nissan', 'Nio', 'Opel',
    'Peugeot', 'Porsche', 'Renault', 'Saab', 'Seat', 'Skoda', 'SsangYong', 'TOGG', 'Toyota',
    'Trumpchi', 'UAZ', 'Volkswagen', 'Volvo', 'XPeng', 'Zeekr', 'Ferrari'
  ];

  // Help topics that users can select
  const helpTopics = [
    { id: 'create-listing', title: 'İlan Oluşturma', icon: Car, path: '/create-listing', description: 'İlan oluşturma hakkında yardım alın' },
    { id: 'search', title: 'Gelişmiş Arama', icon: Search, path: '/listings', description: 'Araç arama ve filtreleme' },
    { id: 'compare', title: 'Araç Karşılaştırma', icon: Filter, path: '/compare', description: 'Araçları karşılaştırma' },
    { id: 'valuation', title: 'Araç Değerleme', icon: Calculator, path: '/listings', description: 'Araç değerleme aracı' },
    { id: 'profile', title: 'Profil Yönetimi', icon: User, path: '/profile', description: 'Profil ayarları ve yönetimi' },
    { id: 'purchase', title: 'İlan Hakkı Satın Alma', icon: CreditCard, path: '/profile', description: 'İlan hakkı satın alma' },
    { id: 'admin', title: 'Yönetici İle Görüşme', icon: Settings, description: 'Bir yönetici ile görüşmek istiyorum' },
    { id: 'other', title: 'Diğer Konular', icon: HelpCircle, description: 'Diğer konularda yardım' }
  ];

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      
      // Fetch user profile to get phone
      supabase
        .from('users')
        .select('phone')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && data.phone) {
            setPhone(data.phone);
          }
        });
    }
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    // Check for existing chat session in localStorage
    const existingChatId = localStorage.getItem('liveChatId');
    if (existingChatId) {
      setChatId(existingChatId);
      setShowForm(false);
      fetchChatHistory(existingChatId);
    }
    
    // Simulate agent status
    const randomStatus = Math.random() > 0.2; // 80% chance agent is online
    setAgentOnline(randomStatus);
    
    return () => {
      // Clean up any subscriptions
    };
  }, []);

  const fetchChatHistory = async (id: string) => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from a real-time database
      // For demo purposes, we'll simulate a chat history
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const demoMessages = [
        {
          id: '1',
          sender: 'agent',
          content: 'Merhaba! Size nasıl yardımcı olabilirim?',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
        }
      ];
      
      setMessages(demoMessages);
      setUnreadCount(1);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Sohbet geçmişi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!name.trim() || !email.trim()) {
      setError('Lütfen ad ve e-posta alanlarını doldurun');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Lütfen geçerli bir e-posta adresi girin');
      return;
    }
    
    setLoading(true);
    
    // Generate a chat ID
    const newChatId = Math.random().toString(36).substring(2, 15);
    setChatId(newChatId);
    
    // Store in localStorage
    localStorage.setItem('liveChatId', newChatId);
    
    // Add welcome message
    const welcomeMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      content: `Merhaba ${name}! Autinoa Canlı Destek'e hoş geldiniz. Size nasıl yardımcı olabilirim?`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
    setShowForm(false);
    setLoading(false);
    setUnreadCount(1);
    
    // Show help topics after welcome message
    setTimeout(() => {
      setShowHelpTopics(true);
    }, 1000);
  };

  // Function to detect car brands mentioned in a message
  const detectBrands = (message: string): string[] => {
    const lowerCaseMessage = message.toLowerCase();
    return carBrands.filter(brand => 
      lowerCaseMessage.includes(brand.toLowerCase())
    );
  };

  // Function to check if message is asking about car search/filtering
  const isCarSearchQuery = (message: string): boolean => {
    const lowerCaseMessage = message.toLowerCase();
    const searchKeywords = [
      'ara', 'bul', 'filtre', 'arama', 'göster', 'görüntüle', 'listele',
      'araba', 'araç', 'oto', 'otomobil', 'satılık', 'kiralık'
    ];
    
    return searchKeywords.some(keyword => lowerCaseMessage.includes(keyword));
  };

  // Extract price information if available
  const extractPriceRange = (message: string): {min: string, max: string} | null => {
    const lowerCaseMessage = message.toLowerCase();
    
    // Check for price ranges with TL, ₺ or without currency symbol
    const priceRangeRegex = /(\d+)[\s]*(tl|₺)?[\s]*-[\s]*(\d+)[\s]*(tl|₺)?/i;
    const priceRangeMatch = lowerCaseMessage.match(priceRangeRegex);
    
    if (priceRangeMatch) {
      return {
        min: priceRangeMatch[1],
        max: priceRangeMatch[3]
      };
    }
    
    // Check for "max price" patterns
    const maxPriceRegex = /(en fazla|maksimum|max|altında|altinda|kadar)[\s]*(\d+)[\s]*(tl|₺)?/i;
    const maxPriceMatch = lowerCaseMessage.match(maxPriceRegex);
    
    if (maxPriceMatch) {
      return {
        min: '',
        max: maxPriceMatch[2]
      };
    }
    
    // Check for "min price" patterns
    const minPriceRegex = /(en az|minimum|min|üstünde|ustunde|üzerinde|uzerinde)[\s]*(\d+)[\s]*(tl|₺)?/i;
    const minPriceMatch = lowerCaseMessage.match(minPriceRegex);
    
    if (minPriceMatch) {
      return {
        min: minPriceMatch[2],
        max: ''
      };
    }
    
    return null;
  };

  // Extract year information if available
  const extractYearRange = (message: string): {min: string, max: string} | null => {
    const lowerCaseMessage = message.toLowerCase();
    
    // Check for year ranges
    const yearRangeRegex = /(\d{4})[\s]*-[\s]*(\d{4})/;
    const yearRangeMatch = lowerCaseMessage.match(yearRangeRegex);
    
    if (yearRangeMatch) {
      return {
        min: yearRangeMatch[1],
        max: yearRangeMatch[2]
      };
    }
    
    // Check for "newer than" patterns
    const minYearRegex = /(üstü|üzeri|sonrası|sonrasi|yeni|modern|güncel|guncel)[\s]*(\d{4})/i;
    const minYearMatch = lowerCaseMessage.match(minYearRegex);
    
    if (minYearMatch) {
      return {
        min: minYearMatch[2],
        max: ''
      };
    }
    
    // Check for "older than" patterns
    const maxYearRegex = /(altı|öncesi|oncesi|eski)[\s]*(\d{4})/i;
    const maxYearMatch = lowerCaseMessage.match(maxYearRegex);
    
    if (maxYearMatch) {
      return {
        min: '',
        max: maxYearMatch[2]
      };
    }
    
    // Check for single year mention
    const singleYearRegex = /\b(19\d{2}|20\d{2})\b/;
    const singleYearMatch = lowerCaseMessage.match(singleYearRegex);
    
    if (singleYearMatch) {
      return {
        min: singleYearMatch[1],
        max: singleYearMatch[1]
      };
    }
    
    return null;
  };

  // Extract model information if available
  const extractModels = (message: string, detectedBrands: string[]): string[] => {
    if (detectedBrands.length === 0) return [];
    
    const lowerCaseMessage = message.toLowerCase();
    const commonModels: Record<string, string[]> = {
      'bmw': ['1 serisi', '2 serisi', '3 serisi', '4 serisi', '5 serisi', '6 serisi', '7 serisi', '8 serisi', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'z4', 'i3', 'i4', 'i8', 'ix'],
      'mercedes': ['a serisi', 'b serisi', 'c serisi', 'e serisi', 's serisi', 'cla', 'cls', 'gla', 'glb', 'glc', 'gle', 'gls', 'eqc', 'eqa', 'eqb', 'eqs'],
      'audi': ['a1', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'q2', 'q3', 'q5', 'q7', 'q8', 'tt', 'r8', 'e-tron'],
      'volkswagen': ['polo', 'golf', 'passat', 'arteon', 'tiguan', 'touareg', 'id.3', 'id.4', 'jetta', 'caddy', 'transporter'],
      'toyota': ['corolla', 'yaris', 'camry', 'rav4', 'c-hr', 'prius', 'land cruiser', 'hilux', 'supra'],
      'honda': ['civic', 'accord', 'cr-v', 'hr-v', 'jazz', 'e'],
      'ford': ['fiesta', 'focus', 'mondeo', 'kuga', 'puma', 'mustang', 'ranger', 'transit'],
      'fiat': ['500', 'panda', 'tipo', 'egea', 'doblo', 'ducato'],
      'renault': ['clio', 'megane', 'captur', 'kadjar', 'koleos', 'talisman', 'zoe'],
      'peugeot': ['208', '308', '508', '2008', '3008', '5008'],
      'opel': ['corsa', 'astra', 'insignia', 'mokka', 'crossland', 'grandland'],
      'kia': ['picanto', 'rio', 'ceed', 'sportage', 'sorento', 'stonic', 'niro', 'ev6'],
      'hyundai': ['i10', 'i20', 'i30', 'kona', 'tucson', 'santa fe', 'ioniq', 'ioniq 5']
    };
    
    const detectedModels: string[] = [];
    
    detectedBrands.forEach(brand => {
      const brandLower = brand.toLowerCase();
      if (commonModels[brandLower]) {
        commonModels[brandLower].forEach(model => {
          if (lowerCaseMessage.includes(model.toLowerCase())) {
            detectedModels.push(model);
          }
        });
      }
    });
    
    return detectedModels;
  };

  // Process search query and prepare navigation with filters
  const processCarSearchQuery = async (message: string) => {
    // Check if it's a car search query
    if (!isCarSearchQuery(message)) return null;
    
    // Detect brands
    const detectedBrands = detectBrands(message);
    let brandsToUse = selectedBrands.length > 0 ? selectedBrands : detectedBrands;
    
    // Detect models
    const detectedModels = extractModels(message, brandsToUse);
    let modelsToUse = selectedModels.length > 0 ? selectedModels : detectedModels;
    
    // Extract price range
    const detectedPriceRange = extractPriceRange(message);
    const priceRangeToUse = (priceRange.min !== '' || priceRange.max !== '') 
      ? priceRange 
      : detectedPriceRange || {min: '', max: ''};
    
    // Extract year range
    const detectedYearRange = extractYearRange(message);
    const yearRangeToUse = (yearRange.min !== '' || yearRange.max !== '') 
      ? yearRange 
      : detectedYearRange || {min: '', max: ''};
    
    // If we have brands but no models detected, and no explicit selections were made,
    // ask user if they want to select a specific model
    if (brandsToUse.length > 0 && modelsToUse.length === 0 && selectedBrands.length === 0) {
      setSelectedBrands(brandsToUse);
      return {
        askForModel: true,
        brands: brandsToUse
      };
    }
    
    // If we have no brands detected, ask user to select brands
    if (brandsToUse.length === 0 && !selectedBrands.length) {
      return {
        askForBrand: true
      };
    }
    
    // If we have price or year filters but not both, maybe ask for the other
    if ((priceRangeToUse.min !== '' || priceRangeToUse.max !== '') && 
        (yearRangeToUse.min === '' && yearRangeToUse.max === '') &&
        !showYearInput) {
      setPriceRange(priceRangeToUse);
      return {
        askForYear: true,
        priceRange: priceRangeToUse
      };
    }
    
    if ((yearRangeToUse.min !== '' || yearRangeToUse.max !== '') && 
        (priceRangeToUse.min === '' && priceRangeToUse.max === '') &&
        !showPriceInput) {
      setYearRange(yearRangeToUse);
      return {
        askForPrice: true,
        yearRange: yearRangeToUse
      };
    }
    
    // Prepare navigation filters
    let filters: Record<string, string> = {};
    
    if (brandsToUse.length === 1) {
      filters.brand = brandsToUse[0];
    }
    
    if (modelsToUse.length === 1) {
      filters.model = modelsToUse[0];
    }
    
    if (priceRangeToUse.min) {
      filters.minPrice = priceRangeToUse.min;
    }
    
    if (priceRangeToUse.max) {
      filters.maxPrice = priceRangeToUse.max;
    }
    
    if (yearRangeToUse.min) {
      filters.minYear = yearRangeToUse.min;
    }
    
    if (yearRangeToUse.max) {
      filters.maxYear = yearRangeToUse.max;
    }
    
    // Build URL query string
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      queryParams.set(key, value);
    });
    
    return {
      navigateTo: `/listings?${queryParams.toString()}`,
      filters
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSending(true);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Store the message for processing
    const messageToProcess = newMessage.trim();
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Process the message to determine if it's a car search query
    const carSearchResult = await processCarSearchQuery(messageToProcess);
    
    // Regular message processing for keywords
    const lowerCaseMessage = messageToProcess.toLowerCase();
    
    let responseMessage = '';
    let shouldNavigate = false;
    let navigationPath = '';
    
    // Handle car search results first
    if (carSearchResult) {
      if (carSearchResult.askForBrand) {
        responseMessage = 'Hangi marka araçla ilgileniyorsunuz? Lütfen bir marka seçin.';
        setShowBrandSelector(true);
        setAgentTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'agent',
          content: responseMessage,
          timestamp: new Date().toISOString()
        }]);
        setSending(false);
        return;
      } 
      else if (carSearchResult.askForModel) {
        const brandNames = carSearchResult.brands.join(', ');
        responseMessage = `${brandNames} için hangi modelle ilgileniyorsunuz? Lütfen model belirtin.`;
        setShowModelInput(true);
        setAgentTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'agent',
          content: responseMessage,
          timestamp: new Date().toISOString()
        }]);
        setSending(false);
        return;
      }
      else if (carSearchResult.askForPrice) {
        responseMessage = 'Hangi fiyat aralığında bir araç arıyorsunuz? Lütfen minimum ve maksimum fiyat belirtin.';
        setShowPriceInput(true);
        setAgentTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'agent',
          content: responseMessage,
          timestamp: new Date().toISOString()
        }]);
        setSending(false);
        return;
      }
      else if (carSearchResult.askForYear) {
        responseMessage = 'Hangi yıl aralığında bir araç arıyorsunuz? Lütfen minimum ve maksimum yıl belirtin.';
        setShowYearInput(true);
        setAgentTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'agent',
          content: responseMessage,
          timestamp: new Date().toISOString()
        }]);
        setSending(false);
        return;
      }
      else if (carSearchResult.navigateTo) {
        // Format filter info for response message
        const filterDescriptions = [];
        
        if (carSearchResult.filters.brand) {
          filterDescriptions.push(`${carSearchResult.filters.brand} marka`);
        }
        
        if (carSearchResult.filters.model) {
          filterDescriptions.push(`${carSearchResult.filters.model} model`);
        }
        
        if (carSearchResult.filters.minPrice && carSearchResult.filters.maxPrice) {
          filterDescriptions.push(`₺${carSearchResult.filters.minPrice}-₺${carSearchResult.filters.maxPrice} fiyat aralığında`);
        } else if (carSearchResult.filters.minPrice) {
          filterDescriptions.push(`₺${carSearchResult.filters.minPrice} üzeri fiyatta`);
        } else if (carSearchResult.filters.maxPrice) {
          filterDescriptions.push(`₺${carSearchResult.filters.maxPrice} altı fiyatta`);
        }
        
        if (carSearchResult.filters.minYear && carSearchResult.filters.maxYear) {
          filterDescriptions.push(`${carSearchResult.filters.minYear}-${carSearchResult.filters.maxYear} yıl aralığında`);
        } else if (carSearchResult.filters.minYear) {
          filterDescriptions.push(`${carSearchResult.filters.minYear} ve sonrası yıllarda`);
        } else if (carSearchResult.filters.maxYear) {
          filterDescriptions.push(`${carSearchResult.filters.maxYear} ve öncesi yıllarda`);
        }
        
        const filterText = filterDescriptions.length > 0 
          ? filterDescriptions.join(', ') + ' araçlar' 
          : 'araçlar';
        
        responseMessage = `${filterText} için arama sayfasına yönlendiriliyorsunuz.`;
        shouldNavigate = true;
        navigationPath = carSearchResult.navigateTo;
      }
    }
    // If not a car search or no results from car search processing, use keyword detection
    else if (lowerCaseMessage.includes('ilan') && (lowerCaseMessage.includes('oluştur') || lowerCaseMessage.includes('ver') || lowerCaseMessage.includes('ekle'))) {
      responseMessage = 'İlan oluşturma sayfasına yönlendiriliyorsunuz. İlan oluşturma formunu doldurarak aracınızı satışa çıkarabilirsiniz.';
      shouldNavigate = true;
      navigationPath = '/create-listing';
      setSelectedTopic('create-listing');
    } 
    else if (lowerCaseMessage.includes('karşılaştır')) {
      responseMessage = 'Araç karşılaştırma sayfasına yönlendiriliyorsunuz. Burada araçları yan yana karşılaştırabilirsiniz.';
      shouldNavigate = true;
      navigationPath = '/compare';
      setSelectedTopic('compare');
    }
    else if (lowerCaseMessage.includes('değer') || lowerCaseMessage.includes('fiyat') || lowerCaseMessage.includes('fiyatla')) {
      responseMessage = 'Araç değerleme aracına yönlendiriliyorsunuz. Aracınızın piyasa değerini öğrenebilirsiniz.';
      shouldNavigate = true;
      navigationPath = '/listings';
      setSelectedTopic('valuation');
    }
    else if (lowerCaseMessage.includes('profil') || lowerCaseMessage.includes('hesap') || lowerCaseMessage.includes('ayarlar')) {
      responseMessage = 'Profil sayfanıza yönlendiriliyorsunuz. Burada hesap ayarlarınızı yönetebilirsiniz.';
      shouldNavigate = true;
      navigationPath = '/profile';
      setSelectedTopic('profile');
    }
    else if (lowerCaseMessage.includes('satın al') || lowerCaseMessage.includes('ödeme') || lowerCaseMessage.includes('kredi')) {
      responseMessage = 'İlan hakkı satın alma sayfasına yönlendiriliyorsunuz. Burada ek ilan hakkı satın alabilirsiniz.';
      shouldNavigate = true;
      navigationPath = '/profile';
      setSelectedTopic('purchase');
    }
    else if (lowerCaseMessage.includes('yönetici') || lowerCaseMessage.includes('admin') || lowerCaseMessage.includes('yetkili')) {
      responseMessage = 'Talebiniz alındı. Bir yönetici en kısa sürede sizinle iletişime geçecektir. Lütfen bekleyin.';
      setSelectedTopic('admin');
    }
    else {
      // Generic responses for other queries
      const genericResponses = [
        'Size nasıl yardımcı olabilirim?',
        'Bu konuda daha fazla bilgi verebilir misiniz?',
        'Anladım, bu konuda size yardımcı olabilirim.',
        'Başka bir sorunuz var mı?',
        'Bu bilgileri sizin için kontrol edebilirim.',
        'Biraz bekleyin, bu konuyu araştırıyorum.',
        'Teşekkür ederim, başka bir konuda yardıma ihtiyacınız var mı?',
        'Elbette, bu konuda size yardımcı olabilirim.',
        'Bu sorunuzu ilgili departmana ileteceğim.',
        'Daha fazla bilgiye ihtiyacım var, lütfen detayları paylaşır mısınız?'
      ];
      
      responseMessage = genericResponses[Math.floor(Math.random() * genericResponses.length)];
    }
    
    const agentMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'agent',
      content: responseMessage,
      timestamp: new Date().toISOString()
    };
    
    setAgentTyping(false);
    setMessages(prev => [...prev, agentMessage]);
    setSending(false);
    setUnreadCount(prev => prev + 1);
    
    // Reset filters after sending
    if (shouldNavigate) {
      setSelectedBrands([]);
      setSelectedModels([]);
      setPriceRange({min: '', max: ''});
      setYearRange({min: '', max: ''});
      
      // Navigate if needed after a short delay
      setTimeout(() => {
        navigate(navigationPath);
        setIsOpen(false);
      }, 2000);
    }
  };

  const handleBrandSelect = (brand: string) => {
    // Toggle brand selection
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand) 
        : [...prev, brand]
    );
  };

  const handleBrandSelectionComplete = async () => {
    if (selectedBrands.length === 0) {
      // If no brands selected, ask again
      const promptMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        content: 'Lütfen en az bir marka seçin.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, promptMessage]);
      return;
    }
    
    setShowBrandSelector(false);
    
    // Add the selected brands as a user message
    const brandsText = selectedBrands.join(', ');
    const userSelectionMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Seçilen markalar: ${brandsText}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userSelectionMessage]);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Ask for model
    const askModelMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      content: `${brandsText} için hangi modelle ilgileniyorsunuz? Lütfen model belirtin.`,
      timestamp: new Date().toISOString()
    };
    
    setAgentTyping(false);
    setMessages(prev => [...prev, askModelMessage]);
    setShowModelInput(true);
  };

  const handleModelSubmit = async () => {
    if (!modelInput.trim()) {
      const promptMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        content: 'Lütfen bir model girin veya "Tüm modeller" yazın.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, promptMessage]);
      return;
    }
    
    setShowModelInput(false);
    setSelectedModels(modelInput.split(',').map(m => m.trim()));
    
    // Add the selected model as a user message
    const userSelectionMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Model: ${modelInput}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userSelectionMessage]);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check if we need to ask for price
    if (priceRange.min === '' && priceRange.max === '') {
      const askPriceMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        content: 'Hangi fiyat aralığında bir araç arıyorsunuz? Lütfen minimum ve maksimum fiyat belirtin.',
        timestamp: new Date().toISOString()
      };
      
      setAgentTyping(false);
      setMessages(prev => [...prev, askPriceMessage]);
      setShowPriceInput(true);
    } else {
      // If we have price already, ask for year
      const askYearMessage = {
        id: Date.now().toString(),
        sender: 'agent',
        content: 'Hangi yıl aralığında bir araç arıyorsunuz? Lütfen minimum ve maksimum yıl belirtin.',
        timestamp: new Date().toISOString()
      };
      
      setAgentTyping(false);
      setMessages(prev => [...prev, askYearMessage]);
      setShowYearInput(true);
    }
  };

  const handlePriceSubmit = async () => {
    setShowPriceInput(false);
    
    // Add the price range as a user message
    const priceText = priceRange.min && priceRange.max 
      ? `₺${priceRange.min} - ₺${priceRange.max}` 
      : priceRange.min 
        ? `₺${priceRange.min} üzeri` 
        : priceRange.max 
          ? `₺${priceRange.max} altı` 
          : 'Fiyat belirtilmedi';
          
    const userSelectionMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Fiyat aralığı: ${priceText}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userSelectionMessage]);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Ask for year
    const askYearMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      content: 'Hangi yıl aralığında bir araç arıyorsunuz? Lütfen minimum ve maksimum yıl belirtin.',
      timestamp: new Date().toISOString()
    };
    
    setAgentTyping(false);
    setMessages(prev => [...prev, askYearMessage]);
    setShowYearInput(true);
  };

  const handleYearSubmit = async () => {
    setShowYearInput(false);
    
    // Add the year range as a user message
    const yearText = yearRange.min && yearRange.max 
      ? `${yearRange.min} - ${yearRange.max}` 
      : yearRange.min 
        ? `${yearRange.min} ve sonrası` 
        : yearRange.max 
          ? `${yearRange.max} ve öncesi` 
          : 'Yıl belirtilmedi';
          
    const userSelectionMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `Yıl aralığı: ${yearText}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userSelectionMessage]);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Prepare navigation
    const queryParams = new URLSearchParams();
    
    if (selectedBrands.length === 1) {
      queryParams.set('brand', selectedBrands[0]);
    }
    
    if (selectedModels.length === 1) {
      queryParams.set('model', selectedModels[0]);
    }
    
    if (priceRange.min) {
      queryParams.set('minPrice', priceRange.min);
    }
    
    if (priceRange.max) {
      queryParams.set('maxPrice', priceRange.max);
    }
    
    if (yearRange.min) {
      queryParams.set('minYear', yearRange.min);
    }
    
    if (yearRange.max) {
      queryParams.set('maxYear', yearRange.max);
    }
    
    // Format filter info for response message
    const filterDescriptions = [];
    
    if (selectedBrands.length > 0) {
      filterDescriptions.push(`${selectedBrands.join(', ')} marka`);
    }
    
    if (selectedModels.length > 0) {
      filterDescriptions.push(`${selectedModels.join(', ')} model`);
    }
    
    if (priceRange.min && priceRange.max) {
      filterDescriptions.push(`₺${priceRange.min}-₺${priceRange.max} fiyat aralığında`);
    } else if (priceRange.min) {
      filterDescriptions.push(`₺${priceRange.min} üzeri fiyatta`);
    } else if (priceRange.max) {
      filterDescriptions.push(`₺${priceRange.max} altı fiyatta`);
    }
    
    if (yearRange.min && yearRange.max) {
      filterDescriptions.push(`${yearRange.min}-${yearRange.max} yıl aralığında`);
    } else if (yearRange.min) {
      filterDescriptions.push(`${yearRange.min} ve sonrası yıllarda`);
    } else if (yearRange.max) {
      filterDescriptions.push(`${yearRange.max} ve öncesi yıllarda`);
    }
    
    const filterText = filterDescriptions.length > 0 
      ? filterDescriptions.join(', ') + ' araçlar' 
      : 'araçlar';
    
    const responseMessage = `${filterText} için arama sayfasına yönlendiriliyorsunuz.`;
    
    const agentMessage = {
      id: Date.now().toString(),
      sender: 'agent',
      content: responseMessage,
      timestamp: new Date().toISOString()
    };
    
    setAgentTyping(false);
    setMessages(prev => [...prev, agentMessage]);
    
    // Reset filters
    setSelectedBrands([]);
    setSelectedModels([]);
    setPriceRange({min: '', max: ''});
    setYearRange({min: '', max: ''});
    
    // Navigate after a short delay
    setTimeout(() => {
      navigate(`/listings?${queryParams.toString()}`);
      setIsOpen(false);
    }, 2000);
  };

  const handleTopicSelect = async (topicId: string) => {
    setSelectedTopic(topicId);
    const topic = helpTopics.find(t => t.id === topicId);
    
    if (!topic) return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: `${topic.title} hakkında bilgi almak istiyorum.`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setSending(true);
    
    // Simulate agent typing
    setAgentTyping(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let responseMessage = '';
    let shouldNavigate = false;
    let navigationPath = '';
    
    switch(topicId) {
      case 'create-listing':
        responseMessage = 'İlan oluşturma sayfasına yönlendiriliyorsunuz. İlan oluşturma formunu doldurarak aracınızı satışa çıkarabilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/create-listing';
        break;
      case 'search':
        responseMessage = 'Araç arama sayfasına yönlendiriliyorsunuz. Gelişmiş filtreleme seçenekleriyle aradığınız aracı bulabilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/listings';
        break;
      case 'compare':
        responseMessage = 'Araç karşılaştırma sayfasına yönlendiriliyorsunuz. Burada araçları yan yana karşılaştırabilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/compare';
        break;
      case 'valuation':
        responseMessage = 'Araç değerleme aracına yönlendiriliyorsunuz. Aracınızın piyasa değerini öğrenebilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/listings';
        break;
      case 'profile':
        responseMessage = 'Profil sayfanıza yönlendiriliyorsunuz. Burada hesap ayarlarınızı yönetebilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/profile';
        break;
      case 'purchase':
        responseMessage = 'İlan hakkı satın alma sayfasına yönlendiriliyorsunuz. Burada ek ilan hakkı satın alabilirsiniz.';
        shouldNavigate = true;
        navigationPath = '/profile';
        break;
      case 'admin':
        responseMessage = 'Talebiniz alındı. Bir yönetici en kısa sürede sizinle iletişime geçecektir. Lütfen bekleyin.';
        break;
      case 'other':
        responseMessage = 'Lütfen yardım almak istediğiniz konuyu detaylı bir şekilde açıklayın. Size en kısa sürede yardımcı olacağız.';
        break;
      default:
        responseMessage = 'Size nasıl yardımcı olabilirim?';
    }
    
    const agentMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'agent',
      content: responseMessage,
      timestamp: new Date().toISOString()
    };
    
    setAgentTyping(false);
    setMessages(prev => [...prev, agentMessage]);
    setSending(false);
    setShowHelpTopics(false);
    
    // Navigate if needed after a short delay
    if (shouldNavigate) {
      setTimeout(() => {
        navigate(navigationPath);
        setIsOpen(false);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (showBrandSelector) {
        handleBrandSelectionComplete();
      } else if (showModelInput) {
        handleModelSubmit();
      } else if (showPriceInput) {
        handlePriceSubmit();
      } else if (showYearInput) {
        handleYearSubmit();
      } else {
        handleSendMessage();
      }
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setShowDeleteConfirm(messageId);
  };

  const confirmDeleteMessage = () => {
    if (!showDeleteConfirm) return;
    
    setDeletingMessage(showDeleteConfirm);
    
    try {
      // Filter out the message with the given ID
      const updatedMessages = messages.filter(message => message.id !== showDeleteConfirm);
      setMessages(updatedMessages);
      toast.success('Mesaj silindi');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Mesaj silinemedi');
    } finally {
      setDeletingMessage(null);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-20 right-6 z-40 md:bottom-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleChat}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center relative"
        >
          <MessageSquare className="w-6 h-6" />
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden z-40 flex flex-col md:bottom-20"
            style={{ height: '500px' }}
          >
            {/* Header */}
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Canlı Destek</h3>
                  <p className="text-xs text-blue-100">
                    {agentOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content */}
            {showForm ? (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    Canlı destek ekibimiz size yardımcı olmak için hazır. Lütfen aşağıdaki formu doldurun ve sohbete başlayın.
                  </p>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Adınız <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      E-posta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <button
                    onClick={handleStartChat}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Yükleniyor...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        <span>Sohbete Başla</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 p-4 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg relative group ${
                              message.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === 'user' 
                                ? 'text-blue-100' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {format(new Date(message.timestamp), 'HH:mm')}
                            </p>
                            
                            {/* Delete button for user messages */}
                            {message.sender === 'user' && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {agentTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Brand Selector */}
                      {showBrandSelector && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                              Hangi marka araçla ilgileniyorsunuz? (Birden fazla seçebilirsiniz)
                            </p>
                            
                            <div className="mb-2">
                              <input
                                type="text"
                                value={brandSearchTerm}
                                onChange={(e) => setBrandSearchTerm(e.target.value)}
                                placeholder="Marka ara..."
                                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>
                            
                            <div className="max-h-40 overflow-y-auto mb-2 grid grid-cols-2 gap-1">
                              {carBrands
                                .filter(brand => brand.toLowerCase().includes(brandSearchTerm.toLowerCase()))
                                .map(brand => (
                                  <div
                                    key={brand}
                                    onClick={() => handleBrandSelect(brand)}
                                    className={`p-2 rounded-lg cursor-pointer text-sm transition-colors ${
                                      selectedBrands.includes(brand)
                                        ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100'
                                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {brand}
                                  </div>
                                ))}
                            </div>
                            
                            {selectedBrands.length > 0 && (
                              <div className="mb-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Seçilen markalar: {selectedBrands.join(', ')}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex justify-end">
                              <button
                                onClick={handleBrandSelectionComplete}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                Devam Et
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Model Input */}
                      {showModelInput && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                              Hangi model araç arıyorsunuz?
                            </p>
                            
                            <input
                              type="text"
                              value={modelInput}
                              onChange={(e) => setModelInput(e.target.value)}
                              placeholder="Model girin veya 'Tüm modeller' yazın"
                              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3"
                            />
                            
                            {selectedBrands.length === 1 && (
                              <div className="mb-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  Popüler {selectedBrands[0]} modelleri:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {(selectedBrands[0].toLowerCase() === 'bmw' ? ['1 Serisi', '3 Serisi', '5 Serisi', 'X3', 'X5'] :
                                    selectedBrands[0].toLowerCase() === 'mercedes' ? ['A-Serisi', 'C-Serisi', 'E-Serisi', 'GLC', 'GLE'] :
                                    selectedBrands[0].toLowerCase() === 'audi' ? ['A3', 'A4', 'A6', 'Q3', 'Q5'] :
                                    selectedBrands[0].toLowerCase() === 'volkswagen' ? ['Golf', 'Passat', 'Polo', 'Tiguan', 'T-Roc'] :
                                    ['Örnek Model 1', 'Örnek Model 2', 'Örnek Model 3']
                                  ).map(model => (
                                    <button
                                      key={model}
                                      onClick={() => setModelInput(model)}
                                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                    >
                                      {model}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-end">
                              <button
                                onClick={handleModelSubmit}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Devam Et
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Price Input */}
                      {showPriceInput && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                              Fiyat aralığı belirleyin
                            </p>
                            
                            <div className="flex space-x-2 mb-3">
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Min (₺)</label>
                                <input
                                  type="number"
                                  value={priceRange.min}
                                  onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                                  placeholder="Minimum"
                                  className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Max (₺)</label>
                                <input
                                  type="number"
                                  value={priceRange.max}
                                  onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                                  placeholder="Maksimum"
                                  className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between mb-2">
                              <button
                                onClick={() => setPriceRange({min: '', max: ''})}
                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                Temizle
                              </button>
                              <button
                                onClick={handlePriceSubmit}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Devam Et
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Year Input */}
                      {showYearInput && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                              Yıl aralığı belirleyin
                            </p>
                            
                            <div className="flex space-x-2 mb-3">
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Min Yıl</label>
                                <input
                                  type="number"
                                  value={yearRange.min}
                                  onChange={(e) => setYearRange({...yearRange, min: e.target.value})}
                                  placeholder="Minimum"
                                  min="1900"
                                  max="2030"
                                  className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Max Yıl</label>
                                <input
                                  type="number"
                                  value={yearRange.max}
                                  onChange={(e) => setYearRange({...yearRange, max: e.target.value})}
                                  placeholder="Maksimum"
                                  min="1900"
                                  max="2030"
                                  className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between mb-2">
                              <button
                                onClick={() => setYearRange({min: '', max: ''})}
                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                Temizle
                              </button>
                              <button
                                onClick={handleYearSubmit}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Ara
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Help Topics */}
                      {showHelpTopics && !selectedTopic && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg w-full">
                            <p className="text-gray-800 dark:text-white font-medium mb-2">
                              Size nasıl yardımcı olabilirim? Lütfen bir konu seçin:
                            </p>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                              {helpTopics.map((topic) => (
                                <button
                                  key={topic.id}
                                  onClick={() => handleTopicSelect(topic.id)}
                                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                                >
                                  <topic.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  <div>
                                    <p className="font-medium text-gray-800 dark:text-white">{topic.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{topic.description}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={1}
                      disabled={showBrandSelector || showModelInput || showPriceInput || showYearInput}
                    />
                    <button
                      onClick={
                        showBrandSelector 
                          ? handleBrandSelectionComplete 
                          : showModelInput 
                            ? handleModelSubmit 
                            : showPriceInput
                              ? handlePriceSubmit
                              : showYearInput
                                ? handleYearSubmit
                                : handleSendMessage
                      }
                      disabled={
                        (sending || (!newMessage.trim() && !showBrandSelector && !showModelInput && !showPriceInput && !showYearInput) || !agentOnline)
                      }
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {!agentOnline && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      Şu anda çevrimiçi destek ekibimiz bulunmuyor. Mesajınızı bırakın, en kısa sürede size dönüş yapacağız.
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-xs w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Mesajı Sil
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Bu mesajı silmek istediğinizden emin misiniz?
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteMessage}
                  disabled={!!deletingMessage}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-opacity flex items-center space-x-1"
                >
                  {deletingMessage ? (
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
    </>
  );
};