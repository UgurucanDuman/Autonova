-- Fix listing reports policies and auto-delete functionality

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON listing_reports;

-- Create policy to allow admins to manage all listing reports
CREATE POLICY "Admin can manage listing reports"
  ON listing_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create policy for regular users to create reports
CREATE POLICY "Users can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Create policy for users to read their own reports
CREATE POLICY "Users can read their own reports"
  ON listing_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR 
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE car_listings.id = listing_reports.listing_id AND car_listings.user_id = auth.uid()
    )
  );

-- Fix auto_delete_listing_by_reports function
CREATE OR REPLACE FUNCTION auto_delete_listing_by_reports()
RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
  v_listing_id UUID;
BEGIN
  -- Get the listing ID
  v_listing_id := NEW.listing_id;
  
  -- Count approved reports for this listing
  SELECT COUNT(*) INTO v_report_count
  FROM listing_reports
  WHERE listing_id = v_listing_id AND status = 'approved';
  
  -- If 10 or more reports, delete the listing
  IF v_report_count >= 10 THEN
    -- Use direct SQL to bypass RLS
    EXECUTE 'DELETE FROM car_listings WHERE id = $1' USING v_listing_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS auto_delete_listing_trigger ON listing_reports;
CREATE TRIGGER auto_delete_listing_trigger
AFTER UPDATE OF status ON listing_reports
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION auto_delete_listing_by_reports();

-- Fix process_listing_report function to bypass RLS
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
    
    -- If 10 or more reports, delete the listing using direct SQL to bypass RLS
    IF v_report_count >= 10 THEN
      EXECUTE 'DELETE FROM car_listings WHERE id = $1' USING v_listing_id;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;