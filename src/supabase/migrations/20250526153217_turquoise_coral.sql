-- Create admin reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES car_listings(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admin_credentials(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_admin_reports_listing_id ON admin_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_admin_reports_admin_id ON admin_reports(admin_id);

-- Enable RLS
ALTER TABLE admin_reports ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_reports' 
    AND policyname = 'Admins can manage admin reports'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can manage admin reports"
        ON admin_reports
        FOR ALL
        TO authenticated
        USING (EXISTS (
          SELECT 1 FROM admin_credentials 
          WHERE admin_credentials.id = auth.uid()
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM admin_credentials 
          WHERE admin_credentials.id = auth.uid()
        ));
    $policy$;
  END IF;
END
$$;

-- Drop existing function if it exists to avoid return type error
DROP FUNCTION IF EXISTS create_admin_report(uuid, uuid, text, text);

-- Create function to handle admin reports with jsonb return type
CREATE OR REPLACE FUNCTION create_admin_report(
  p_listing_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_report_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (
    SELECT 1 FROM admin_credentials 
    WHERE id = p_admin_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid admin_id'
    );
  END IF;

  -- Create report
  INSERT INTO admin_reports (
    listing_id,
    admin_id,
    reason,
    details
  ) VALUES (
    p_listing_id,
    p_admin_id,
    p_reason,
    p_details
  )
  RETURNING id INTO v_report_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;