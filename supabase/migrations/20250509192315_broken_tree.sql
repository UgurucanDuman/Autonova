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
  
  -- Add to block history
  INSERT INTO user_blocks (
    user_id,
    admin_id,
    reason
  ) VALUES (
    p_user_id,
    p_admin_id,
    p_reason
  );
  
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
  
  -- Add to block history
  INSERT INTO user_blocks (
    user_id,
    admin_id,
    reason
  ) VALUES (
    p_user_id,
    p_admin_id,
    'Engel kaldırıldı'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;