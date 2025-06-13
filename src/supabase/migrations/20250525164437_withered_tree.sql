/*
  # Fix Infinite Recursion in Messages Policy

  1. Changes
    - Drop existing policies that cause recursion
    - Create new policies with proper checks that avoid recursion
    - Fix message sending functionality
*/

-- First ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON messages;
DROP POLICY IF EXISTS "Admin can manage messages" ON messages;

-- Create a policy for users to read their own messages
CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create a policy for users to send messages without recursion
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = FALSE OR 
        (is_blocked = TRUE AND block_end_date IS NOT NULL AND block_end_date <= NOW())
      )
    )
  );

-- Create a policy for users to delete their own sent messages
CREATE POLICY "Users can delete their own sent messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

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

-- Create a function to send a message that bypasses RLS
CREATE OR REPLACE FUNCTION send_message_bypass_rls(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_listing_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_is_blocked BOOLEAN;
  v_block_end_date TIMESTAMPTZ;
  v_message_id UUID;
BEGIN
  -- Check if sender is blocked
  SELECT is_blocked, block_end_date INTO v_is_blocked, v_block_end_date
  FROM users
  WHERE id = p_sender_id;
  
  -- If user is blocked and block hasn't expired, prevent sending
  IF v_is_blocked = TRUE AND (v_block_end_date IS NULL OR v_block_end_date > NOW()) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Hesabınız engellenmiştir. Mesaj gönderemezsiniz.'
    );
  END IF;
  
  -- Insert message
  INSERT INTO messages (
    sender_id,
    receiver_id,
    listing_id,
    content,
    read,
    created_at
  ) VALUES (
    p_sender_id,
    p_receiver_id,
    p_listing_id,
    p_content,
    FALSE,
    NOW()
  ) RETURNING id INTO v_message_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message_id', v_message_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;