const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Migration Script: Update Unassigned Leads to Mohamed
 * 
 * This script updates all leads that are:
 * - Assigned to "Non assigné"
 * - Have null/empty assignePar
 * 
 * And sets them to "Mohamed" (gestionnaire de projet)
 */
async function updateUnassignedLeads() {
  try {
    console.log('🔍 Checking for unassigned leads...\n');

    // First, find Mohamed's user record to ensure he exists
    const mohamedUser = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Mohamed',
          mode: 'insensitive'
        },
        role: {
          equals: 'gestionnaire',
          mode: 'insensitive'
        }
      }
    });

    let assigneeName = 'Mohamed';
    if (mohamedUser) {
      assigneeName = mohamedUser.name;
      console.log(`✅ Found gestionnaire user: ${assigneeName} (ID: ${mohamedUser.id})\n`);
    } else {
      console.log(`⚠️  No gestionnaire user named Mohamed found. Using default name "Mohamed"\n`);
    }

    // Find all leads with "Non assigné" or similar variations
    const unassignedLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { assignePar: { equals: 'Non assigné', mode: 'insensitive' } },
          { assignePar: { equals: 'non assigne', mode: 'insensitive' } },
          { assignePar: { equals: '', mode: 'insensitive' } },
          { assignePar: null },
        ]
      },
      select: {
        id: true,
        nom: true,
        assignePar: true,
        source: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (unassignedLeads.length === 0) {
      console.log('✅ No unassigned leads found. All leads have proper assignees!');
      console.log('\n✨ Database is up to date.\n');
      return;
    }

    console.log(`⚠️  Found ${unassignedLeads.length} unassigned lead(s):\n`);
    
    unassignedLeads.forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.nom} - Current: "${lead.assignePar || 'null'}" (Source: ${lead.source})`);
    });

    console.log(`\n📝 Updating all unassigned leads to: ${assigneeName}...\n`);

    // Update all unassigned leads
    const result = await prisma.lead.updateMany({
      where: {
        OR: [
          { assignePar: { equals: 'Non assigné', mode: 'insensitive' } },
          { assignePar: { equals: 'non assigne', mode: 'insensitive' } },
          { assignePar: { equals: '', mode: 'insensitive' } },
          { assignePar: null },
        ]
      },
      data: {
        assignePar: assigneeName,
        derniereMaj: new Date()
      }
    });

    console.log(`✅ Updated ${result.count} lead(s) successfully!`);
    console.log(`\n✨ All leads are now assigned to: ${assigneeName}\n`);

    // Show summary
    const totalLeads = await prisma.lead.count();
    const mohamedLeads = await prisma.lead.count({
      where: {
        assignePar: {
          contains: 'Mohamed',
          mode: 'insensitive'
        }
      }
    });

    console.log('📊 Summary:');
    console.log(`   Total leads in database: ${totalLeads}`);
    console.log(`   Leads assigned to Mohamed: ${mohamedLeads}`);
    console.log(`   Percentage: ${((mohamedLeads / totalLeads) * 100).toFixed(1)}%\n`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
updateUnassignedLeads()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

