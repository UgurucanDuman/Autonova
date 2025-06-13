/*
  # Initial Database Schema for Car Marketplace Application

  1. New Tables
    - `users` - Stores user profile information
    - `car_listings` - Stores car listing information
    - `car_images` - Stores images for car listings
    - `messages` - Stores messages between users
    - `admin_credentials` - Stores admin user information
    - `admin_verification_codes` - Stores verification codes for admin 2FA
    - `verification_codes` - Stores phone verification codes
    - `email_verifications` - Stores email verification codes
    - `corporate_documents` - Stores documents for corporate users
    - `document_requirements` - Stores document requirements for corporate users
    - `listing_reports` - Stores reports for listings
    - `user_blocks` - Stores user block history
    - `corporate_approval_history` - Stores corporate approval history
    - `listing_purchase_requests` - Stores listing purchase requests
    - `listing_purchases` - Stores completed listing purchases
    - `social_media_settings` - Stores social media integration settings
    - `social_share_requests` - Stores social media share requests
    - `social_shares` - Stores completed social media shares
    - `notification_templates` - Stores notification templates
    - `notification_logs` - Stores notification logs

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  is_corporate BOOLEAN DEFAULT FALSE,
  company_name TEXT,
  tax_number TEXT,
  registration_number TEXT,
  approval_status TEXT DEFAULT 'pending',
  approval_requested_at TIMESTAMPTZ,
  approval_deadline TIMESTAMPTZ,
  approval_date TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID,
  block_end_date TIMESTAMPTZ,
  role TEXT DEFAULT 'user',
  listing_limit INTEGER DEFAULT 1,
  paid_listing_limit INTEGER DEFAULT 0,
  instagram_enabled BOOLEAN DEFAULT FALSE,
  facebook_enabled BOOLEAN DEFAULT FALSE,
  twitter_enabled BOOLEAN DEFAULT FALSE,
  last_document_submitted_at TIMESTAMPTZ,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anon users can insert during registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Car Listings Table
CREATE TABLE IF NOT EXISTS car_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  color TEXT NOT NULL,
  price DECIMAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  fuel_type TEXT NOT NULL,
  transmission TEXT NOT NULL,
  body_type TEXT NOT NULL,
  engine_size TEXT,
  power TEXT,
  doors TEXT,
  condition TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  features TEXT[],
  warranty BOOLEAN DEFAULT FALSE,
  negotiable BOOLEAN DEFAULT FALSE,
  exchange BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT FALSE,
  moderation_reason TEXT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE car_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved listings"
  ON car_listings
  FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own listings"
  ON car_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can update their own listings"
  ON car_listings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can delete their own listings"
  ON car_listings
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

-- Car Images Table
CREATE TABLE IF NOT EXISTS car_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE car_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read car images"
  ON car_images
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create images for their own listings"
  ON car_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE id = listing_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images for their own listings"
  ON car_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE id = listing_id AND user_id = auth.uid()
    )
  );

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES car_listings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can delete their own sent messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Admin Credentials Table
CREATE TABLE IF NOT EXISTS admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  identity_verified BOOLEAN DEFAULT FALSE,
  identity_verified_at TIMESTAMPTZ,
  identity_verification_required BOOLEAN DEFAULT TRUE,
  id_number TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage admin_credentials"
  ON admin_credentials
  FOR ALL
  TO public
  USING (true);

-- Admin Verification Codes Table
CREATE TABLE IF NOT EXISTS admin_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_credentials(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_verification_codes ENABLE ROW LEVEL SECURITY;

-- Verification Codes Table (Phone)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Email Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Document Requirements Table
CREATE TABLE IF NOT EXISTS document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT TRUE,
  max_size_mb INTEGER DEFAULT 5,
  allowed_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read document requirements"
  ON document_requirements
  FOR SELECT
  USING (TRUE);

-- Corporate Documents Table
CREATE TABLE IF NOT EXISTS corporate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE corporate_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own documents"
  ON corporate_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON corporate_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Listing Reports Table
CREATE TABLE IF NOT EXISTS listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports"
  ON listing_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR 
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE id = listing_id AND user_id = auth.uid()
    )
  );

-- User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert into user_blocks"
  ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read user_blocks"
  ON user_blocks
  FOR SELECT
  TO authenticated
  USING (true);

-- Corporate Approval History Table
CREATE TABLE IF NOT EXISTS corporate_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE corporate_approval_history ENABLE ROW LEVEL SECURITY;

-- Listing Purchase Requests Table
CREATE TABLE IF NOT EXISTS listing_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_id UUID,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own purchase requests"
  ON listing_purchase_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchase requests"
  ON listing_purchase_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Listing Purchases Table
CREATE TABLE IF NOT EXISTS listing_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  price DECIMAL NOT NULL,
  payment_id TEXT,
  status TEXT DEFAULT 'completed',
  admin_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own purchases"
  ON listing_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Social Media Settings Table
CREATE TABLE IF NOT EXISTS social_media_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  instagram_api_key TEXT,
  facebook_api_key TEXT,
  twitter_api_key TEXT,
  instagram_username TEXT,
  facebook_page_id TEXT,
  twitter_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_media_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read social media settings"
  ON social_media_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update social media settings"
  ON social_media_settings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert social media settings"
  ON social_media_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Social Share Requests Table
CREATE TABLE IF NOT EXISTS social_share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_share_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own share requests"
  ON social_share_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create share requests"
  ON social_share_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Social Shares Table
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own shares"
  ON social_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create extension for password hashing if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;