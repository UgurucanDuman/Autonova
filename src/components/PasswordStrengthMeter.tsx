import React from 'react';
import { motion } from 'framer-motion';
import { getPasswordStrength } from '../lib/validation';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);
  const maxScore = 6;
  const percentage = (score / maxScore) * 100;

  return (
    <div className="space-y-1">
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div 
          className={`h-full ${color} transition-colors`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600 dark:text-gray-400">Şifre Gücü:</span>
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-medium ${
            color.includes('red') ? 'text-red-500' :
            color.includes('orange') ? 'text-orange-500' :
            color.includes('yellow') ? 'text-yellow-500' :
            'text-green-500'
          }`}
        >
          {label}
        </motion.span>
      </div>
    </div>
  );
};