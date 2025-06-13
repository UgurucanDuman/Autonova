import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowRight } from 'lucide-react';

interface CurrencyConverterProps {
  rates: {
    TRY: number;
    USD: number;
    EUR: number;
    GBP: number;
    [key: string]: number;
  };
  fromCurrency: string;
  amount: number;
  className?: string;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  rates,
  fromCurrency,
  amount,
  className = '',
}) => {
  const [convertedValues, setConvertedValues] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (!rates || !amount || !fromCurrency || !rates[fromCurrency]) return;

    // Doğru dönüşüm hesaplaması
    const converted: { [key: string]: number } = {};
    
    if (fromCurrency === 'TRY') {
      // TL'den diğer para birimlerine dönüşüm
      Object.entries(rates).forEach(([currency, rate]) => {
        if (currency !== 'TRY') {
          // TL'den diğer para birimine: TL miktarı * diğer para biriminin TL karşılığı
          converted[currency] = amount * rate;
        }
      });
    } else {
      // Diğer para biriminden TL'ye ve diğer para birimlerine dönüşüm
      const amountInTRY = amount / rates[fromCurrency]; // Önce TL'ye çevir
      
      // TL'den diğer para birimlerine
      Object.entries(rates).forEach(([currency, rate]) => {
        if (currency !== fromCurrency) {
          if (currency === 'TRY') {
            converted[currency] = amountInTRY;
          } else {
            converted[currency] = amountInTRY * rate;
          }
        }
      });
    }

    setConvertedValues(converted);
  }, [rates, fromCurrency, amount]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY': return '₺';
      default: return currency;
    }
  };

  return (
    <div className={`p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
        <DollarSign className="w-4 h-4 mr-1" />
        Yaklaşık Değerler
      </h3>

      <div className="space-y-2">
        {Object.entries(convertedValues).map(([currency, value]) => (
          <div key={currency} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {getCurrencySymbol(fromCurrency)}{amount.toLocaleString()}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {getCurrencySymbol(currency)}{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
