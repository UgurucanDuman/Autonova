/*
  # Fix Listing Reports RLS Policy

  1. Changes
    - Add policy to allow admins to create reports
    - Fix existing policies for listing_reports table
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can create reports" ON listing_reports;

-- Create policy to allow admins to manage listing reports
CREATE POLICY "Admin can manage listing reports"
  ON listing_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create policy to allow admins to create reports
CREATE POLICY "Admins can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = listing_reports.reporter_id
    )
  );