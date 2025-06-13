/*
  # User Blocking System

  1. Changes
    - Add trigger to set block end date when a user is blocked
    - Add function to automatically unblock users when their block period ends
*/

-- Function to set block end date when a user is blocked
CREATE OR REPLACE FUNCTION set_block_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_blocked = TRUE AND (OLD.is_blocked IS NULL OR OLD.is_blocked = FALSE) THEN
    NEW.block_end_date := NOW() + INTERVAL '3 weeks';
  ELSIF NEW.is_blocked = FALSE THEN
    NEW.block_end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set block end date
DROP TRIGGER IF EXISTS set_block_end_date_trigger ON public.users;
CREATE TRIGGER set_block_end_date_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION set_block_end_date();

-- Function to automatically unblock users
CREATE OR REPLACE FUNCTION auto_unblock_users()
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET 
    is_blocked = FALSE,
    block_reason = NULL,
    blocked_at = NULL,
    blocked_by = NULL,
    block_end_date = NULL
  WHERE 
    is_blocked = TRUE AND 
    block_end_date IS NOT NULL AND 
    block_end_date <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;