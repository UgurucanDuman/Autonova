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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Anon users can insert during registration" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Mesajla ilgili kullanıcıları görebilsin" ON users;
DROP POLICY IF EXISTS "Users can update their own data or admins can update any user" ON users;

-- Create new policies
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Add policy for message-related user visibility
CREATE POLICY "Message-related users visibility"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE (messages.sender_id = users.id AND messages.receiver_id = auth.uid())
      OR (messages.receiver_id = users.id AND messages.sender_id = auth.uid())
    )
  );

-- Add policy for admin updates (without recursion)
CREATE POLICY "Admin updates to users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );