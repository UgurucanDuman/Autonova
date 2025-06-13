import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle, Car, Camera, Zap, Eye, Lightbulb } from 'lucide-react';
import { validateCarImageDetailed } from '../../utils/validation';
import { ValidationFeedback } from '../feedback/ValidationFeedback';
import toast from 'react-hot-toast';
import type { FileWithValidation } from '../../utils/validation/types';

interface EnhancedMultiFileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  label?: string;
  description?: string;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export const EnhancedMultiFileUploader: React.FC<EnhancedMultiFileUploaderProps> = ({
  onFilesSelected,
  onFileRemoved,
  accept = 'image/*',
  maxSize = 30,
  maxFiles = 16,
  label = 'Araç Fotoğrafları Yükle',
  description = 'Fotoğraflarınızı buraya sürükleyin veya tıklayın',
  minWidth = 1280,
  minHeight = 720,
  className = ''
}) => {
  const [files, setFiles] = useState<FileWithValidation[]>([]);
  const [validatingFiles, setValidatingFiles] = useState<boolean>(false);
  const [validationProgress, setValidationProgress] = useState<number>(0);

  const validateSingleFile = async (file: File, index: number, total: number): Promise<FileWithValidation> => {
    try {
      setValidationProgress((index / total) * 100);
      
      const validation = await validateCarImageDetailed(file);
      const preview = URL.createObjectURL(file);
      
      const fileWithValidation: FileWithValidation = Object.assign(file, {
        validation,
        preview
      });

      if (validation.isValid) {
        toast.success(`${file.name} başarıyla doğrulandı (Güven: ${Math.round(validation.confidence * 100)}%)`);
      } else {
        toast.error(`${file.name}: ${validation.reason}`);
      }

      return fileWithValidation;
    } catch (error) {
      console.error('Doğrulama hatası:', error);
      const failedValidation = {
        isValid: false,
        confidence: 0,
        reason: 'Doğrulama sırasında hata oluştu',
        suggestions: ['Dosyayı tekrar yüklemeyi deneyin', 'Farklı bir fotoğraf seçin']
      };
      
      return Object.assign(file, { validation: failedValidation });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`En fazla ${maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    setValidatingFiles(true);
    setValidationProgress(0);

    try {
      const validatedFiles: FileWithValidation[] = [];
      
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const validatedFile = await validateSingleFile(file, i, acceptedFiles.length);
        validatedFiles.push(validatedFile);
      }

      const validFiles = validatedFiles.filter(f => f.validation?.isValid);
      const updatedFiles = [...files, ...validFiles];
      
      setFiles(updatedFiles);
      onFilesSelected(updatedFiles);

      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} fotoğraf başarıyla eklendi`);
      }

      if (validFiles.length < acceptedFiles.length) {
        toast.error(`${acceptedFiles.length - validFiles.length} fotoğraf reddedildi`);
        // veya daha özel bir stil için:
        // toast.custom(`${acceptedFiles.length - validFiles.length} fotoğraf reddedildi`, {
        //   icon: '⚠️',
        //   style: { background: '#FEF3C7', color: '#92400E' }
        // });
      }

    } catch (error) {
      console.error('Toplu doğrulama hatası:', error);
      toast.error('Fotoğraflar doğrulanırken hata oluştu');
    } finally {
      setValidatingFiles(false);
      setValidationProgress(0);
    }
  }, [files, maxFiles, onFilesSelected]);

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
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
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        } ${validatingFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {validatingFiles ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <Zap className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                  AI ile Fotoğraflar Analiz Ediliyor...
                </p>
                <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${validationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  %{Math.round(validationProgress)} tamamlandı
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Camera className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  AI destekli araç fotoğrafı doğrulama • {maxSize}MB'a kadar • En fazla {maxFiles} dosya
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">
              Yüklenen Fotoğraflar ({files.length}/{maxFiles})
            </h4>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Geçerli: {files.filter(f => f.validation?.isValid).length}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative p-4 rounded-xl border-2 transition-all duration-300 bg-white dark:bg-gray-800 shadow-sm"
              >
                {/* Preview Image */}
                {file.preview && (
                  <div className="w-full h-32 mb-3 rounded-lg overflow-hidden">
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* File Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-2 p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Validation Feedback */}
                {file.validation && (
                  <ValidationFeedback
                    isValid={file.validation.isValid}
                    confidence={file.validation.confidence}
                    reason={file.validation.reason}
                    suggestions={file.validation.suggestions}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
              AI Destekli Doğrulama
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Fotoğraflarınız yapay zeka ile analiz ediliyor. Sistem araç fotoğrafı olmayan görselleri otomatik olarak tespit eder ve reddeder.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <Eye className="w-3 h-3 mr-1" />
                Görsel Analiz
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Kalite Kontrolü
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                <Car className="w-3 h-3 mr-1" />
                Araç Tespiti
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};