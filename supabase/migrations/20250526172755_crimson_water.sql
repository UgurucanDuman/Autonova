-- Create a function to get all users for live chat
CREATE OR REPLACE FUNCTION admin_get_users_for_chat()
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY SELECT * FROM users ORDER BY created_at DESC LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get chat messages for a user
CREATE OR REPLACE FUNCTION admin_get_chat_messages(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  read BOOLEAN
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.created_at,
    m.read
  FROM 
    messages m
  WHERE 
    m.sender_id = p_user_id OR m.receiver_id = p_user_id
  ORDER BY 
    m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to send a chat message as admin
CREATE OR REPLACE FUNCTION admin_send_chat_message(
  p_admin_id UUID,
  p_user_id UUID,
  p_content TEXT
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO messages (
    sender_id,
    receiver_id,
    content,
    read,
    created_at
  ) VALUES (
    p_admin_id,
    p_user_id,
    p_content,
    FALSE,
    NOW()
  ) RETURNING id INTO v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to mark chat messages as read
CREATE OR REPLACE FUNCTION admin_mark_messages_read(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE messages
  SET read = TRUE
  WHERE 
    sender_id = p_user_id AND 
    receiver_id = p_admin_id AND
    read = FALSE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to close a chat session
CREATE OR REPLACE FUNCTION admin_close_chat_session(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- In a real implementation, you would update a chat_sessions table
  -- For now, we'll just return true
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;