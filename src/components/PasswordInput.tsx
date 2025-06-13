import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validatePassword } from '../lib/validation';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrengthMeter?: boolean;
  required?: boolean;
  minLength?: number;
  id?: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = '••••••••',
  showStrengthMeter = false,
  required = true,
  minLength = 8,
  id,
  error
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (newValue) {
      const validation = validatePassword(newValue);
      setValidationError(validation.error);
    } else {
      setValidationError(undefined);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Lock icon without any animations */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <Lock 
            className={`w-5 h-5 transition-colors duration-200 ${
              isFocused ? 'text-blue-500' : 'text-gray-400'
            }`} 
          />
        </div>
        
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`pl-10 pr-10 py-2 w-full rounded-lg border transition-all duration-200 ${
            error || validationError
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
          } dark:bg-gray-700 dark:text-white focus:ring-2 focus:border-transparent ${
            isFocused ? 'ring-2 ring-blue-500' : ''
          }`}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete="current-password"
        />

        {/* Simplified eye button without excessive animations */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center w-6 h-6"
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {showStrengthMeter && value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PasswordStrengthMeter password={value} />
          </motion.div>
        )}

        {(error || validationError) && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-500"
          >
            {error || validationError}
          </motion.p>
        )}

        {showStrengthMeter && !value && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside"
          >
            <li>En az 8, en fazla 16 karakter</li>
            <li>En az bir büyük harf</li>
            <li>En az bir küçük harf</li>
            <li>En az bir rakam</li>
            <li>En az bir özel karakter (!@#$%^&*(),.?":{}|&lt;&gt;)</li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};