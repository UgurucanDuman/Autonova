interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  created_at: string;
  profile_image_url?: string;
}

export interface CarListing {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  price: number;
  currency?: string; // Added currency field
  fuel_type: string;
  transmission: string;
  location: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  features?: string[];
  warranty?: boolean;
  negotiable?: boolean;
  exchange?: boolean;
  car_images?: CarImage[];
  users?: User;
  moderation_reason?: string;
}

interface CarImage {
  id: string;
  listing_id: string;
  url: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id?: string | null;
  content: string;
  created_at: string;
  read?: boolean;
  sender?: User;
  receiver?: User;
  listing?: CarListing;
  isOptimistic?: boolean;
}

interface Review {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  replies?: ReviewReply[];
}

interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Define Database interface for type safety with Supabase
interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<User, 'id'>>;
      };
      car_listings: {
        Row: CarListing;
        Insert: Omit<CarListing, 'id' | 'created_at' | 'updated_at'> & { 
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CarListing, 'id'>>;
      };
      car_images: {
        Row: CarImage;
        Insert: Omit<CarImage, 'id' | 'created_at'> & { 
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CarImage, 'id'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'> & { 
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Message, 'id'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Review, 'id'>>;
      };
      review_replies: {
        Row: ReviewReply;
        Insert: Omit<ReviewReply, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ReviewReply, 'id'>>;
      };
    };
    Functions: {
      can_review_listing: {
        Args: { p_user_id: string; p_listing_id: string };
        Returns: boolean;
      };
      get_listing_rating_stats: {
        Args: { p_listing_id: string };
        Returns: {
          average_rating: number;
          review_count: number;
          distribution: {
            '1': number;
            '2': number;
            '3': number;
            '4': number;
            '5': number;
          };
        };
      };
    };
  };
}