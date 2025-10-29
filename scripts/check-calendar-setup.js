/**
 * Check if calendar is properly set up in the database
 * Run with: node scripts/check-calendar-setup.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCalendarSetup() {
  console.log('🔍 Checking Calendar Setup...\n');

  try {
    // Check if CalendarEvent table exists and has data
    console.log('1️⃣ Checking CalendarEvent table...');
    try {
      const eventCount = await prisma.calendarEvent.count();
      console.log(`✅ CalendarEvent table exists`);
      console.log(`   Events in database: ${eventCount}`);
      
      if (eventCount > 0) {
        const recentEvents = await prisma.calendarEvent.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedToUser: {
              select: { name: true, email: true }
            }
          }
        });
        
        console.log('\n   Recent events:');
        recentEvents.forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.title}`);
          console.log(`      Type: ${event.eventType}`);
          console.log(`      Assigned to: ${event.assignedToUser?.name || 'Unknown'}`);
          console.log(`      Date: ${event.startDate.toLocaleDateString()}`);
        });
      }
    } catch (error) {
      console.error('❌ CalendarEvent table not found or error:', error.message);
      console.log('\n   Run this to create the table:');
      console.log('   npx prisma migrate dev');
      return;
    }

    // Check users
    console.log('\n2️⃣ Checking Users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    console.log(`✅ Found ${users.length} users`);
    users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found! You need at least one user to test calendar.');
      console.log('   Create a user or run seed script.');
    }

    // Check if there are any events assigned to existing users
    console.log('\n3️⃣ Checking Event Assignments...');
    const userIds = users.map(u => u.id);
    const assignedEvents = await prisma.calendarEvent.count({
      where: {
        assignedTo: { in: userIds }
      }
    });
    console.log(`✅ ${assignedEvents} events assigned to existing users`);

    const orphanedEvents = await prisma.calendarEvent.count({
      where: {
        assignedTo: { notIn: userIds }
      }
    });
    if (orphanedEvents > 0) {
      console.log(`⚠️  ${orphanedEvents} events assigned to non-existent users`);
    }

    console.log('\n✅ Calendar setup check complete!');
    console.log('\n📋 Summary:');
    console.log(`   - CalendarEvent table: ✅`);
    console.log(`   - Total events: ${eventCount}`);
    console.log(`   - Total users: ${users.length}`);
    console.log(`   - Valid assignments: ${assignedEvents}`);
    console.log(`   - Orphaned events: ${orphanedEvents}`);

    if (users.length > 0 && eventCount >= 0) {
      console.log('\n🎉 Everything looks good! Calendar should work.');
    }

  } catch (error) {
    console.error('\n❌ Error checking calendar setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendarSetup();
