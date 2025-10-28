-- SAFE ENUM TRANSFORM AND NON-DESTRUCTIVE ADDITIONS
-- This migration maps existing enum values to the new ones and preserves data.

-- =====================
-- LeadStatus transform
-- =====================
DO $$
BEGIN
  -- Create new enum with the desired values
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leadstatus_new') THEN
    CREATE TYPE "LeadStatus_new" AS ENUM ('nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'converti');
  END IF;

  -- Alter column to new enum via USING with explicit mapping
  ALTER TABLE "leads"
  ALTER COLUMN "statut" TYPE "LeadStatus_new"
  USING (
    CASE ("statut"::text)
      WHEN 'nouveau' THEN 'nouveau'
      WHEN 'a_recontacter' THEN 'a_recontacter'
      WHEN 'en_cours' THEN 'sans_reponse'
      WHEN 'signe' THEN 'converti'
      WHEN 'perdu' THEN 'non_interesse'
      ELSE 'a_recontacter'
    END::"LeadStatus_new"
  );

  -- Drop old type and rename
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leadstatus') THEN
    DROP TYPE "LeadStatus";
  END IF;
  ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
END $$;

-- =====================
-- LeadSource transform
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leadsource_new') THEN
    CREATE TYPE "LeadSource_new" AS ENUM ('magasin', 'site_web', 'facebook', 'instagram', 'reference_client', 'autre');
  END IF;

  ALTER TABLE "leads"
  ALTER COLUMN "source" TYPE "LeadSource_new"
  USING (
    CASE ("source"::text)
      WHEN 'magasin' THEN 'magasin'
      WHEN 'site_web' THEN 'site_web'
      WHEN 'recommandation' THEN 'reference_client'
      WHEN 'reseaux_sociaux' THEN 'autre'
      WHEN 'facebook' THEN 'facebook'
      WHEN 'instagram' THEN 'instagram'
      WHEN 'reference_client' THEN 'reference_client'
      WHEN 'autre' THEN 'autre'
      ELSE 'autre'
    END::"LeadSource_new"
  );

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leadsource') THEN
    DROP TYPE "LeadSource";
  END IF;
  ALTER TYPE "LeadSource_new" RENAME TO "LeadSource";
END $$;

-- =====================
-- Non-destructive additions
-- =====================
-- Add columns only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'magasin'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "magasin" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'commercialMagasin'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "commercialMagasin" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'createdBy'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "createdBy" TEXT;
  END IF;
END $$;

-- Create lead_notes table if it does not exist
CREATE TABLE IF NOT EXISTS "lead_notes" (
  "id" TEXT PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'lead_notes_leadid_idx'
  ) THEN
    CREATE INDEX "lead_notes_leadId_idx" ON "lead_notes"("leadId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'lead_notes_createdat_idx'
  ) THEN
    CREATE INDEX "lead_notes_createdAt_idx" ON "lead_notes"("createdAt" DESC);
  END IF;
END $$;

-- Add FK if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_notes_leadId_fkey'
  ) THEN
    ALTER TABLE "lead_notes" 
      ADD CONSTRAINT "lead_notes_leadId_fkey" 
      FOREIGN KEY ("leadId") 
      REFERENCES "leads"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
