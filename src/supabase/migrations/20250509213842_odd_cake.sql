-- Message Reports Table (if not exists)
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on message_reports if not already enabled
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can create message reports" ON message_reports;
DROP POLICY IF EXISTS "Users can read their own message reports" ON message_reports;

-- Create policies for message_reports
CREATE POLICY "Users can create message reports"
  ON message_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own message reports"
  ON message_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR 
    EXISTS (
      SELECT 1 FROM messages
      WHERE id = message_id AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    )
  );

-- Create index for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON listing_reports(status);

-- Function to get the number of reports for a listing
CREATE OR REPLACE FUNCTION get_listing_report_count(p_listing_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM listing_reports
  WHERE listing_id = p_listing_id AND status = 'pending';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the number of reports for a message
CREATE OR REPLACE FUNCTION get_message_report_count(p_message_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM message_reports
  WHERE message_id = p_message_id AND status = 'pending';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Function to automatically delete listings with too many reports
CREATE OR REPLACE FUNCTION auto_delete_listing_by_reports()
RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
BEGIN
  -- Count approved reports for this listing
  SELECT COUNT(*) INTO v_report_count
  FROM listing_reports
  WHERE listing_id = NEW.listing_id AND status = 'approved';
  
  -- If 10 or more reports, delete the listing
  IF v_report_count >= 10 THEN
    DELETE FROM car_listings
    WHERE id = NEW.listing_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-deleting listings if it doesn't exist
DROP TRIGGER IF EXISTS auto_delete_listing_trigger ON listing_reports;
CREATE TRIGGER auto_delete_listing_trigger
AFTER UPDATE OF status ON listing_reports
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION auto_delete_listing_by_reports();