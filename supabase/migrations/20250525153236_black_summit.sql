-- First ensure RLS is enabled
ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can create listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can read listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can update listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can delete listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Regular users can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Regular users can read reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON listing_reports;

-- Create a single comprehensive policy for admins
CREATE POLICY "Admins can do everything with listing reports"
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

-- Create policies for regular users
CREATE POLICY "Regular users can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id AND
    NOT EXISTS (
      SELECT 1 FROM car_listings 
      WHERE car_listings.id = listing_reports.listing_id 
      AND car_listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Regular users can read reports"
  ON listing_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM car_listings 
      WHERE car_listings.id = listing_reports.listing_id 
      AND car_listings.user_id = auth.uid()
    )
  );