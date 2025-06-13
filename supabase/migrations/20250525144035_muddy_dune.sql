/*
  # Fix Admin RLS Policies for Listing Reports

  1. Changes
    - Drop existing conflicting policies
    - Create proper policies for admin users to manage and create reports
    - Ensure regular users can still create their own reports
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;
DROP POLICY IF EXISTS "Admins can create reports" ON listing_reports;
DROP POLICY IF EXISTS "Users can create reports" ON listing_reports;

-- Create policy to allow admins to manage all listing reports
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

-- Create policy specifically for admins to create reports
CREATE POLICY "Admins can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_credentials
      WHERE admin_credentials.id = auth.uid()
    )
  );

-- Create policy for regular users to create reports
CREATE POLICY "Users can create reports"
  ON listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);