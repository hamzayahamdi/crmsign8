-- FINAL FIX: Migrate enum values using temporary columns

-- Step 1: Add temporary TEXT columns
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "statut_temp" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source_temp" TEXT;

-- Step 2: Copy and transform data to temp columns
UPDATE "leads" SET "statut_temp" = CASE 
    WHEN "statut"::text = 'signe' THEN 'converti'
    WHEN "statut"::text = 'en_cours' THEN 'sans_reponse'
    WHEN "statut"::text = 'perdu' THEN 'non_interesse'
    WHEN "statut"::text = 'nouveau' THEN 'nouveau'
    WHEN "statut"::text = 'a_recontacter' THEN 'a_recontacter'
    ELSE 'a_recontacter'
END;

UPDATE "leads" SET "source_temp" = CASE 
    WHEN "source"::text = 'recommandation' THEN 'reference_client'
    WHEN "source"::text = 'reseaux_sociaux' THEN 'autre'
    WHEN "source"::text = 'magasin' THEN 'magasin'
    WHEN "source"::text = 'site_web' THEN 'site_web'
    ELSE 'autre'
END;

-- Step 3: Drop old columns
ALTER TABLE "leads" DROP COLUMN "statut";
ALTER TABLE "leads" DROP COLUMN "source";

-- Step 4: Drop old enum types
DROP TYPE IF EXISTS "LeadStatus";
DROP TYPE IF EXISTS "LeadSource";

-- Step 5: Create new enum types
CREATE TYPE "LeadStatus" AS ENUM ('nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'converti');
CREATE TYPE "LeadSource" AS ENUM ('magasin', 'site_web', 'facebook', 'instagram', 'reference_client', 'autre');

-- Step 6: Add back columns with new enum types
ALTER TABLE "leads" ADD COLUMN "statut" "LeadStatus";
ALTER TABLE "leads" ADD COLUMN "source" "LeadSource";

-- Step 7: Copy data from temp columns to new enum columns
UPDATE "leads" SET "statut" = "statut_temp"::"LeadStatus";
UPDATE "leads" SET "source" = "source_temp"::"LeadSource";

-- Step 8: Make columns NOT NULL
ALTER TABLE "leads" ALTER COLUMN "statut" SET NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "source" SET NOT NULL;

-- Step 9: Drop temp columns
ALTER TABLE "leads" DROP COLUMN "statut_temp";
ALTER TABLE "leads" DROP COLUMN "source_temp";
