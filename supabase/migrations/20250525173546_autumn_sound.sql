/*
  # Fix Admin Listings Visibility

  1. Changes
    - Update RLS policies for car_listings to ensure admins can see all listings
    - Fix the policy that allows admins to manage listings
    - Add a specific policy for admins to view all listings regardless of status
*/

-- First ensure RLS is enabled
ALTER TABLE car_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admin can manage listings" ON car_listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON car_listings;

-- Create a policy for admins to manage all listings
CREATE POLICY "Admin can manage listings"
  ON car_listings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create a specific policy for admins to view all listings
CREATE POLICY "Admins can view all listings"
  ON car_listings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Update the public policy to ensure it doesn't conflict
DROP POLICY IF EXISTS "Anyone can read approved listings" ON car_listings;
CREATE POLICY "Anyone can read approved listings"
  ON car_listings
  FOR SELECT
  USING (
    status = 'approved' OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create a function to allow admins to view all listings
CREATE OR REPLACE FUNCTION admin_view_all_listings()
RETURNS SETOF car_listings AS $$
BEGIN
  RETURN QUERY SELECT * FROM car_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;