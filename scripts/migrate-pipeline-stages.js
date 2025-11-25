const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migratePipelineStages() {
  try {
    console.log('🔍 Checking for opportunities with old pipeline stages (etude, devis)...\n');

    // First, we need to query using raw SQL since Prisma won't let us query invalid enum values
    const opportunitiesWithOldStages = await prisma.$queryRaw`
      SELECT id, titre, "pipeline_stage", "contact_id"
      FROM opportunities
      WHERE "pipeline_stage" IN ('etude', 'devis')
    `;

    if (opportunitiesWithOldStages.length === 0) {
      console.log('✅ No opportunities found with old pipeline stages. Safe to proceed!');
      return;
    }

    console.log(`⚠️  Found ${opportunitiesWithOldStages.length} opportunity/opportunities with old stages:\n`);
    
    opportunitiesWithOldStages.forEach((opp, index) => {
      console.log(`  ${index + 1}. ${opp.titre} (ID: ${opp.id}) - Current stage: ${opp.pipeline_stage}`);
    });

    console.log('\n📝 Migrating to "projet_accepte" (Project Accepted)...\n');

    // Migrate etude and devis to projet_accepte
    const updateEtude = await prisma.$executeRaw`
      UPDATE opportunities
      SET "pipeline_stage" = 'projet_accepte'
      WHERE "pipeline_stage" = 'etude'
    `;

    const updateDevis = await prisma.$executeRaw`
      UPDATE opportunities
      SET "pipeline_stage" = 'projet_accepte'
      WHERE "pipeline_stage" = 'devis'
    `;

    console.log(`✅ Migrated ${updateEtude} opportunity/opportunities from "etude" to "projet_accepte"`);
    console.log(`✅ Migrated ${updateDevis} opportunity/opportunities from "devis" to "projet_accepte"`);
    console.log(`\n✅ Total migrated: ${updateEtude + updateDevis} opportunity/opportunities`);
    console.log('\n✅ Migration complete! You can now safely run: npx prisma db push\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migratePipelineStages()
  .then(() => {
    console.log('\n✨ Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });



