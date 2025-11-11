/**
 * Rename campaign to avoid truncation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameCampaign() {
  console.log('🔄 Renaming campaign...\n');

  try {
    const result = await prisma.lead.updateMany({
      where: {
        campaignName: 'TikTok Leads Import – Octobre/Novembre 2025'
      },
      data: {
        campaignName: 'Leads Import – Octobre/Novembre 2025'
      }
    });

    console.log(`✅ Renamed campaign for ${result.count} leads\n`);
    console.log('New campaign name: "Leads Import – Octobre/Novembre 2025"');
    
    return result.count;
  } catch (error) {
    console.error('❌ Error renaming campaign:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  renameCampaign()
    .then((count) => {
      console.log(`\n✅ Complete. ${count} leads updated.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { renameCampaign };
