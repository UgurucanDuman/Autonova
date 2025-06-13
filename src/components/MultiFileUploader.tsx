import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle, Car } from 'lucide-react';
import { validateCarImage, isProhibitedContent, validateImageMetadata, generateImageHash, generatePerceptualHash, checkDuplicateImage } from '../utils/imageValidation';
import toast from 'react-hot-toast';
import { CarImageValidator } from '../utils/validation/carImageValidator';
import { useAuth } from './AuthContext';

interface MultiFileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  accept?: string;
  maxSize?: number; // MB
  maxFiles?: number;
  label?: string;
  description?: string;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
  onFilesSelected,
  onFileRemoved,
  accept = 'image/*',
  maxSize = 30,
  maxFiles = 16,
  label = 'Dosya Yükle',
  description = 'Dosyalarınızı buraya sürükleyin veya tıklayın',
  minWidth = 1280,
  minHeight = 720,
  className = ''
}) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [validatingFiles, setValidatingFiles] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<{ [key: string]: boolean }>({});
  const [validationProgress, setValidationProgress] = useState<number>(0);
  const [currentValidationStep, setCurrentValidationStep] = useState<string>('');

  const validateImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isValidSize = img.width >= minWidth && img.height >= minHeight;
        resolve(isValidSize);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  const validateSingleFile = async (file: File, index: number, total: number): Promise<{ isValid: boolean; reason?: string }> => {
    try {
      const baseProgress = (index / total) * 100;
      setValidationProgress(baseProgress);
      setCurrentValidationStep(`Dosya ${index + 1}/${total} kontrol ediliyor...`);
      
      // 1. Dosya boyutu kontrolü
      setCurrentValidationStep('Dosya boyutu kontrol ediliyor...');
      if (file.size > maxSize * 1024 * 1024) {
        return { isValid: false, reason: `Dosya boyutu ${maxSize}MB'dan büyük olamaz` };
      }
  
      // 2. Dosya türü kontrolü
      setCurrentValidationStep('Dosya türü kontrol ediliyor...');
      if (!file.type.startsWith('image/')) {
        return { isValid: false, reason: 'Sadece resim dosyaları kabul edilir' };
      }
  
      // 3. Çözünürlük kontrolü
      setCurrentValidationStep('Çözünürlük kontrol ediliyor...');
      const hasValidDimensions = await validateImageDimensions(file);
      if (!hasValidDimensions) {
        return { isValid: false, reason: `Minimum çözünürlük ${minWidth}x${minHeight} olmalıdır` };
      }

      // 4. GÜÇLÜ Duplicate image kontrolü (sadece giriş yapmış kullanıcılar için)
      if (user?.id) {
        try {
          setCurrentValidationStep('Duplicate kontrol ediliyor...');
          setValidationProgress(baseProgress + 20);
          
          // Hem SHA-256 hem de perceptual hash oluştur
          const [imageHash, perceptualHash] = await Promise.all([
            generateImageHash(file),
            generatePerceptualHash(file)
          ]);
          
          const duplicateCheck = await checkDuplicateImage(user.id, imageHash, perceptualHash);
          
          if (duplicateCheck.isDuplicate && duplicateCheck.existingListing) {
            const listing = duplicateCheck.existingListing;
            const duplicateTypeText = duplicateCheck.duplicateType === 'exact' 
              ? 'Bu fotoğrafı' 
              : 'Bu fotoğrafa çok benzer bir fotoğrafı';
            
            return { 
              isValid: false, 
              reason: `${duplicateTypeText} daha önce "${listing.brand} ${listing.model} ${listing.year}" ilanınızda kullanmışsınız. Aynı veya benzer fotoğrafları tekrar kullanamazsınız.`
            };
          }
        } catch (error) {
          console.warn('Duplicate check failed:', error);
          // Duplicate check başarısız olursa devam et ama uyarı ver
          toast.warning('Duplicate kontrolü yapılamadı, fotoğraf yine de kontrol edilecek');
        }
      }
  
      // 5. CarImageValidator ile detaylı doğrulama
      setCurrentValidationStep('AI ile fotoğraf analiz ediliyor...');
      setValidationProgress(baseProgress + 40);
      
      const validator = CarImageValidator.getInstance();
      const validationResult = await validator.validateCarImage(file);
  
      if (!validationResult.isValid) {
        return { 
          isValid: false, 
          reason: validationResult.reason || 'Fotoğraf araç fotoğrafı olarak doğrulanamadı'
        };
      }
  
      // Eğer confidence skoru düşükse uyarı göster
      if (validationResult.confidence < 0.7) {
        toast.warning('Fotoğraf kalitesi düşük olabilir. Daha net bir fotoğraf yüklemeniz önerilir.');
      }
  
      // Öneriler varsa göster
      if (validationResult.suggestions?.length > 0) {
        validationResult.suggestions.forEach(suggestion => {
          toast.info(suggestion);
        });
      }
  
      setValidationProgress(baseProgress + 60);
      return { isValid: true };
    } catch (error) {
      console.error('Fotoğraf doğrulama hatası:', error);
      return { 
        isValid: false, 
        reason: 'Fotoğraf doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.'
      };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    setValidatingFiles(true);
    setValidationProgress(0);
    setCurrentValidationStep('Doğrulama başlatılıyor...');
    
    const newValidationResults: { [key: string]: boolean } = {};
    const validFiles: File[] = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const validation = await validateSingleFile(file, i, acceptedFiles.length);
      
      if (validation.isValid) {
        validFiles.push(file);
        newValidationResults[file.name] = true;
        toast.success(`${file.name} başarıyla doğrulandı`);
      } else {
        newValidationResults[file.name] = false;
        toast.error(`${file.name}: ${validation.reason}`);
      }
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      setValidationResults(prev => ({ ...prev, ...newValidationResults }));
      onFilesSelected(updatedFiles);
    }

    setValidatingFiles(false);
    setValidationProgress(0);
    setCurrentValidationStep('');
  }, [files, maxFiles, maxSize, minWidth, minHeight, onFilesSelected, user?.id]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFileRemoved(index);
    onFilesSelected(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: maxSize * 1024 * 1024,
    multiple: true,
    disabled: validatingFiles
  });

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        } ${validatingFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {validatingFiles ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-16 h-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                <Car className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                  AI ile Fotoğraflar Analiz Ediliyor...
                </p>
                <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${validationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {currentValidationStep}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  %{Math.round(validationProgress)} tamamlandı
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Sadece araç fotoğrafları kabul edilir • {maxSize}MB'a kadar • En fazla {maxFiles} dosya
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Yüklenen Dosyalar ({files.length}/{maxFiles})</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {validationResults[file.name] ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Önemli Uyarı</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Sadece aracınızın fotoğraflarını yükleyin. Kişi, hayvan, yemek, bina veya diğer içerikler kabul edilmez. 
              Sistem otomatik olarak araç fotoğrafı olmayan görselleri reddedecektir.
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 font-medium">
              ⚠️ Daha önce kullandığınız fotoğrafları tekrar yükleyemezsiniz. Sistem hem tam aynı hem de benzer fotoğrafları tespit eder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const validateImage = async (file: File) => {
  const validator = CarImageValidator.getInstance();
  const result = await validator.validateCarImage(file);
  
  if (!result.isValid) {
    throw new Error(result.reason || 'Geçersiz araç fotoğrafı');
  }
  
  return true;
};

const handleFileSelect = async (files: FileList) => {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of Array.from(files)) {
    try {
      // Boyut ve format kontrolü
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name}: Dosya boyutu çok büyük`);
        continue;
      }

      // Görüntü boyutları kontrolü
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < minWidth || dimensions.height < minHeight) {
        errors.push(`${file.name}: Görüntü boyutları yetersiz`);
        continue;
      }

      // Araç fotoğrafı doğrulama
      await validateImage(file);
      validFiles.push(file);

    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    setError(errors.join('\n'));
  }

  if (validFiles.length > 0) {
    onFilesSelected(validFiles);
  }
};