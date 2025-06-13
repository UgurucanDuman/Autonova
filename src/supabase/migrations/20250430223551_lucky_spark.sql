/*
  # User Management Functions

  1. Functions
    - check_listing_limit - Check if a user can create more listings
    - purchase_listing_slot - Purchase additional listing slots
    - request_listing_purchase - Request to purchase listing slots
    - approve_purchase_request_admin - Approve a purchase request
    - reject_purchase_request_admin - Reject a purchase request
    - get_listing_prices - Get listing prices
    - check_email_exists - Check if an email exists
    - check_username_exists - Check if a username exists
    - delete_user_data - Delete all user data
    - ensure_user_exists - Ensure a user exists in the users table
*/

-- Function to check if a user can create more listings
CREATE OR REPLACE FUNCTION check_listing_limit(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_listing_limit INTEGER;
  v_paid_listing_limit INTEGER;
  v_current_count INTEGER;
  v_is_first_listing BOOLEAN;
BEGIN
  -- Get user's listing limits
  SELECT listing_limit, paid_listing_limit
  INTO v_listing_limit, v_paid_listing_limit
  FROM users
  WHERE id = p_user_id;
  
  -- Count user's current listings
  SELECT COUNT(*)
  INTO v_current_count
  FROM car_listings
  WHERE user_id = p_user_id;
  
  -- Check if this is the user's first listing
  v_is_first_listing := (v_current_count = 0);
  
  -- Return JSON with limit information
  RETURN json_build_object(
    'max_limit', COALESCE(v_listing_limit, 1) + COALESCE(v_paid_listing_limit, 0),
    'current_count', v_current_count,
    'remaining', (COALESCE(v_listing_limit, 1) + COALESCE(v_paid_listing_limit, 0)) - v_current_count,
    'can_create', (COALESCE(v_listing_limit, 1) + COALESCE(v_paid_listing_limit, 0)) > v_current_count,
    'is_first_listing', v_is_first_listing
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase listing slots
CREATE OR REPLACE FUNCTION purchase_listing_slot(
  p_user_id UUID,
  p_amount INTEGER,
  p_payment_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_price DECIMAL;
  v_purchase_id UUID;
BEGIN
  -- Calculate price based on amount
  CASE
    WHEN p_amount = 1 THEN v_price := 10;
    WHEN p_amount = 3 THEN v_price := 25;
    WHEN p_amount = 5 THEN v_price := 40;
    WHEN p_amount = 10 THEN v_price := 75;
    ELSE
      RETURN json_build_object(
        'success', FALSE,
        'error', 'Invalid amount. Choose 1, 3, 5, or 10.'
      );
  END CASE;
  
  -- Create purchase record
  INSERT INTO listing_purchases (
    user_id,
    amount,
    price,
    payment_id,
    status
  )
  VALUES (
    p_user_id,
    p_amount,
    v_price,
    p_payment_id,
    'completed'
  )
  RETURNING id INTO v_purchase_id;
  
  -- Update user's paid listing limit
  UPDATE users
  SET paid_listing_limit = COALESCE(paid_listing_limit, 0) + p_amount
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'purchase_id', v_purchase_id,
    'amount', p_amount,
    'price', v_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request listing purchase
CREATE OR REPLACE FUNCTION request_listing_purchase(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_price DECIMAL;
  v_request_id UUID;
BEGIN
  -- Calculate price based on amount
  CASE
    WHEN p_amount = 1 THEN v_price := 10;
    WHEN p_amount = 3 THEN v_price := 25;
    WHEN p_amount = 5 THEN v_price := 40;
    WHEN p_amount = 10 THEN v_price := 75;
    ELSE
      RETURN json_build_object(
        'success', FALSE,
        'error', 'Invalid amount. Choose 1, 3, 5, or 10.'
      );
  END CASE;
  
  -- Create purchase request
  INSERT INTO listing_purchase_requests (
    user_id,
    amount,
    price,
    status
  )
  VALUES (
    p_user_id,
    p_amount,
    v_price,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'request_id', v_request_id,
    'amount', p_amount,
    'price', v_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve purchase request
CREATE OR REPLACE FUNCTION approve_purchase_request_admin(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_price DECIMAL;
  v_purchase_id UUID;
BEGIN
  -- Get request details
  SELECT user_id, amount, price
  INTO v_user_id, v_amount, v_price
  FROM listing_purchase_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Purchase request not found or already processed'
    );
  END IF;
  
  -- Update request status
  UPDATE listing_purchase_requests
  SET 
    status = 'approved',
    admin_id = p_admin_id,
    admin_notes = p_admin_notes,
    processed_at = NOW()
  WHERE id = p_request_id;
  
  -- Create purchase record
  INSERT INTO listing_purchases (
    user_id,
    amount,
    price,
    payment_id,
    status,
    admin_id
  )
  VALUES (
    v_user_id,
    v_amount,
    v_price,
    'admin_approval_' || p_request_id,
    'completed',
    p_admin_id
  )
  RETURNING id INTO v_purchase_id;
  
  -- Update user's paid listing limit
  UPDATE users
  SET paid_listing_limit = COALESCE(paid_listing_limit, 0) + v_amount
  WHERE id = v_user_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'purchase_id', v_purchase_id,
    'amount', v_amount,
    'price', v_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject purchase request
CREATE OR REPLACE FUNCTION reject_purchase_request_admin(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT
)
RETURNS JSON AS $$
BEGIN
  -- Update request status
  UPDATE listing_purchase_requests
  SET 
    status = 'rejected',
    admin_id = p_admin_id,
    admin_notes = p_admin_notes,
    processed_at = NOW()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Purchase request not found or already processed'
    );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get listing prices
CREATE OR REPLACE FUNCTION get_listing_prices()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'single', 10,
    'three_pack', 25,
    'five_pack', 40,
    'ten_pack', 75,
    'currency', 'TRY'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email exists
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if username exists
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE email = username_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete all user data
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete messages
  DELETE FROM messages
  WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  
  -- Delete listing reports
  DELETE FROM listing_reports
  WHERE reporter_id = p_user_id;
  
  -- Delete social share requests
  DELETE FROM social_share_requests
  WHERE user_id = p_user_id;
  
  -- Delete social shares
  DELETE FROM social_shares
  WHERE user_id = p_user_id;
  
  -- Delete listing purchase requests
  DELETE FROM listing_purchase_requests
  WHERE user_id = p_user_id;
  
  -- Delete listing purchases
  DELETE FROM listing_purchases
  WHERE user_id = p_user_id;
  
  -- Delete corporate documents
  DELETE FROM corporate_documents
  WHERE user_id = p_user_id;
  
  -- Delete car listings (will cascade to car_images)
  DELETE FROM car_listings
  WHERE user_id = p_user_id;
  
  -- Delete user profile
  DELETE FROM users
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure user exists in users table
CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user exists in the users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    -- Insert the user into the users table
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'user',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure user exists after auth.users insert
DROP TRIGGER IF EXISTS ensure_user_exists_trigger ON auth.users;
CREATE TRIGGER ensure_user_exists_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_user_exists();