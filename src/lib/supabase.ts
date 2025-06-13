import { createClient } from '@supabase/supabase-js';
import { validateCarImage, generateImageHash, generatePerceptualHash } from '../utils/imageValidation';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Helper function to check if error is a Supabase error
const isSupabaseError = (error: any) => {
  return error?.message && typeof error.message === 'string';
};

// Helper function to format error messages
export const formatError = (error: any): string => {
  if (isSupabaseError(error)) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Add retry mechanism for fetch operations with timeout
const fetchWithRetry = async (operation: () => Promise<any>, retries = 3, delay = 2000, timeout = 15000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Connection timeout'));
            });
          })
        ]);

        clearTimeout(timeoutId);
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed:`, error);

      // Check for specific error types
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        console.error('Network error: Could not connect to Supabase');
      } else if (error.message === 'Connection timeout') {
        console.error('Connection timed out');
      } else if (error.name === 'AbortError') {
        console.error('Request aborted due to timeout');
      }

      if (i === retries - 1) throw error;
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i) + jitter));
    }
  }
  throw new Error('All retry attempts failed');
};

// Add the connection status check with improved error handling
export const checkSupabaseConnection = async () => {
  try {
    return await fetchWithRetry(async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) {
        // Check for specific error types
        if (error.code === 'PGRST301') {
          throw new Error('Invalid API key');
        } else if (error.code === '20014') {
          throw new Error('Database connection error');
        } else if (error.code === '503') {
          throw new Error('Service temporarily unavailable');
        }
        
        console.error('Supabase connection error:', error);
        return false;
      }

      return true;
    });
  } catch (err: any) {
    // Provide more detailed error information
    const errorMessage = err.message || 'Unknown error';
    const statusCode = err.status || 'No status code';
    console.error(`Error details - Message: ${errorMessage}, Status: ${statusCode}`);

    // Rethrow with more specific error message
    throw new Error(`Connection failed: ${errorMessage}`);
  }
};

// Add the signUp function with proper auth and profile creation flow
export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  isCorporate = false,
  companyDetails?: {
    companyName: string;
    taxNumber: string;
    phone: string;
    registrationNumber?: string;
  }
) => {
  try {
    // First, create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_corporate: isCorporate
        },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Now create the user profile using the auth user's ID
    const profile: any = {
      id: authData.user.id, // Use the ID from auth.users
      email,
      full_name: fullName,
      is_corporate: isCorporate,
      listing_limit: 1
    };

    if (isCorporate && companyDetails) {
      profile.company_name = companyDetails.companyName;
      profile.tax_number = companyDetails.taxNumber;
      profile.phone = companyDetails.phone;
      profile.registration_number = companyDetails.registrationNumber;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert([profile])
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, attempt to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return { user: authData.user, profile: profileData };
  } catch (error: any) {
    // Handle specific error cases
    if (error.message?.includes('User already registered')) {
      throw new Error('user_already_exists');
    }
    throw error;
  }
};

interface CarListingsFilters {
  brand?: string;
  model?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  features?: string[];
  condition?: string;
  location?: string;
  searchTerm?: string;
}

export const getCarListings = async (filters?: CarListingsFilters) => {
  let query = supabase
    .from('car_listings')
    .select(`
      *,
      car_images (
        id,
        url
      ),
      users (
        id,
        full_name,
        phone,
        profile_image_url
      )
    `);
    
  // Remove the status filter to show all listings
  // This will show all listings regardless of status

  if (filters) {
    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters.model) {
      query = query.ilike('model', `%${filters.model}%`);
    }
    if (filters.minPrice) {
      query = query.gte('price', parseInt(filters.minPrice));
    }
    if (filters.maxPrice) {
      query = query.lte('price', parseInt(filters.maxPrice));
    }
    if (filters.minYear) {
      query = query.gte('year', parseInt(filters.minYear));
    }
    if (filters.maxYear) {
      query = query.lte('year', parseInt(filters.maxYear));
    }
    if (filters.minMileage) {
      query = query.gte('mileage', parseInt(filters.minMileage));
    }
    if (filters.maxMileage) {
      query = query.lte('mileage', parseInt(filters.maxMileage));
    }
    if (filters.fuelType) {
      query = query.eq('fuel_type', filters.fuelType);
    }
    if (filters.transmission) {
      query = query.eq('transmission', filters.transmission);
    }
    if (filters.bodyType) {
      query = query.eq('body_type', filters.bodyType);
    }
    if (filters.color) {
      query = query.eq('color', filters.color);
    }
    if (filters.features && filters.features.length > 0) {
      query = query.contains('features', filters.features);
    }
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
  }

  // Order by featured listings first, then by creation date
  query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
};

export const getCarListingById = async (id: string) => {
  const { data, error } = await supabase
    .from('car_listings')
    .select(`
      *,
      car_images (
        id,
        url
      ),
      users (
        id,
        full_name,
        phone,
        profile_image_url,
        created_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Get listings for a specific user
export const getUserListings = async (userId: string) => {
  const { data, error } = await supabase
    .from('car_listings')
    .select(`
      *,
      car_images (
        id,
        url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

// Message related functions
interface MessageData {
  sender_id: string;
  receiver_id: string;
  listing_id?: string | null;
  content: string;
}

export const sendMessage = async (message: MessageData) => {
  // Validate required fields
  if (!message.sender_id || !message.receiver_id || !message.content) {
    throw new Error('Sender ID, receiver ID, and content are required');
  }

  // Check if sender is blocked
  const { data: senderData, error: senderError } = await supabase
    .from('users')
    .select('is_blocked, block_end_date')
    .eq('id', message.sender_id)
    .single();
    
  if (senderError) throw senderError;
  
  if (senderData.is_blocked) {
    const blockEndDate = senderData.block_end_date ? new Date(senderData.block_end_date) : null;
    const now = new Date();
    
    if (!blockEndDate || blockEndDate > now) {
      throw new Error('Hesabınız engellenmiştir. Mesaj gönderemezsiniz.');
    }
  }

  // Use the bypass RLS function to send the message
  const { data, error } = await supabase.rpc('send_message_bypass_rls', {
    p_sender_id: message.sender_id,
    p_receiver_id: message.receiver_id,
    p_listing_id: message.listing_id || null,
    p_content: message.content
  });

  if (error) {
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Mesaj gönderilemedi');
  }

  // Get the created message
  const { data: messageData, error: messageError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', data.message_id)
    .single();

  if (messageError) {
    throw messageError;
  }

  return messageData;
};

export const getMessages = async (userId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey (
        id,
        full_name,
        email,
        profile_image_url
      ),
      receiver:users!messages_receiver_id_fkey (
        id,
        full_name,
        email,
        profile_image_url
      ),
      listing:car_listings!messages_listing_id_fkey (
        id,
        brand,
        model
      )
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
};

export const deleteMessage = async (messageId: string, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', userId);

  if (error) {
    throw error;
  }
};

interface CarListingData {
  user_id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  price: number;
  currency?: string;
  fuel_type: string;
  transmission: string;
  body_type: string;
  engine_size?: string;
  power?: string;
  doors?: string;
  condition: string;
  location: string;
  description?: string;
  features?: string[];
  warranty?: boolean;
  negotiable?: boolean;
  exchange?: boolean;
}

export const createCarListing = async (listing: CarListingData, images: File[]) => {
  try {
    // Validate all images first
    const validationPromises = images.map(validateCarImage);
    const validationResults = await Promise.all(validationPromises);
    
    const nonCarImages = validationResults.filter(result => !result).length;
    if (nonCarImages > 0) {
      throw new Error('One or more uploaded images do not appear to be car-related. Please upload only car images.');
    }

    // First, insert the car listing
    const { data: carListing, error: listingError } = await supabase
      .from('car_listings')
      .insert([listing])
      .select()
      .single();

    if (listingError) {
      throw listingError;
    }

    // Then upload images and create car_images records with both hashes
    const imagePromises = images.map(async (file) => {
      // Generate both SHA-256 and perceptual hashes
      const [imageHash, perceptualHash] = await Promise.all([
        generateImageHash(file),
        generatePerceptualHash(file)
      ]);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
      const filePath = `${listing.user_id}/${carListing.id}/${fileName}`;

      // Upload the file to storage
      const { error: uploadError, data } = await supabase.storage
        .from('car-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('car-images')
        .getPublicUrl(filePath);

      // Create car_images record with both hashes
      const { error: imageError } = await supabase
        .from('car_images')
        .insert([{
          listing_id: carListing.id,
          url: publicUrl,
          image_hash: imageHash,
          perceptual_hash: perceptualHash
        }]);

      if (imageError) {
        throw imageError;
      }

      return publicUrl;
    });

    // Wait for all images to be processed
    await Promise.all(imagePromises);

    return carListing;
  } catch (error) {
    // If anything fails, attempt to clean up
    throw error;
  }
};

export const updateCarListing = async (id: string, listing: Partial<CarListingData>) => {
  const { data, error } = await supabase
    .from('car_listings')
    .update(listing)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteCarListing = async (id: string) => {
  const { error } = await supabase
    .from('car_listings')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
};

// Account deletion function
export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session found');
    }

    // Get the base URL from the environment
    const baseUrl = supabaseUrl.replace(/\/$/, ''); // Remove trailing slash if present
    const functionUrl = `${baseUrl}/functions/v1/delete_user`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(
          errorData?.error || 
          `Failed to delete account: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      return { success: true };
    } catch (fetchError: any) {
      // Handle network errors specifically
      if (fetchError.name === 'TypeError' && fetchError.message === 'Failed to fetch') {
        throw new Error('Network error: Could not connect to the server. Please check your internet connection and try again.');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while deleting the account' 
    };
  }
};

// Add the missing updateUserProfile function
interface UserProfileData {
  full_name?: string;
  phone?: string;
}

export const updateUserProfile = async (userId: string, profile: UserProfileData) => {
  const { data, error } = await supabase
    .from('users')
    .update(profile)
    .eq('id', userId)
    .select()
    .single(); // maybeSingle yerine single kullandım

  if (error) throw error;
  if (!data) throw new Error('User profile not found');

  return data;
};

// Oturum kontrolü için yardımcı fonksiyon
const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Aktif kullanıcı için yardımcı fonksiyon
const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};