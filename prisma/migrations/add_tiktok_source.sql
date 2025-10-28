-- Add 'tiktok' to LeadSource enum
-- Check what the actual column type is and add the value
DO $$
DECLARE
  source_column_type text;
BEGIN
  -- Get the actual data type of the source column
  SELECT data_type INTO source_column_type
  FROM information_schema.columns
  WHERE table_name = 'leads' AND column_name = 'source';
  
  -- If it's already text, we don't need to do anything
  IF source_column_type = 'text' OR source_column_type = 'character varying' THEN
    RAISE NOTICE 'Source column is already text type, no enum to modify';
  ELSE
    -- Try to add to enum if it exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadSource') THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'tiktok' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LeadSource')
      ) THEN
        ALTER TYPE "LeadSource" ADD VALUE 'tiktok';
      END IF;
    ELSE
      RAISE NOTICE 'LeadSource enum does not exist - source column might be text';
    END IF;
  END IF;
END $$;
