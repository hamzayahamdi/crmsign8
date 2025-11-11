/**
 * Cleanup all test notifications from the database (global, all users)
 * Usage: node scripts/cleanup-test-notifications.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Removing test notifications...');

  // Build broad criteria to catch all test data created earlier
  const where = {
    OR: [
      // Titles starting with or containing 'Test:' (with or without emoji prefix)
      { title: { contains: 'Test:', mode: 'insensitive' } },
      // Messages that include '(test)' or the word test
      { message: { contains: '(test)', mode: 'insensitive' } },
      { message: { contains: 'test', mode: 'insensitive' } },
      // Linked identifiers used in the test data
      { linkedId: 'test-client-id' },
      { linkedName: { equals: 'Client Test', mode: 'insensitive' } },
    ],
  };

  const totalBefore = await prisma.notification.count({ where });
  console.log(`Found ${totalBefore} test notifications to delete.`);

  if (totalBefore === 0) {
    console.log('✅ Nothing to delete.');
    return;
  }

  const result = await prisma.notification.deleteMany({ where });
  console.log(`✅ Deleted ${result.count} notifications.`);
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
