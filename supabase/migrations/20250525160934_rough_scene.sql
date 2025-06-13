-- Fix admin permissions for deleting listings

-- First ensure RLS is enabled on car_listings
ALTER TABLE car_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admin can manage listings" ON car_listings;

-- Create a new policy for admins to manage listings with proper permissions
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

-- Create a function to allow admins to delete listings
CREATE OR REPLACE FUNCTION admin_delete_listing(p_listing_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete the listing directly, bypassing RLS
  DELETE FROM car_listings
  WHERE id = p_listing_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to allow admins to update listing status
CREATE OR REPLACE FUNCTION admin_update_listing_status(
  p_listing_id UUID,
  p_status TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the listing directly, bypassing RLS
  UPDATE car_listings
  SET 
    status = p_status,
    moderation_reason = p_reason,
    moderated_at = NOW(),
    moderated_by = p_admin_id
  WHERE id = p_listing_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;