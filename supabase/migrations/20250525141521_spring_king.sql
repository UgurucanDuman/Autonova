/*
  # Admin Authorization Fix

  1. Changes
    - Add proper RLS policies for admin operations
    - Fix admin authentication and authorization
*/

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Get admin ID from session
  v_admin_id := current_setting('request.jwt.claims', true)::json->>'admin_id';
  
  -- Check if admin ID exists in admin_credentials
  RETURN EXISTS (
    SELECT 1 FROM admin_credentials
    WHERE id = v_admin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies for car_listings to properly check admin status
DROP POLICY IF EXISTS "Admin can manage listings" ON car_listings;
CREATE POLICY "Admin can manage listings"
  ON car_listings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for users to properly check admin status
DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for messages to properly check admin status
DROP POLICY IF EXISTS "Admin can manage messages" ON messages;
CREATE POLICY "Admin can manage messages"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for listing_reports to properly check admin status
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
CREATE POLICY "Admin can manage listing reports"
  ON listing_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for message_reports to properly check admin status
DROP POLICY IF EXISTS "Admin can manage message reports" ON message_reports;
CREATE POLICY "Admin can manage message reports"
  ON message_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for reviews to properly check admin status
DROP POLICY IF EXISTS "Admin can manage reviews" ON reviews;
CREATE POLICY "Admin can manage reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for review_replies to properly check admin status
DROP POLICY IF EXISTS "Admin can manage review replies" ON review_replies;
CREATE POLICY "Admin can manage review replies"
  ON review_replies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for corporate_documents to properly check admin status
DROP POLICY IF EXISTS "Admin can manage corporate documents" ON corporate_documents;
CREATE POLICY "Admin can manage corporate documents"
  ON corporate_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for favorites to properly check admin status
DROP POLICY IF EXISTS "Admin can manage favorites" ON favorites;
CREATE POLICY "Admin can manage favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for listing_purchase_requests to properly check admin status
DROP POLICY IF EXISTS "Admin can manage listing purchase requests" ON listing_purchase_requests;
CREATE POLICY "Admin can manage listing purchase requests"
  ON listing_purchase_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for listing_purchases to properly check admin status
DROP POLICY IF EXISTS "Admin can manage listing purchases" ON listing_purchases;
CREATE POLICY "Admin can manage listing purchases"
  ON listing_purchases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for social_share_requests to properly check admin status
DROP POLICY IF EXISTS "Admin can manage social share requests" ON social_share_requests;
CREATE POLICY "Admin can manage social share requests"
  ON social_share_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for social_shares to properly check admin status
DROP POLICY IF EXISTS "Admin can manage social shares" ON social_shares;
CREATE POLICY "Admin can manage social shares"
  ON social_shares
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for notification_logs to properly check admin status
DROP POLICY IF EXISTS "Admin can manage notification logs" ON notification_logs;
CREATE POLICY "Admin can manage notification logs"
  ON notification_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for notification_templates to properly check admin status
DROP POLICY IF EXISTS "Admin can manage notification templates" ON notification_templates;
CREATE POLICY "Admin can manage notification templates"
  ON notification_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );

-- Update policies for vehicle_history_reports to properly check admin status
DROP POLICY IF EXISTS "Admin can manage vehicle history reports" ON vehicle_history_reports;
CREATE POLICY "Admin can manage vehicle history reports"
  ON vehicle_history_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE id = auth.uid()
    )
  );