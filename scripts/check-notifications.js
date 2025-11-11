/**
 * Quick diagnostic script for notification system
 * Run with: node scripts/check-notifications.js
 */

const { PrismaClient } = require('@prisma/client');

async function checkNotificationSystem() {
  console.log('🔍 Checking Notification System...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('');

  // Check database connection
  console.log('🗄️  Database Connection:');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('  ✅ Connected to database');

    // Check if notifications table exists
    try {
      const count = await prisma.notification.count();
      console.log(`  ✅ Notifications table exists (${count} records)`);

      // Try to create a test notification
      try {
        const testNotif = await prisma.notification.create({
          data: {
            userId: 'test-user-id',
            type: 'rdv_reminder',
            priority: 'high',
            title: 'Test Notification',
            message: 'This is a test',
            createdBy: 'system-check'
          }
        });
        console.log('  ✅ Can create notifications');
        
        // Clean up test notification
        await prisma.notification.delete({
          where: { id: testNotif.id }
        });
        console.log('  ✅ Can delete notifications');
      } catch (error) {
        console.log('  ❌ Cannot create notifications:', error.message);
      }
    } catch (error) {
      console.log('  ❌ Notifications table missing or inaccessible:', error.message);
      console.log('\n  💡 Fix: Run "npx prisma db push" or "npx prisma migrate deploy"');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.log('  ❌ Cannot connect to database:', error.message);
    console.log('\n  💡 Fix: Check DATABASE_URL in .env.local');
  }

  console.log('\n✅ Diagnostic complete!');
  console.log('\nNext steps:');
  console.log('1. Fix any ❌ issues above');
  console.log('2. Run: npx prisma generate');
  console.log('3. Run: npx prisma db push');
  console.log('4. Restart your dev server');
  console.log('5. Test at /test-notifications');
}

checkNotificationSystem()
  .catch(console.error)
  .finally(() => process.exit());
