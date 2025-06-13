/*
  # Car Images tablosuna hash kolonları ekleme

  1. Yeni Kolonlar
    - `image_hash` (text) - SHA-256 hash for exact duplicate detection
    - `perceptual_hash` (text) - Perceptual hash for similar image detection
  
  2. İndeksler
    - `image_hash` için indeks (hızlı arama için)
    - `perceptual_hash` için indeks (benzer görsel arama için)
  
  3. Notlar
    - Bu kolonlar duplicate fotoğraf kontrolü için kullanılacak
    - Mevcut veriler etkilenmeyecek (nullable kolonlar)
*/

-- Add hash columns to car_images table
ALTER TABLE car_images 
ADD COLUMN IF NOT EXISTS image_hash text,
ADD COLUMN IF NOT EXISTS perceptual_hash text;

-- Create indexes for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_car_images_image_hash 
ON car_images(image_hash) 
WHERE image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_car_images_perceptual_hash 
ON car_images(perceptual_hash) 
WHERE perceptual_hash IS NOT NULL;

-- Create composite index for user-specific duplicate checking
CREATE INDEX IF NOT EXISTS idx_car_images_user_hash 
ON car_images(image_hash) 
INCLUDE (listing_id)
WHERE image_hash IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN car_images.image_hash IS 'SHA-256 hash of the image for exact duplicate detection';
COMMENT ON COLUMN car_images.perceptual_hash IS 'Perceptual hash for similar image detection';