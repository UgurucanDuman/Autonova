/*
  # Fix listing reports RLS policy

  1. Changes
    - Add RLS policy to allow admins to create listing reports
    - Ensure admins can manage all listing reports
    - Allow users to create reports for listings they don't own
    - Allow listing owners to view reports about their listings

  2. Security
    - Enable RLS on listing_reports table (already enabled)
    - Add policies for admin and user access
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON listing_reports;

-- Create new policies
CREATE POLICY "Admins can manage listing reports"
ON listing_reports
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

CREATE POLICY "Users can create reports"
ON listing_reports
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow users to report listings they don't own
  auth.uid() = reporter_id AND
  NOT EXISTS (
    SELECT 1 FROM car_listings 
    WHERE car_listings.id = listing_reports.listing_id 
    AND car_listings.user_id = auth.uid()
  )
);

CREATE POLICY "Users can read reports"
ON listing_reports
FOR SELECT
TO authenticated
USING (
  -- Users can see reports they created
  auth.uid() = reporter_id 
  OR 
  -- Listing owners can see reports about their listings
  EXISTS (
    SELECT 1 FROM car_listings 
    WHERE car_listings.id = listing_reports.listing_id 
    AND car_listings.user_id = auth.uid()
  )
);