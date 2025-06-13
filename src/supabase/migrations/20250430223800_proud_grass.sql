/*
  # Performance Indexes

  1. Changes
    - Add indexes to improve query performance
*/

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_car_listings_user_id ON car_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_car_listings_status ON car_listings(status);
CREATE INDEX IF NOT EXISTS idx_car_images_listing_id ON car_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);
CREATE INDEX IF NOT EXISTS idx_users_is_corporate ON users(is_corporate);
CREATE INDEX IF NOT EXISTS idx_corporate_documents_user_id ON corporate_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_purchase_requests_user_id ON listing_purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_purchases_user_id ON listing_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_social_share_requests_user_id ON social_share_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_social_share_requests_listing_id ON social_share_requests(listing_id);