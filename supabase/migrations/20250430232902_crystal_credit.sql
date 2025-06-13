/*
  # Add admin_id column to car_listings table

  1. Changes
    - Add admin_id column to car_listings table
    - This column will be used to track which admin approved or rejected a listing
*/

-- Add admin_id column to car_listings table if it doesn't exist
ALTER TABLE car_listings ADD COLUMN IF NOT EXISTS admin_id UUID;

-- Create index on admin_id column for better performance
CREATE INDEX IF NOT EXISTS idx_car_listings_admin_id ON car_listings(admin_id);