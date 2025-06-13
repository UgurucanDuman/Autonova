-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Replies Table
CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Enable RLS on review_replies table
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can read their own reviews even if not approved" ON reviews;
DROP POLICY IF EXISTS "Listing owners can read reviews for their listings" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

DROP POLICY IF EXISTS "Anyone can read review replies" ON review_replies;
DROP POLICY IF EXISTS "Users can create replies to reviews for their listings" ON review_replies;
DROP POLICY IF EXISTS "Users can update their own replies" ON review_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON review_replies;

-- Create policies for reviews
CREATE POLICY "Anyone can read approved reviews"
  ON reviews
  FOR SELECT
  USING (is_approved = TRUE);

CREATE POLICY "Users can read their own reviews even if not approved"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Listing owners can read reviews for their listings"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE car_listings.id = reviews.listing_id
      AND car_listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

-- Create policies for review replies
CREATE POLICY "Anyone can read review replies"
  ON review_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_replies.review_id
      AND reviews.is_approved = TRUE
    )
  );

CREATE POLICY "Users can create replies to reviews for their listings"
  ON review_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM reviews
      JOIN car_listings ON reviews.listing_id = car_listings.id
      WHERE reviews.id = review_replies.review_id
      AND car_listings.user_id = auth.uid()
    ) AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can update their own replies"
  ON review_replies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

CREATE POLICY "Users can delete their own replies"
  ON review_replies
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND (
        is_blocked = TRUE AND 
        (block_end_date IS NULL OR block_end_date > NOW())
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);

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