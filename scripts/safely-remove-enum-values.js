const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function safelyRemoveEnumValues() {
  try {
    console.log('🔍 Step 1: Verifying no data uses old enum values...\n');

    // Check for opportunities with old stages
    const opportunitiesWithOldStages = await prisma.$queryRaw`
      SELECT id, titre, "pipeline_stage"
      FROM opportunities
      WHERE "pipeline_stage" IN ('etude', 'devis')
    `;

    if (opportunitiesWithOldStages.length > 0) {
      console.log(`⚠️  Found ${opportunitiesWithOldStages.length} opportunities using old stages.`);
      console.log('Please run the migration script first: node scripts/migrate-pipeline-stages.js');
      return;
    }

    console.log('✅ No data found using old enum values.\n');

    console.log('🔧 Step 2: Removing enum values from PostgreSQL...\n');

    // PostgreSQL doesn't support removing enum values directly
    // We need to:
    // 1. Create a new enum without the old values
    // 2. Update the column to use the new enum
    // 3. Drop the old enum
    // 4. Rename the new enum to the old name

    await prisma.$executeRaw`
      -- Create new enum without etude and devis
      DO $$ 
      BEGIN
        -- Check if enum already exists (in case script was run before)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpportunityPipelineStage_new') THEN
          CREATE TYPE "OpportunityPipelineStage_new" AS ENUM (
            'prise_de_besoin',
            'projet_accepte',
            'acompte_recu',
            'gagnee',
            'perdue'
          );
        END IF;
      END $$;
    `;

    console.log('✅ Created new enum type...');

    // Drop the default constraint first
    await prisma.$executeRaw`
      ALTER TABLE opportunities 
      ALTER COLUMN pipeline_stage 
      DROP DEFAULT;
    `;

    console.log('✅ Dropped default constraint...');

    // Update the column to use the new enum
    await prisma.$executeRaw`
      ALTER TABLE opportunities 
      ALTER COLUMN pipeline_stage 
      TYPE "OpportunityPipelineStage_new" 
      USING pipeline_stage::text::"OpportunityPipelineStage_new";
    `;

    console.log('✅ Updated opportunities table to use new enum...');

    // Set the new default
    await prisma.$executeRaw`
      ALTER TABLE opportunities 
      ALTER COLUMN pipeline_stage 
      SET DEFAULT 'projet_accepte'::"OpportunityPipelineStage_new";
    `;

    console.log('✅ Set new default value...');

    // Drop the old enum
    await prisma.$executeRaw`
      DROP TYPE IF EXISTS "OpportunityPipelineStage";
    `;

    console.log('✅ Dropped old enum type...');

    // Rename the new enum to the original name
    await prisma.$executeRaw`
      ALTER TYPE "OpportunityPipelineStage_new" RENAME TO "OpportunityPipelineStage";
    `;

    console.log('✅ Renamed new enum to original name...\n');

    console.log('✨ Successfully removed "etude" and "devis" from OpportunityPipelineStage enum!');
    console.log('✅ Your database is now in sync with your schema.\n');

  } catch (error) {
    console.error('❌ Error removing enum values:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

safelyRemoveEnumValues()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

