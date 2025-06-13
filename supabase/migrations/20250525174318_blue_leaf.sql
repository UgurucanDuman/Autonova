-- Create a function to allow admins to view all listings regardless of status
CREATE OR REPLACE FUNCTION admin_view_all_listings()
RETURNS SETOF car_listings AS $$
BEGIN
  RETURN QUERY SELECT * FROM car_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- Fix the UUID comparison by casting to text
CREATE POLICY "Admins can view all listings"
  ON car_listings
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id::text = (current_setting('request.jwt.claims', true)::json->>'sub')::text
    )
  );