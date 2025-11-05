-- Add month tracking fields for TikTok leads
ALTER TABLE "leads" ADD COLUMN "month" TEXT;
ALTER TABLE "leads" ADD COLUMN "campaign_name" TEXT;
ALTER TABLE "leads" ADD COLUMN "uploaded_at" TIMESTAMPTZ;

-- Create indexes for better query performance
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_month_idx" ON "leads"("month");
