-- Create damage_reports table
CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  incident_date DATE NOT NULL,
  damage_type TEXT NOT NULL CHECK (damage_type IN ('minor', 'moderate', 'severe')),
  repair_history TEXT,
  insurance_claim BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create damage_images table
CREATE TABLE IF NOT EXISTS damage_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES damage_reports(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_damage_reports_listing_id ON damage_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_user_id ON damage_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_images_report_id ON damage_images(report_id);

-- Enable RLS on damage_reports
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- Enable RLS on damage_images
ALTER TABLE damage_images ENABLE ROW LEVEL SECURITY;

-- Create policies for damage_reports
CREATE POLICY "Users can create damage reports"
  ON damage_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own damage reports"
  ON damage_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM car_listings
      WHERE car_listings.id = damage_reports.listing_id
      AND car_listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read approved damage reports"
  ON damage_reports
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can manage damage reports"
  ON damage_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create policies for damage_images
CREATE POLICY "Users can create damage images"
  ON damage_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM damage_reports
      WHERE damage_reports.id = damage_images.report_id
      AND damage_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own damage images"
  ON damage_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM damage_reports
      WHERE damage_reports.id = damage_images.report_id
      AND damage_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read approved damage images"
  ON damage_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM damage_reports
      WHERE damage_reports.id = damage_images.report_id
      AND damage_reports.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage damage images"
  ON damage_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create a function to get all damage reports for admin
CREATE OR REPLACE FUNCTION admin_view_damage_reports()
RETURNS SETOF damage_reports AS $$
BEGIN
  RETURN QUERY SELECT * FROM damage_reports;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to approve a damage report
CREATE OR REPLACE FUNCTION admin_approve_damage_report(
  p_report_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE damage_reports
  SET 
    status = 'approved',
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_report_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reject a damage report
CREATE OR REPLACE FUNCTION admin_reject_damage_report(
  p_report_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE damage_reports
  SET 
    status = 'rejected',
    admin_notes = p_reason,
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_report_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a storage bucket for damage images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('damage-images', 'Damage Images', true, 10000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create policies for damage-images bucket
CREATE POLICY "Anyone can read damage images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'damage-images');

CREATE POLICY "Users can upload damage images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'damage-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own damage images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'damage-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );