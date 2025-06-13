import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, TrendingUp, Zap } from 'lucide-react';

interface ValidationFeedbackProps {
  isValid: boolean;
  confidence: number;
  reason?: string;
  suggestions?: string[];
  className?: string;
  compact?: boolean;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  isValid,
  confidence,
  reason,
  suggestions,
  className = '',
  compact = false
}) => {
  const getStatusColor = () => {
    if (isValid && confidence >= 0.8) return 'green';
    if (isValid && confidence >= 0.6) return 'yellow';
    return 'red';
  };

  const getStatusIcon = () => {
    const color = getStatusColor();
    switch (color) {
      case 'green':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'yellow':
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusMessage = () => {
    if (isValid && confidence >= 0.8) return 'Mükemmel araç fotoğrafı!';
    if (isValid && confidence >= 0.6) return 'Kabul edilebilir araç fotoğrafı';
    return 'Araç fotoğrafı olarak tanınmadı';
  };

  const color = getStatusColor();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${
              color === 'green' 
                ? 'text-green-700 dark:text-green-300' 
                : color === 'yellow'
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-red-700 dark:text-red-300'
            }`}>
              {getStatusMessage()}
            </span>
            <span className={`text-xs font-bold ${
              confidence >= 0.8 
                ? 'text-green-600 dark:text-green-400'
                : confidence >= 0.6
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              %{Math.round(confidence * 100)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
            <div 
              className={`h-1 rounded-full transition-all duration-500 ${
                confidence >= 0.8 
                  ? 'bg-green-500'
                  : confidence >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status Header */}
      <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
        color === 'green' 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : color === 'yellow'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`font-medium text-sm ${
            color === 'green' 
              ? 'text-green-800 dark:text-green-300' 
              : color === 'yellow'
                ? 'text-yellow-800 dark:text-yellow-300'
                : 'text-red-800 dark:text-red-300'
          }`}>
            {getStatusMessage()}
          </p>
          {reason && (
            <p className={`text-xs mt-1 ${
              color === 'green' 
                ? 'text-green-600 dark:text-green-400' 
                : color === 'yellow'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {reason}
            </p>
          )}
        </div>
      </div>

      {/* Confidence Score */}
      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              AI Güven Skoru
            </span>
            <span className={`text-xs font-bold ${
              confidence >= 0.8 
                ? 'text-green-600 dark:text-green-400'
                : confidence >= 0.6
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              %{Math.round(confidence * 100)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                confidence >= 0.8 
                  ? 'bg-green-500'
                  : confidence >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-2">
                Fotoğraf Kalitesini Artırma Önerileri:
              </p>
              <ul className="space-y-1">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="text-xs text-blue-700 dark:text-blue-400 flex items-start">
                    <span className="mr-2 text-blue-500">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};