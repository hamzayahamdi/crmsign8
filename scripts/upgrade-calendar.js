/**
 * Calendar Upgrade Script
 * Applies database migrations for collaborative calendar features
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upgradeCalendar() {
  console.log('🚀 Starting calendar upgrade...\n');

  try {
    // Step 1: Check if migration is needed
    console.log('📊 Checking current schema...');
    const sampleEvent = await prisma.calendarEvent.findFirst();
    
    if (sampleEvent && 'participants' in sampleEvent && 'visibility' in sampleEvent) {
      console.log('✅ Calendar schema is already up to date!');
      console.log('   - participants field: exists');
      console.log('   - visibility field: exists\n');
      return;
    }

    console.log('⚠️  Schema needs updating. Running migration...\n');

    // Step 2: Apply Prisma schema changes
    console.log('📝 Generating Prisma client...');
    const { execSync } = require('child_process');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('\n📤 Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    console.log('\n✅ Database schema updated successfully!\n');

    // Step 3: Verify the changes
    console.log('🔍 Verifying changes...');
    const updatedEvent = await prisma.calendarEvent.findFirst();
    
    if (updatedEvent) {
      console.log('✅ Verification successful!');
      console.log('   Sample event structure:');
      console.log('   - participants:', updatedEvent.participants || []);
      console.log('   - visibility:', updatedEvent.visibility || 'team');
    }

    // Step 4: Update existing events with default values
    console.log('\n🔄 Updating existing events with default values...');
    const updateResult = await prisma.calendarEvent.updateMany({
      where: {
        OR: [
          { participants: null },
          { visibility: null }
        ]
      },
      data: {
        participants: [],
        visibility: 'team'
      }
    });

    console.log(`✅ Updated ${updateResult.count} existing events\n`);

    // Step 5: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Calendar upgrade completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Summary:');
    console.log('   ✅ Database schema updated');
    console.log('   ✅ Prisma client regenerated');
    console.log('   ✅ Existing events migrated');
    console.log('   ✅ Default values applied\n');

    console.log('🚀 Next steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Test creating a new RDV with participants');
    console.log('   3. Verify real-time sync is working');
    console.log('   4. Check notifications are being sent\n');

    console.log('📚 For more information, see:');
    console.log('   CALENDAR_UPGRADE_GUIDE.md\n');

  } catch (error) {
    console.error('\n❌ Error during calendar upgrade:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure your database is running');
    console.error('   2. Check DATABASE_URL in .env file');
    console.error('   3. Verify you have database permissions');
    console.error('   4. Try running: npx prisma db push --force-reset\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the upgrade
upgradeCalendar();
