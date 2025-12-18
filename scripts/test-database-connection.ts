/**
 * Script to test database connection and verify contacts can be queried
 * 
 * Usage:
 *   npx tsx scripts/test-database-connection.ts
 *   or
 *   tsx scripts/test-database-connection.ts
 */

import { prisma } from '../lib/database';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic database connection...');
    await prisma.$connect();
    console.log('   ✅ Database connection successful\n');

    // Test 2: Query raw SQL to verify connection
    console.log('2. Testing raw SQL query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Raw query successful:', result);
    console.log('');

    // Test 3: Count contacts
    console.log('3. Testing Contact model queries...');
    try {
      const contactCount = await prisma.contact.count();
      console.log(`   ✅ Found ${contactCount} contacts in database\n`);

      // Test 4: Get a sample contact if any exist
      if (contactCount > 0) {
        console.log('4. Fetching sample contact...');
        const sampleContact = await prisma.contact.findFirst({
          select: {
            id: true,
            nom: true,
            telephone: true,
            email: true,
            createdAt: true,
          },
        });

        if (sampleContact) {
          console.log('   ✅ Sample contact found:');
          console.log(`      ID: ${sampleContact.id}`);
          console.log(`      Name: ${sampleContact.nom}`);
          console.log(`      Phone: ${sampleContact.telephone}`);
          console.log(`      Email: ${sampleContact.email || 'N/A'}`);
          console.log(`      Created: ${sampleContact.createdAt}\n`);

          // Test 5: Try to fetch timeline for this contact
          console.log('5. Testing timeline query for sample contact...');
          const timelineCount = await prisma.timeline.count({
            where: { contactId: sampleContact.id },
          });
          console.log(`   ✅ Found ${timelineCount} timeline entries for this contact\n`);
        }
      } else {
        console.log('   ℹ️  No contacts found in database\n');
      }
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log('   ⚠️  Contact table does not exist or schema not migrated');
        console.log('   📝 Run: npx prisma generate && npx prisma db push\n');
      } else {
        throw error;
      }
    }

    // Test 6: Check database URL
    console.log('6. Checking database configuration...');
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      // Mask sensitive parts of the URL
      const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
      console.log(`   ✅ DATABASE_URL is set: ${maskedUrl}\n`);
    } else {
      console.log('   ❌ DATABASE_URL is not set\n');
    }

    // Test 7: Test other models
    console.log('7. Testing other models...');
    const counts = {
      users: await prisma.user.count().catch(() => 0),
      leads: await prisma.lead.count().catch(() => 0),
      clients: await prisma.client.count().catch(() => 0),
      opportunities: await prisma.opportunity.count().catch(() => 0),
      tasks: await prisma.task.count().catch(() => 0),
      timeline: await prisma.timeline.count().catch(() => 0),
    };

    console.log('   Table counts:');
    for (const [table, count] of Object.entries(counts)) {
      console.log(`      ${table.padEnd(15)}: ${count}`);
    }
    console.log('');

    console.log('✨ All database tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Database connection test failed:\n');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nError details:');
      console.error(`   Name: ${error.name}`);
      console.error(`   Message: ${error.message}`);
      if ('code' in error) {
        console.error(`   Code: ${(error as any).code}`);
      }
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check if DATABASE_URL is set correctly in .env file');
    console.error('   2. Verify database server is running and accessible');
    console.error('   3. Check network connectivity to database');
    console.error('   4. Verify database credentials are correct');
    console.error('   5. Run: npx prisma generate && npx prisma db push\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

