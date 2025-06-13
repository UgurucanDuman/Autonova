-- Check if constraints already exist before adding them
DO $$ 
BEGIN
    -- Check if listing_reports_reporter_id_fkey constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'listing_reports_reporter_id_fkey'
    ) THEN
        -- Add foreign key relationship for listing_reports
        ALTER TABLE listing_reports
        ADD CONSTRAINT listing_reports_reporter_id_fkey
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Check if message_reports_reporter_id_fkey constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_reports_reporter_id_fkey'
    ) THEN
        -- Add foreign key relationship for message_reports
        ALTER TABLE message_reports
        ADD CONSTRAINT message_reports_reporter_id_fkey
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter_id ON listing_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id ON message_reports(reporter_id);