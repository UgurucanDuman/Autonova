import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

const countries = [
  { value: 'TR', label: '🇹🇷 Türkiye (+90)', dialCode: '90' },
  { value: 'DE', label: '🇩🇪 Almanya (+49)', dialCode: '49' },
  { value: 'FR', label: '🇫🇷 Fransa (+33)', dialCode: '33' },
  { value: 'GB', label: '🇬🇧 İngiltere (+44)', dialCode: '44' },
  { value: 'NL', label: '🇳🇱 Hollanda (+31)', dialCode: '31' },
  { value: 'BE', label: '🇧🇪 Belçika (+32)', dialCode: '32' },
  { value: 'AT', label: '🇦🇹 Avusturya (+43)', dialCode: '43' },
  { value: 'CH', label: '🇨🇭 İsviçre (+41)', dialCode: '41' },
  { value: 'SE', label: '🇸🇪 İsveç (+46)', dialCode: '46' },
  { value: 'DK', label: '🇩🇰 Danimarka (+45)', dialCode: '45' },
  { value: 'NO', label: '🇳🇴 Norveç (+47)', dialCode: '47' },
  { value: 'IT', label: '🇮🇹 İtalya (+39)', dialCode: '39' },
  { value: 'ES', label: '🇪🇸 İspanya (+34)', dialCode: '34' },
];

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  className = ''
}) => {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [numberPart, setNumberPart] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Maximum number of digits allowed (excluding spaces)
  const MAX_DIGITS = 12;

  // Parse initial value if provided
  useEffect(() => {
    if (value) {
      // Try to extract country code and number
      const match = value.match(/^\+(\d+)(.*)$/);
      if (match) {
        const [, countryCode, number] = match;
        const country = countries.find(c => c.dialCode === countryCode);
        if (country) {
          setSelectedCountry(country);
          setNumberPart(number.trim());
        }
      }
    }
  }, []);

  // Handle country selection change
  const handleCountryChange = (option: any) => {
    if (!option) return;
    setSelectedCountry(option);
    
    // Update parent with new value
    const newValue = `+${option.dialCode}${numberPart.replace(/\s/g, '')}`;
    onChange(newValue);
    
    // Focus input field after selection
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  // Handle direct keyboard input
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get only the number part (without country code)
    const inputValue = e.target.value;
    
    // Filter out non-numeric characters except spaces
    const filtered = inputValue.replace(/[^\d\s]/g, '');
    
    // Count only digits (no spaces)
    const digitCount = filtered.replace(/\s/g, '').length;
    
    // Apply digit limit
    if (digitCount <= MAX_DIGITS) {
      // Update state
      setNumberPart(filtered);
      
      // Update parent with complete value including country code
      const newValue = `+${selectedCountry.dialCode}${filtered.replace(/\s/g, '')}`;
      onChange(newValue);
    }
  };

  // Display formatted value in input
  const displayValue = numberPart;
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Country selector */}
      <Select
        value={selectedCountry}
        onChange={handleCountryChange}
        options={countries}
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (base, state) => ({
            ...base,
            backgroundColor: 'var(--select-bg)',
            borderColor: error ? '#ef4444' : 'var(--border-color)',
            color: 'var(--text-color)',
            '&:hover': {
              borderColor: error ? '#ef4444' : 'var(--border-hover-color)'
            },
            boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected 
              ? 'var(--option-selected-bg)' 
              : state.isFocused 
                ? 'var(--option-hover-bg)' 
                : 'transparent',
            color: state.isSelected 
              ? 'var(--option-selected-text)' 
              : 'var(--text-color)',
            cursor: 'pointer',
            ':active': {
              backgroundColor: 'var(--option-active-bg)',
            }
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: 'var(--select-bg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }),
          menuList: (base) => ({
            ...base,
            padding: '4px',
          }),
          singleValue: (base) => ({
            ...base,
            color: 'var(--text-color)',
          }),
          input: (base) => ({
            ...base,
            color: 'var(--text-color)',
          }),
          placeholder: (base) => ({
            ...base,
            color: 'var(--placeholder-color)',
          }),
        }}
      />
      
      {/* Phone input field with country code prefix */}
      <div className="flex">
        <div className="bg-gray-100 dark:bg-gray-600 flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600">
          +{selectedCountry.dialCode}
        </div>
        <input
          ref={inputRef}
          type="tel"
          value={displayValue}
          onChange={handleNumberChange}
          className={`flex-1 px-4 py-2 rounded-r-lg border ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          placeholder="555 555 55 55"
          autoComplete="tel-national"
        />
      </div>
      
      {/* Display remaining digit count */}
      <div className="text-xs text-gray-500 text-right">
        {numberPart.replace(/\s/g, '').length}/{MAX_DIGITS} rakam
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};