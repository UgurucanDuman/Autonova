import React, { useState, useEffect } from 'react';
import { User, Camera, Trash2 } from 'lucide-react';
import { uploadProfileImage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileImageUploaderProps {
  userId: string;
  currentImageUrl?: string | null;
  onImageUploaded?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProfileImageUploader: React.FC<ProfileImageUploaderProps> = ({
  userId,
  currentImageUrl = null,
  onImageUploaded,
  size = 'md',
  className = '',
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update imageUrl when currentImageUrl changes
  useEffect(() => {
    setImageUrl(currentImageUrl);
  }, [currentImageUrl]);

  // Size classes
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir resim dosyası yükleyin');
      toast.error('Lütfen bir resim dosyası yükleyin');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Resim boyutu 5MB\'dan küçük olmalıdır');
      toast.error('Resim boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadProfileImage(userId, file);
      
      // Update user profile with new image URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: result.url })
        .eq('id', userId);

      if (updateError) throw updateError;

      setImageUrl(result.url);
      if (onImageUploaded) {
        onImageUploaded(result.url);
      }
      toast.success('Profil resmi güncellendi');
    } catch (err) {
      console.error('Error uploading profile image:', err);
      setError('Resim yüklenirken bir hata oluştu');
      toast.error('Resim yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    setUploading(true);
    try {
      // Update user profile to remove image URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      setImageUrl(null);
      if (onImageUploaded) {
        onImageUploaded('');
      }
      toast.success('Profil resmi kaldırıldı');
    } catch (err) {
      console.error('Error removing profile image:', err);
      toast.error('Profil resmi kaldırılamadı');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative group`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-1/2 h-1/2 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <label className="cursor-pointer p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={uploading}
                className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};