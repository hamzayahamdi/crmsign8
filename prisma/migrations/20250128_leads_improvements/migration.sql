-- AlterEnum: Update LeadStatus enum
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
CREATE TYPE "LeadStatus" AS ENUM ('nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'converti');
ALTER TABLE "leads" ALTER COLUMN "statut" TYPE "LeadStatus" USING ("statut"::text::"LeadStatus");
DROP TYPE "LeadStatus_old";

-- AlterEnum: Update LeadSource enum
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
CREATE TYPE "LeadSource" AS ENUM ('magasin', 'site_web', 'facebook', 'instagram', 'reference_client', 'autre');
ALTER TABLE "leads" ALTER COLUMN "source" TYPE "LeadSource" USING (
  CASE 
    WHEN "source"::text = 'recommandation' THEN 'reference_client'::text
    WHEN "source"::text = 'reseaux_sociaux' THEN 'facebook'::text
    ELSE "source"::text
  END::"LeadSource"
);
DROP TYPE "LeadSource_old";

-- AlterTable: Add new columns to leads
ALTER TABLE "leads" ADD COLUMN "magasin" TEXT;
ALTER TABLE "leads" ADD COLUMN "commercialMagasin" TEXT;
ALTER TABLE "leads" ADD COLUMN "createdBy" TEXT;

-- CreateTable: Create lead_notes table
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_notes_leadId_idx" ON "lead_notes"("leadId");
CREATE INDEX "lead_notes_createdAt_idx" ON "lead_notes"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
