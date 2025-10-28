-- Step 1: Update all existing rows to use new enum values BEFORE changing the enum type
-- This ensures no data uses the old enum values

-- Update LeadStatus values
UPDATE "leads" SET "statut" = 'converti' WHERE "statut" = 'signe';
UPDATE "leads" SET "statut" = 'sans_reponse' WHERE "statut" = 'en_cours';
UPDATE "leads" SET "statut" = 'non_interesse' WHERE "statut" = 'perdu';

-- Update LeadSource values
UPDATE "leads" SET "source" = 'reference_client' WHERE "source" = 'recommandation';
UPDATE "leads" SET "source" = 'autre' WHERE "source" = 'reseaux_sociaux';

-- Step 2: Now safely alter the enum types (data is already migrated)
-- Drop and recreate LeadStatus enum
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "LeadStatus" AS ENUM ('nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'converti');
ALTER TABLE "leads" ALTER COLUMN "statut" TYPE "LeadStatus" USING "statut"::text::"LeadStatus";
DROP TYPE "LeadStatus_old";

-- Drop and recreate LeadSource enum
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
CREATE TYPE "LeadSource" AS ENUM ('magasin', 'site_web', 'facebook', 'instagram', 'reference_client', 'autre');
ALTER TABLE "leads" ALTER COLUMN "source" TYPE "LeadSource" USING "source"::text::"LeadSource";
DROP TYPE "LeadSource_old";
