/**
 * Delete incorrectly imported leads from Nov 11, 2025
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteNov11Leads() {
  console.log('🗑️  Deleting incorrectly imported leads from Nov 11, 2025...\n');

  try {
    // Delete leads uploaded on Nov 11, 2025
    const result = await prisma.lead.deleteMany({
      where: {
        uploadedAt: {
          gte: new Date('2025-11-11T00:00:00.000Z'),
          lt: new Date('2025-11-12T00:00:00.000Z')
        }
      }
    });

    console.log(`✅ Deleted ${result.count} leads from Nov 11, 2025\n`);
    
    return result.count;
  } catch (error) {
    console.error('❌ Error deleting leads:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  deleteNov11Leads()
    .then((count) => {
      console.log(`✅ Cleanup complete. ${count} leads removed.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { deleteNov11Leads };
