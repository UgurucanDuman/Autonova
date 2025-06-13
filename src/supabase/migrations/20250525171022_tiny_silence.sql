-- Create a function to allow admins to delete listings
CREATE OR REPLACE FUNCTION admin_delete_listing(p_listing_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the listing to mark it as deleted by admin
  UPDATE car_listings
  SET 
    status = 'deleted',
    moderation_reason = 'Deleted by admin',
    moderated_at = NOW(),
    moderated_by = p_admin_id
  WHERE id = p_listing_id;
  
  -- Actually delete the listing
  DELETE FROM car_listings
  WHERE id = p_listing_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to allow admins to process listing reports
CREATE OR REPLACE FUNCTION admin_process_listing_report(
  p_report_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_notes TEXT,
  p_delete_listing BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_listing_id UUID;
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
  
  -- If approved and delete_listing is true, delete the listing
  IF p_status = 'approved' AND p_delete_listing AND v_listing_id IS NOT NULL THEN
    PERFORM admin_delete_listing(v_listing_id, p_admin_id);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a policy to allow admins to delete listings
CREATE POLICY "Admins can delete listings"
  ON car_listings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );