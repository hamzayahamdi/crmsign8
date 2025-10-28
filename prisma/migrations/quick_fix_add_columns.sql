-- Quick fix: Add missing columns to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "magasin" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "commercialMagasin" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Create lead_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "lead_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'lead_notes_leadid_idx') THEN
        CREATE INDEX "lead_notes_leadId_idx" ON "lead_notes"("leadId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'lead_notes_createdat_idx') THEN
        CREATE INDEX "lead_notes_createdAt_idx" ON "lead_notes"("createdAt" DESC);
    END IF;
END $$;

-- Add foreign key if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_notes_leadid_fkey'
    ) THEN
        ALTER TABLE "lead_notes" 
        ADD CONSTRAINT "lead_notes_leadId_fkey" 
        FOREIGN KEY ("leadId") REFERENCES "leads"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
