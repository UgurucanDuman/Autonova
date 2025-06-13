import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, FileText, Image } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  onFileRemoved?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  description?: string;
  currentFile?: { name: string; url: string } | null;
  error?: string;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  onFileRemoved,
  accept = 'image/*',
  maxSize = 5, // Default 5MB
  label = 'Upload a file',
  description = 'PNG, JPG, GIF up to 5MB',
  currentFile = null,
  error,
  className = '',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentFile?.url || null);
  const [fileName, setFileName] = useState<string>(currentFile?.name || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndProcessFile(selectedFile);
    }
  };

  const validateAndProcessFile = (selectedFile: File) => {
    // Check file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      toast.error(`Dosya çok büyük. Maksimum boyut ${maxSize}MB.`);
      return;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    let isValidType = false;
    
    for (const type of acceptedTypes) {
      // Handle wildcards like image/* or application/*
      if (type.endsWith('/*')) {
        const mainType = type.split('/')[0];
        if (selectedFile.type.startsWith(mainType + '/')) {
          isValidType = true;
          break;
        }
      } else {
        if (selectedFile.type === type) {
          isValidType = true;
          break;
        }
      }
    }
    
    if (!isValidType) {
      toast.error(`Geçersiz dosya türü. Lütfen ${acceptedTypes.join(', ')} formatında dosya yükleyin.`);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    onFileSelected(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // For non-image files, just show an icon
      setPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileRemoved) {
      onFileRemoved();
    }
  };

  const isImage = preview || (file && file.type.startsWith('image/'));
  const isPdf = file && file.type === 'application/pdf';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div
        className={`border-2 border-dashed rounded-lg transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : error 
              ? 'border-red-300 dark:border-red-700' 
              : 'border-gray-300 dark:border-gray-600'
        } ${preview ? 'p-2' : 'p-6'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative">
            {isImage ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-40 object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">{fileName}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              {accept.includes('image') ? (
                <Image className="mx-auto h-12 w-12 text-gray-400" />
              ) : (
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
              )}
            </div>
            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md bg-white dark:bg-gray-800 font-semibold text-blue-600 dark:text-blue-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
              >
                <span>Dosya Yükle</span>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept={accept}
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">veya sürükleyip bırakın</p>
            </div>
            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};