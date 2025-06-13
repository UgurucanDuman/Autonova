-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admins can insert into message_reports" ON message_reports;
DROP POLICY IF EXISTS "Regular users can create reports" ON message_reports;
DROP POLICY IF EXISTS "Users can create message reports" ON message_reports;
DROP POLICY IF EXISTS "Admin can manage message reports" ON message_reports;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reports' 
    AND policyname = 'Admins can manage message reports'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can manage message reports"
      ON public.message_reports
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 
          FROM admin_credentials 
          WHERE admin_credentials.id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 
          FROM admin_credentials 
          WHERE admin_credentials.id = auth.uid()
        )
      )
    $policy$;
  END IF;
END
$$;

-- Check if policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'message_reports' 
    AND policyname = 'Users can create message reports'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can create message reports"
      ON public.message_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = reporter_id)
    $policy$;
  END IF;
END
$$;

-- Ensure RLS is enabled
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;