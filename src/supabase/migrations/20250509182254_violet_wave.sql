/*
  # Fix User Block Functions

  1. New Functions
    - `block_user` - Function to block a user without causing recursion
    - `unblock_user` - Function to unblock a user without causing recursion
*/

-- Function to block a user
CREATE OR REPLACE FUNCTION block_user(
  p_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update user directly
  UPDATE users
  SET 
    is_blocked = TRUE,
    block_reason = p_reason,
    blocked_at = NOW(),
    blocked_by = p_admin_id,
    block_end_date = NOW() + INTERVAL '3 weeks'
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(
  p_user_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update user directly
  UPDATE users
  SET 
    is_blocked = FALSE,
    block_reason = NULL,
    blocked_at = NULL,
    blocked_by = NULL,
    block_end_date = NULL
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;