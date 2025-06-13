/*
  # Vehicle History Reports Table

  1. New Table
    - `vehicle_history_reports` - Stores vehicle history reports
*/

-- Create vehicle_history_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_history_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin TEXT NOT NULL,
  vehicle_brand TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_history_reports_vin ON vehicle_history_reports(vin);

-- Enable RLS on vehicle_history_reports
ALTER TABLE vehicle_history_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle_history_reports
CREATE POLICY "Anyone can read vehicle history reports"
  ON vehicle_history_reports
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert vehicle history reports"
  ON vehicle_history_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to execute SQL (for creating tables if they don't exist)
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;