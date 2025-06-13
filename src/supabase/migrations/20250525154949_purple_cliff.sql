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
DROP POLICY IF EXISTS "Admins can do everything with listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can insert into listing_reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can create reports" ON listing_reports;

-- Create a policy specifically for admin inserts that doesn't check reporter_id
CREATE POLICY "Admins can insert into listing_reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials 
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create a policy for admin to manage all other operations
CREATE POLICY "Admins can manage listing reports"
  ON listing_reports
  FOR ALL
  TO authenticated
  USING (
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

-- Fix the handleReportListing function in ListingsList.tsx by modifying the process_listing_report function
CREATE OR REPLACE FUNCTION process_listing_report(
  p_report_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_listing_id UUID;
  v_report_count INTEGER;
BEGIN
  -- Get listing ID from report
  SELECT listing_id INTO v_listing_id
  FROM listing_reports
  WHERE id = p_report_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update report status
  UPDATE listing_reports
  SET 
    status = p_status,
    resolved_at = NOW(),
    resolved_by = p_admin_id,
    resolution_notes = p_notes
  WHERE id = p_report_id;
  
  -- If approved, check if we need to auto-delete the listing
  IF p_status = 'approved' THEN
    -- Get count of approved reports for this listing
    SELECT COUNT(*) INTO v_report_count
    FROM listing_reports
    WHERE listing_id = v_listing_id AND status = 'approved';
    
    -- If 10 or more reports, delete the listing
    IF v_report_count >= 10 THEN
      DELETE FROM car_listings
      WHERE id = v_listing_id;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;