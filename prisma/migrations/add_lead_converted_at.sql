-- Add converted_at field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Create index for performance on converted_at queries
CREATE INDEX IF NOT EXISTS leads_converted_at_idx ON leads(converted_at);

-- Backfill converted_at for existing converted leads (set to updatedAt as best estimate)
UPDATE leads 
SET converted_at = updated_at 
WHERE statut = 'converti' AND converted_at IS NULL;

-- Backfill converted_at for non_interesse leads (set to updatedAt as best estimate)
UPDATE leads 
SET converted_at = updated_at 
WHERE statut = 'non_interesse' AND converted_at IS NULL;

-- Create trigger function to automatically set converted_at when status changes
CREATE OR REPLACE FUNCTION set_lead_converted_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Set converted_at when status changes to 'converti' or 'non_interesse'
  IF (NEW.statut = 'converti' OR NEW.statut = 'non_interesse') 
     AND (OLD.statut IS NULL OR (OLD.statut != 'converti' AND OLD.statut != 'non_interesse'))
     AND NEW.converted_at IS NULL THEN
    NEW.converted_at := NOW();
  END IF;
  
  -- Clear converted_at if status changes back from 'converti' or 'non_interesse'
  IF (OLD.statut = 'converti' OR OLD.statut = 'non_interesse')
     AND NEW.statut != 'converti' 
     AND NEW.statut != 'non_interesse' THEN
    NEW.converted_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS on_lead_status_change ON leads;
CREATE TRIGGER on_lead_status_change
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_lead_converted_date();

-- Comment for documentation
COMMENT ON COLUMN leads.converted_at IS 'Timestamp when lead was converted to client or marked as non-interested';
