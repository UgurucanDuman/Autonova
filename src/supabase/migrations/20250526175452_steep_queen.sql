-- Drop existing functions first to avoid return type errors
DROP FUNCTION IF EXISTS admin_view_all_messages();
DROP FUNCTION IF EXISTS admin_update_storage_policy(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS debug_file_upload(TEXT, TEXT, INTEGER, TEXT);

-- Create a function to allow admins to view all messages
CREATE OR REPLACE FUNCTION admin_view_all_messages()
RETURNS TABLE(
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  listing_id UUID,
  content TEXT,
  read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.listing_id,
    m.content,
    m.read,
    m.created_at
  FROM 
    messages m
  ORDER BY 
    m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to allow admins to update storage policies
CREATE OR REPLACE FUNCTION admin_update_storage_policy(
  p_bucket_id TEXT,
  p_policy_name TEXT,
  p_definition TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- This function would update storage policies
  -- In a real implementation, this would modify the storage.policies table
  -- For now, we'll just return true
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to debug file uploads
CREATE OR REPLACE FUNCTION debug_file_upload(
  p_file_name TEXT,
  p_mime_type TEXT,
  p_size INTEGER,
  p_bucket TEXT
)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'file_name', p_file_name,
    'mime_type', p_mime_type,
    'size', p_size,
    'bucket', p_bucket,
    'allowed_types', ARRAY['image/jpeg', 'image/png', 'application/pdf'],
    'is_allowed', p_mime_type = ANY(ARRAY['image/jpeg', 'image/png', 'application/pdf']),
    'max_size', 10 * 1024 * 1024,
    'is_size_valid', p_size <= 10 * 1024 * 1024
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;