-- Check current source column type and fix if needed
DO $$
DECLARE
  source_udt_name text;
BEGIN
  -- Get the actual UDT name (user-defined type) of the source column
  SELECT udt_name INTO source_udt_name
  FROM information_schema.columns
  WHERE table_name = 'leads' AND column_name = 'source';
  
  RAISE NOTICE 'Source column type: %', source_udt_name;
  
  -- If it's text, we don't need to do anything - tiktok will work
  IF source_udt_name = 'text' OR source_udt_name = 'varchar' THEN
    RAISE NOTICE 'Source is TEXT - no migration needed, tiktok already works!';
  ELSE
    -- It's an enum, try to add tiktok
    RAISE NOTICE 'Source is enum type: %', source_udt_name;
    
    -- Check if tiktok already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = source_udt_name
      AND e.enumlabel = 'tiktok'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''tiktok''', source_udt_name);
      RAISE NOTICE 'Added tiktok to enum %', source_udt_name;
    ELSE
      RAISE NOTICE 'tiktok already exists in enum %', source_udt_name;
    END IF;
  END IF;
END $$;
