/*
  # Fix Admin Report Creation

  1. New Functions
    - create_admin_report - Function to allow admins to create reports
*/

-- Function to allow admins to create reports
CREATE OR REPLACE FUNCTION create_admin_report(
  p_listing_id UUID,
  p_admin_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert report directly
  INSERT INTO listing_reports (
    listing_id,
    reporter_id,
    reason,
    details,
    status
  ) VALUES (
    p_listing_id,
    p_admin_id,
    p_reason,
    p_details,
    'pending'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;