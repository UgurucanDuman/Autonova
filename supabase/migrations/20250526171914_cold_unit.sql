/*
  # Fix Admin Permissions for Messages and Reviews

  1. Changes
    - Update RLS policies for messages to ensure admins can see all messages
    - Update RLS policies for reviews to ensure admins can manage all reviews
    - Add function to allow admins to delete reviews
    - Add function to allow admins to view all messages
*/

-- Create a function to allow admins to view all messages
CREATE OR REPLACE FUNCTION admin_view_all_messages()
RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY SELECT * FROM messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to allow admins to delete reviews
CREATE OR REPLACE FUNCTION admin_delete_review(p_review_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete the review directly, bypassing RLS
  DELETE FROM reviews
  WHERE id = p_review_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to allow admins to update review approval status
CREATE OR REPLACE FUNCTION admin_update_review_status(
  p_review_id UUID,
  p_admin_id UUID,
  p_is_approved BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the review directly, bypassing RLS
  UPDATE reviews
  SET 
    is_approved = p_is_approved,
    updated_at = NOW()
  WHERE id = p_review_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admin can manage messages" ON messages;
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;

-- Create a policy for admins to manage all messages
CREATE POLICY "Admin can manage messages"
  ON messages
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

-- Create a policy for admins to manage all reviews
CREATE POLICY "Admin can manage reviews"
  ON reviews
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