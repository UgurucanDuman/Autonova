import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExchangeRatesProps {
  onRatesChange: (rates: any) => void;
}

const API_KEY = import.meta.env.VITE_EXCHANGE_API_KEY;
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/TRY`;

export const ExchangeRates: React.FC<ExchangeRatesProps> = ({ onRatesChange }) => {
  const [loadingRates, setLoadingRates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      if (!navigator.onLine) {
        setError('İnternet bağlantısı yok');
        return;
      }

      setLoadingRates(true);
      setError(null);

      try {
        const cachedRates = localStorage.getItem('exchangeRates');
        if (cachedRates) {
          const { rates, timestamp } = JSON.parse(cachedRates);
          const cacheAge = Date.now() - timestamp;
          if (cacheAge < 900000) {
            onRatesChange({ rates, last_updated: new Date(timestamp).toISOString() });
            setLoadingRates(false);
            return;
          }
        }

        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`API hatası: ${response.status}`);
        }

        const data = await response.json();
        const rates = {
          TRY: 1,
          USD: 1 / data.conversion_rates.USD,  // 1 USD kaç TL
          EUR: 1 / data.conversion_rates.EUR,  // 1 EUR kaç TL
          GBP: 1 / data.conversion_rates.GBP   // 1 GBP kaç TL
        };

        localStorage.setItem('exchangeRates', JSON.stringify({
          rates,
          timestamp: Date.now()
        }));

        onRatesChange({ rates, last_updated: new Date().toISOString() });
      } catch (err) {
        console.error('Döviz bilgisi alınamadı:', err);
        setError('Döviz kurları alınamadı. Lütfen daha sonra tekrar deneyin.');
        toast.error('Döviz kurları güncellenemedi. Lütfen internet bağlantınızı kontrol edin.', {
          duration: 5000
        });
      } finally {
        setLoadingRates(false);
      }
    };

    fetchExchangeRates();
    const intervalId = setInterval(fetchExchangeRates, 900000);

    const handleOnline = () => {
      setError(null);
      fetchExchangeRates();
    };

    const handleOffline = () => {
      setError('İnternet bağlantısı yok');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onRatesChange]);

  if (loadingRates) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <DollarSign className="w-4 h-4 animate-spin" />
        <span>Döviz kurları yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-yellow-600 dark:text-yellow-400 text-sm flex items-center space-x-2">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  }

  return null;
};

// İlan Verme - Fiyat Bilgisi Analizi

// Görüntüden anladığım kadarıyla, fiyat bilgisi kısmında şu özellikler bulunuyor:

// 1. Fiyat girişi için bir input alanı
// 2. Para birimi seçimi (USD seçili görünüyor)
// 3. Döviz kuru bilgisi gösterimi (1 USD = 0.03 TL)
// 4. Ek özellikler için checkboxlar:
//    - Pazarlık Payı Var
//    - Takas Yapılır
//    - Garantisi Var

// Şu anda görünen değerler:
// - Girilen fiyat: 14.000 USD
// - Gösterilen kur: 1 USD = 0.03 TL

// Burada bir sorun görünüyor. Döviz kuru ters çevrilmiş durumda. Normalde:
// 1 USD ≈ 30-31 TL olması gerekirken
// 1 USD = 0.03 TL olarak gösteriliyor

// Bu durumu düzeltmek için <mcfile name="ExchangeRates.tsx" path="c:\Users\Ugurc\OneDrive\Masaüstü\araba projes\project\src\components\ExchangeRates.tsx"></mcfile> dosyasındaki kur hesaplama mantığını gözden geçirmemiz gerekiyor.

// Önerilen değişiklikler:
