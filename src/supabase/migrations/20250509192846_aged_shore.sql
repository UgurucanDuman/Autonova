-- This migration adds review functionality to the car marketplace

-- Function to check if a user can review a listing
CREATE OR REPLACE FUNCTION can_review_listing(
  p_user_id UUID,
  p_listing_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_message BOOLEAN;
  v_is_owner BOOLEAN;
  v_already_reviewed BOOLEAN;
BEGIN
  -- Check if user is the owner of the listing
  SELECT EXISTS (
    SELECT 1 FROM car_listings
    WHERE id = p_listing_id AND user_id = p_user_id
  ) INTO v_is_owner;
  
  -- Users cannot review their own listings
  IF v_is_owner THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has already reviewed this listing
  SELECT EXISTS (
    SELECT 1 FROM reviews
    WHERE listing_id = p_listing_id AND user_id = p_user_id
  ) INTO v_already_reviewed;
  
  IF v_already_reviewed THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has messaged the listing owner
  SELECT EXISTS (
    SELECT 1 FROM messages
    JOIN car_listings ON messages.listing_id = car_listings.id
    WHERE car_listings.id = p_listing_id
    AND (
      (messages.sender_id = p_user_id AND messages.receiver_id = car_listings.user_id) OR
      (messages.receiver_id = p_user_id AND messages.sender_id = car_listings.user_id)
    )
  ) INTO v_has_message;
  
  -- User can review if they've messaged the owner
  RETURN v_has_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get listing rating statistics
CREATE OR REPLACE FUNCTION get_listing_rating_stats(p_listing_id UUID)
RETURNS JSON AS $$
DECLARE
  v_avg_rating DECIMAL;
  v_review_count INTEGER;
  v_rating_distribution JSON;
BEGIN
  -- Get average rating and review count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM reviews
  WHERE listing_id = p_listing_id AND is_approved = TRUE;
  
  -- Get rating distribution
  SELECT json_build_object(
    '1', COUNT(*) FILTER (WHERE rating = 1),
    '2', COUNT(*) FILTER (WHERE rating = 2),
    '3', COUNT(*) FILTER (WHERE rating = 3),
    '4', COUNT(*) FILTER (WHERE rating = 4),
    '5', COUNT(*) FILTER (WHERE rating = 5)
  )
  INTO v_rating_distribution
  FROM reviews
  WHERE listing_id = p_listing_id AND is_approved = TRUE;
  
  RETURN json_build_object(
    'average_rating', v_avg_rating,
    'review_count', v_review_count,
    'distribution', v_rating_distribution
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;