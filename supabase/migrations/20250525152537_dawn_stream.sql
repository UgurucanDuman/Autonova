-- Fix listing reports RLS policies for admin reporting

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON listing_reports;

-- Create comprehensive admin policy with explicit INSERT permission
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

-- Create policy for users to report listings they don't own
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

-- Create policy for users to view reports
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