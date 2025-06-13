import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploadPreviewProps {
  images: File[];
  previews: string[];
  onRemove: (index: number) => void;
  maxImages?: number;
  className?: string;
}

export const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
  images,
  previews,
  onRemove,
  maxImages = 16,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(previews.length > 0 ? 0 : null);

  // Update selected index when previews change
  useEffect(() => {
    if (previews.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    } else if (previews.length === 0) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex >= previews.length) {
      setSelectedIndex(previews.length - 1);
    }
  }, [previews, selectedIndex]);

  if (previews.length === 0) {
    return (
      <div className={`flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No images uploaded yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Upload up to {maxImages} images
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main preview */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {selectedIndex !== null && (
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={previews[selectedIndex]}
              alt={`Preview ${selectedIndex + 1}`}
              className="w-full h-full object-contain"
            />
          </AnimatePresence>
        )}
        
        {/* Image counter */}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {selectedIndex !== null ? selectedIndex + 1 : 0}/{previews.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {previews.map((preview, index) => (
          <div 
            key={index} 
            className={`relative group cursor-pointer aspect-square rounded-lg overflow-hidden border-2 ${
              selectedIndex === index 
                ? 'border-blue-500 dark:border-blue-400' 
                : 'border-transparent'
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <img 
              src={preview} 
              alt={`Thumbnail ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, maxImages - previews.length) }).map((_, index) => (
          <div 
            key={`empty-${index}`} 
            className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
          >
            <span className="text-xs text-gray-400">+</span>
          </div>
        ))}
      </div>

      {/* Warning if approaching limit */}
      {previews.length > maxImages * 0.75 && (
        <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>
            {previews.length}/{maxImages} images uploaded
          </span>
        </div>
      )}
    </div>
  );
};