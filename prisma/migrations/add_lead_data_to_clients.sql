-- Add lead_data JSON field to clients table for storing original lead data
-- This enables lead restoration when a client is deleted (undo conversion)

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "lead_data" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "clients"."lead_data" IS 'Complete original lead data for restoration when client is deleted';
