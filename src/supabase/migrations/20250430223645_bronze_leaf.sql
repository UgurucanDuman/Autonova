/*
  # Verification Functions

  1. Functions
    - generate_email_code - Generate an email verification code
    - verify_email_code - Verify an email verification code
    - generate_verification_code - Generate a phone verification code
    - verify_phone_code - Verify a phone verification code
*/

-- Function to generate email verification code
CREATE OR REPLACE FUNCTION generate_email_code(
  email_address TEXT,
  target_user_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_user_id UUID;
BEGIN
  -- Generate 6-digit code
  v_code := floor(random() * 900000 + 100000)::TEXT;
  
  -- Get user ID if not provided
  IF target_user_id IS NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := target_user_id;
  END IF;
  
  -- Delete any existing codes for this email
  DELETE FROM email_verifications
  WHERE user_id = v_user_id;
  
  -- Insert new code
  INSERT INTO email_verifications (
    user_id,
    email,
    code,
    expires_at
  )
  VALUES (
    v_user_id,
    email_address,
    v_code,
    NOW() + INTERVAL '15 minutes'
  );
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email code
CREATE OR REPLACE FUNCTION verify_email_code(
  email_address TEXT,
  verification_code TEXT,
  target_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_record RECORD;
  v_attempts INTEGER;
  v_user_id UUID;
BEGIN
  -- Get user ID if not provided
  IF target_user_id IS NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := target_user_id;
  END IF;
  
  -- Get verification code
  SELECT * INTO v_code_record
  FROM email_verifications
  WHERE user_id = v_user_id AND email = email_address;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code is expired
  IF v_code_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Update attempts
  UPDATE email_verifications
  SET attempts = attempts + 1
  WHERE id = v_code_record.id
  RETURNING attempts INTO v_attempts;
  
  -- Check if too many attempts
  IF v_attempts > 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code matches
  IF v_code_record.code = verification_code THEN
    -- Update user's email
    UPDATE users
    SET email = email_address
    WHERE id = v_user_id;
    
    -- Delete the code after successful verification
    DELETE FROM email_verifications
    WHERE id = v_code_record.id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate phone verification code
CREATE OR REPLACE FUNCTION generate_verification_code(
  phone_number TEXT,
  target_user_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_user_id UUID;
BEGIN
  -- Generate 6-digit code
  v_code := floor(random() * 900000 + 100000)::TEXT;
  
  -- Get user ID if not provided
  IF target_user_id IS NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := target_user_id;
  END IF;
  
  -- Delete any existing codes for this phone
  DELETE FROM verification_codes
  WHERE user_id = v_user_id;
  
  -- Insert new code
  INSERT INTO verification_codes (
    user_id,
    phone,
    code,
    expires_at
  )
  VALUES (
    v_user_id,
    phone_number,
    v_code,
    NOW() + INTERVAL '15 minutes'
  );
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify phone code
CREATE OR REPLACE FUNCTION verify_phone_code(
  phone_number TEXT,
  verification_code TEXT,
  target_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_record RECORD;
  v_attempts INTEGER;
  v_user_id UUID;
BEGIN
  -- Get user ID if not provided
  IF target_user_id IS NULL THEN
    v_user_id := auth.uid();
  ELSE
    v_user_id := target_user_id;
  END IF;
  
  -- Get verification code
  SELECT * INTO v_code_record
  FROM verification_codes
  WHERE user_id = v_user_id AND phone = phone_number;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code is expired
  IF v_code_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Update attempts
  UPDATE verification_codes
  SET attempts = attempts + 1
  WHERE id = v_code_record.id
  RETURNING attempts INTO v_attempts;
  
  -- Check if too many attempts
  IF v_attempts > 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code matches
  IF v_code_record.code = verification_code THEN
    -- Update user's phone and verification status
    UPDATE users
    SET 
      phone = phone_number,
      phone_verified = TRUE,
      phone_verified_at = NOW()
    WHERE id = v_user_id;
    
    -- Delete the code after successful verification
    DELETE FROM verification_codes
    WHERE id = v_code_record.id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;