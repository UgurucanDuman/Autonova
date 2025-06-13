/*
  # Update listing reports RLS policy

  1. Changes
    - Add new RLS policy to allow admins to insert into listing_reports table
    - Keep existing policies intact
    - Ensure admin access through admin_credentials check

  2. Security
    - Maintains existing RLS policies
    - Adds specific admin insert capability
    - Preserves data integrity
*/

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admin can manage listing reports" ON listing_reports;

-- Create new admin policy with explicit INSERT permission
CREATE POLICY "Admin can manage listing reports"
ON listing_reports
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