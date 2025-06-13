/*
  # Storage Setup for Car Marketplace

  1. Storage Buckets
    - Create storage buckets for car images, corporate documents, and profile images
    - Set appropriate security policies for each bucket

  2. Storage Policies
    - Allow users to upload and manage their own files
    - Make car images publicly accessible
    - Keep corporate documents private but accessible to admins
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('car-images', 'Car Images', true, 30000000, ARRAY['image/jpeg', 'image/png', 'image/webp']), -- 30MB limit
  ('corporate-documents', 'Corporate Documents', false, 10000000, ARRAY['image/jpeg', 'image/png', 'application/pdf']), -- 10MB limit
  ('profile-images', 'Profile Images', true, 5000000, ARRAY['image/jpeg', 'image/png', 'image/webp']) -- 5MB limit
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create buckets (needed for initialization)
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow public access to car-images bucket
CREATE POLICY "Allow public access to car-images bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'car-images');

-- Allow authenticated users to manage their car images
CREATE POLICY "Allow users to manage their car images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'car-images' 
  AND (
    -- Allow access if user owns the listing
    EXISTS (
      SELECT 1 FROM public.car_listings
      WHERE car_listings.user_id = auth.uid()
      AND storage.objects.name LIKE (car_listings.id || '/%')
    )
    OR
    -- Allow access if path starts with user's ID
    storage.objects.name LIKE (auth.uid() || '/%')
  )
);

-- Allow public access to profile-images bucket
CREATE POLICY "Allow public access to profile-images bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- Allow users to manage their own profile images
CREATE POLICY "Allow users to manage their profile images"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND storage.objects.name LIKE (auth.uid() || '/%')
);

-- Allow authenticated users to manage their corporate documents
CREATE POLICY "Allow users to manage their corporate documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'corporate-documents'
  AND storage.objects.name LIKE (auth.uid() || '/%')
);