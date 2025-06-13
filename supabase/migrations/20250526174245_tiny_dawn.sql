-- Create a function to check if a corporate user exists with the same email
CREATE OR REPLACE FUNCTION check_corporate_user_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if a corporate user exists with this email
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE email = email_to_check AND is_corporate = TRUE
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a regular user exists with the same email
CREATE OR REPLACE FUNCTION check_regular_user_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if a regular user exists with this email
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE email = email_to_check AND is_corporate = FALSE
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to register a corporate user
CREATE OR REPLACE FUNCTION register_corporate_user(
  p_email TEXT,
  p_full_name TEXT,
  p_company_name TEXT,
  p_tax_number TEXT,
  p_phone TEXT,
  p_registration_number TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if email already exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO v_user_exists;
  
  IF v_user_exists THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Email already exists'
    );
  END IF;
  
  -- Check if email already exists in users table
  SELECT EXISTS (
    SELECT 1 FROM users WHERE email = p_email
  ) INTO v_user_exists;
  
  IF v_user_exists THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Email already exists'
    );
  END IF;
  
  -- Generate a UUID for the new user
  SELECT gen_random_uuid() INTO v_user_id;
  
  -- Insert into users table
  INSERT INTO users (
    id,
    email,
    full_name,
    is_corporate,
    company_name,
    tax_number,
    phone,
    registration_number,
    approval_status,
    approval_requested_at,
    created_at
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    TRUE,
    p_company_name,
    p_tax_number,
    p_phone,
    p_registration_number,
    'pending',
    NOW(),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the debug_email_check function to be more comprehensive
CREATE OR REPLACE FUNCTION debug_email_check(email_to_check TEXT)
RETURNS JSONB AS $$
DECLARE
  auth_exists BOOLEAN;
  users_exists BOOLEAN;
  corporate_exists BOOLEAN;
  regular_exists BOOLEAN;
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
  
  -- Check corporate users
  SELECT EXISTS (
    SELECT 1 FROM users WHERE email = email_to_check AND is_corporate = TRUE
  ) INTO corporate_exists;
  
  -- Check regular users
  SELECT EXISTS (
    SELECT 1 FROM users WHERE email = email_to_check AND is_corporate = FALSE
  ) INTO regular_exists;
  
  -- Get result from check_email_exists function
  SELECT check_email_exists(email_to_check) INTO result;
  
  RETURN jsonb_build_object(
    'email', email_to_check,
    'auth_exists', auth_exists,
    'users_exists', users_exists,
    'corporate_exists', corporate_exists,
    'regular_exists', regular_exists,
    'result', result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;