-- Fix the check_email_exists function to properly check if an email exists
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- First check auth.users table
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  ) INTO user_exists;
  
  -- If not found in auth.users, also check users table
  IF NOT user_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM users WHERE email = email_to_check
    ) INTO user_exists;
  END IF;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to debug email check
CREATE OR REPLACE FUNCTION debug_email_check(email_to_check TEXT)
RETURNS JSONB AS $$
DECLARE
  auth_exists BOOLEAN;
  users_exists BOOLEAN;
  result BOOLEAN;
BEGIN
  -- Check auth.users table
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  ) INTO auth_exists;
  
  -- Check users table
  SELECT EXISTS (
    SELECT 1 FROM users WHERE email = email_to_check
  ) INTO users_exists;
  
  -- Get result from check_email_exists function
  SELECT check_email_exists(email_to_check) INTO result;
  
  RETURN jsonb_build_object(
    'email', email_to_check,
    'auth_exists', auth_exists,
    'users_exists', users_exists,
    'result', result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;