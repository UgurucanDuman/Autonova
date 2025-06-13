import { supabase } from './supabase';

// Storage bucket names
const STORAGE_BUCKETS = {
  CAR_IMAGES: 'car-images',
  CORPORATE_DOCUMENTS: 'corporate-documents',
  PROFILE_IMAGES: 'profile-images',
};

// Verify storage buckets exist
export const setupStorage = async () => {
  try {
    console.log('Verifying storage buckets...');
    
    // Check if buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const existingBuckets = new Set(buckets.map(bucket => bucket.name));
    const requiredBuckets = Object.values(STORAGE_BUCKETS);
    const missingBuckets = requiredBuckets.filter(bucket => !existingBuckets.has(bucket));

    if (missingBuckets.length > 0) {
      console.warn('Missing required storage buckets:', missingBuckets);
      console.warn('Please ensure these buckets are created in the Supabase dashboard');
    } else {
      console.log('All required storage buckets are available');
    }
    
    console.log('Storage verification complete');
    return true;
  } catch (error) {
    console.error('Error verifying storage:', error);
    return false;
  }
};

// Upload a car image
export const uploadCarImage = async (userId: string, listingId: string, file: File) => {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${listingId}/${fileName}`;

    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.CAR_IMAGES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.CAR_IMAGES)
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  } catch (error) {
    console.error('Error uploading car image:', error);
    throw error;
  }
};

// Upload a corporate document
export const uploadCorporateDocument = async (userId: string, documentType: string, file: File) => {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Geçersiz dosya türü. İzin verilen türler: ${allowedTypes.join(', ')}`);
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Dosya boyutu çok büyük. Maksimum boyut: 10MB`);
    }
    
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${documentType}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.CORPORATE_DOCUMENTS)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.CORPORATE_DOCUMENTS)
      .getPublicUrl(filePath);

    return { 
      url: publicUrl, 
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type
    };
  } catch (error) {
    console.error('Error uploading corporate document:', error);
    throw error;
  }
};

// Upload a profile image
export const uploadProfileImage = async (userId: string, file: File) => {
  try {
    // Check file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Dosya boyutu 5MB\'dan küçük olmalıdır');
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Lütfen bir resim dosyası yükleyin');
    }
    
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_IMAGES)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Replace if exists
      });

    if (uploadError) throw uploadError;

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_IMAGES)
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

// Delete a file from storage
const deleteFile = async (bucket: string, filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting file from ${bucket}:`, error);
    throw error;
  }
};

// Delete all files in a folder
const deleteFolder = async (bucket: string, folderPath: string) => {
  try {
    // List all files in the folder
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folderPath);

    if (listError) throw listError;

    if (files && files.length > 0) {
      // Create an array of file paths to delete
      const filePaths = files.map(file => `${folderPath}/${file.name}`);
      
      // Delete all files
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(filePaths);

      if (deleteError) throw deleteError;
    }

    return true;
  } catch (error) {
    console.error(`Error deleting folder from ${bucket}:`, error);
    throw error;
  }
};

// Get a temporary URL for a private file
const getPrivateFileUrl = async (bucket: string, filePath: string, expiresIn = 60) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting private file URL:', error);
    throw error;
  }
};