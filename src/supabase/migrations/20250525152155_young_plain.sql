/*
  # Fix Report Processing Functions

  1. Changes
    - Update process_listing_report function to properly handle report processing
    - Update process_message_report function to properly handle report processing
*/

-- Function to process a listing report
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

-- Function to process a message report
CREATE OR REPLACE FUNCTION process_message_report(
  p_report_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_notes TEXT,
  p_delete_message BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_message_id UUID;
  v_sender_id UUID;
BEGIN
  -- Get message ID and sender ID from report
  SELECT message_id, m.sender_id INTO v_message_id, v_sender_id
  FROM message_reports mr
  JOIN messages m ON mr.message_id = m.id
  WHERE mr.id = p_report_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update report status
  UPDATE message_reports
  SET 
    status = p_status,
    resolved_at = NOW(),
    resolved_by = p_admin_id,
    resolution_notes = p_notes
  WHERE id = p_report_id;
  
  -- If approved and delete_message is true, delete the message
  IF p_status = 'approved' AND p_delete_message THEN
    DELETE FROM messages
    WHERE id = v_message_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;