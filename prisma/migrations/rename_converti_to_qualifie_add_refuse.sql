-- Migration: Replace 'converti' with 'qualifie' and add 'refuse' status
-- This migration recreates the LeadStatus enum

-- Step 1: Add temporary TEXT column
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "statut_temp" TEXT;

-- Step 2: Copy current statut values to temp column, converting 'converti' to 'qualifie'
UPDATE "leads" SET "statut_temp" = CASE 
    WHEN "statut"::text = 'converti' THEN 'qualifie'
    ELSE "statut"::text
END;

-- Step 3: Drop old statut column
ALTER TABLE "leads" DROP COLUMN "statut";

-- Step 4: Drop old enum type
DROP TYPE "LeadStatus";

-- Step 5: Create new enum type with 'qualifie' and 'refuse'
CREATE TYPE "LeadStatus" AS ENUM ('nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'qualifie', 'refuse');

-- Step 6: Add back statut column with new enum type
ALTER TABLE "leads" ADD COLUMN "statut" "LeadStatus";

-- Step 7: Copy data from temp column to new enum column
UPDATE "leads" SET "statut" = "statut_temp"::"LeadStatus";

-- Step 8: Make column NOT NULL
ALTER TABLE "leads" ALTER COLUMN "statut" SET NOT NULL;

-- Step 9: Drop temp column
ALTER TABLE "leads" DROP COLUMN "statut_temp";
