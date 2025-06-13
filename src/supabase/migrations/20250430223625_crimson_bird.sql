/*
  # Admin Management Functions

  1. Functions
    - authenticate_admin - Authenticate an admin user
    - verify_admin_code - Verify an admin verification code
    - change_admin_password - Change an admin's password
    - create_admin - Create a new admin user
    - delete_admin - Delete an admin user
*/

-- Function to authenticate admin
CREATE OR REPLACE FUNCTION authenticate_admin(
  input_username TEXT,
  input_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_username TEXT;
  v_email TEXT;
  v_password_hash TEXT;
  v_verification_needed BOOLEAN;
BEGIN
  -- Get admin credentials
  SELECT id, username, email, password_hash, identity_verification_required
  INTO v_admin_id, v_username, v_email, v_password_hash, v_verification_needed
  FROM admin_credentials
  WHERE username = input_username;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'invalid_credentials'
    );
  END IF;
  
  -- Check password (in a real implementation, use proper password hashing)
  IF v_password_hash != crypt(input_password, v_password_hash) THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'invalid_credentials'
    );
  END IF;
  
  -- Update last login
  UPDATE admin_credentials
  SET last_login = NOW()
  WHERE id = v_admin_id;
  
  -- Return success with admin info
  RETURN json_build_object(
    'success', TRUE,
    'admin_id', v_admin_id,
    'username', v_username,
    'email', v_email,
    'verification_needed', v_verification_needed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify admin verification code
CREATE OR REPLACE FUNCTION verify_admin_code(
  input_admin_id UUID,
  verification_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_record RECORD;
  v_attempts INTEGER;
BEGIN
  -- Get verification code
  SELECT * INTO v_code_record
  FROM admin_verification_codes
  WHERE admin_id = input_admin_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code is expired
  IF v_code_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Update attempts
  UPDATE admin_verification_codes
  SET attempts = attempts + 1
  WHERE admin_id = input_admin_id
  RETURNING attempts INTO v_attempts;
  
  -- Check if too many attempts
  IF v_attempts > 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if code matches
  IF v_code_record.code = verification_code THEN
    -- Delete the code after successful verification
    DELETE FROM admin_verification_codes
    WHERE admin_id = input_admin_id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change admin password
CREATE OR REPLACE FUNCTION change_admin_password(
  current_password TEXT,
  new_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Get current admin ID from session
  v_admin_id := current_setting('request.jwt.claims', true)::json->>'admin_id';
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Not authenticated as admin'
    );
  END IF;
  
  -- Get current password hash
  SELECT password_hash INTO v_password_hash
  FROM admin_credentials
  WHERE id = v_admin_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Admin not found'
    );
  END IF;
  
  -- Verify current password
  IF v_password_hash != crypt(current_password, v_password_hash) THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Current password is incorrect'
    );
  END IF;
  
  -- Update password
  UPDATE admin_credentials
  SET 
    password_hash = crypt(new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = v_admin_id;
  
  RETURN json_build_object(
    'success', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin
CREATE OR REPLACE FUNCTION create_admin(
  p_username TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT,
  p_creator_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Check if username or email already exists
  IF EXISTS (SELECT 1 FROM admin_credentials WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Username already exists'
    );
  END IF;
  
  IF EXISTS (SELECT 1 FROM admin_credentials WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Email already exists'
    );
  END IF;
  
  -- Create new admin
  INSERT INTO admin_credentials (
    username,
    email,
    full_name,
    password_hash,
    created_by
  )
  VALUES (
    p_username,
    p_email,
    p_full_name,
    crypt(p_password, gen_salt('bf')),
    p_creator_id
  )
  RETURNING id INTO v_admin_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'admin_id', v_admin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete admin
CREATE OR REPLACE FUNCTION delete_admin(
  p_admin_id UUID,
  p_deleter_id UUID
)
RETURNS JSON AS $$
BEGIN
  -- Check if admin exists
  IF NOT EXISTS (SELECT 1 FROM admin_credentials WHERE id = p_admin_id) THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Admin not found'
    );
  END IF;
  
  -- Prevent self-deletion
  IF p_admin_id = p_deleter_id THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Cannot delete yourself'
    );
  END IF;
  
  -- Delete admin
  DELETE FROM admin_credentials
  WHERE id = p_admin_id;
  
  RETURN json_build_object(
    'success', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;