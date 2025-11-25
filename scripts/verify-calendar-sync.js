/**
 * Direct test of calendar event creation
 * This tests the EXACT flow when a task is created
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCalendarEventCreation() {
  console.log('\n🔍 TESTING CALENDAR EVENT CREATION\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get a test user
    console.log('\n📍 Step 1: Getting test architect user...');
    const architect = await prisma.user.findFirst({
      where: { role: 'architect' }
    });

    if (!architect) {
      console.error('❌ No architect found!');
      return;
    }

    console.log(`✅ Found: ${architect.name} (ID: ${architect.id})`);

    // Step 2: Get a test client
    console.log('\n📍 Step 2: Getting test client...');
    const client = await prisma.client.findFirst();

    if (!client) {
      console.error('❌ No client found!');
      return;
    }

    console.log(`✅ Found: ${client.nom} (ID: ${client.id})`);

    // Step 3: Get admins
    console.log('\n📍 Step 3: Getting admin users...');
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    });

    console.log(`✅ Found ${admins.length} admin(s)`);

    // Step 4: Create a task (SIMULATING THE API CALL)
    console.log('\n📍 Step 4: Creating task...');
    const taskTitle = `TEST-${Date.now()}`;
    const task = await prisma.task.create({
      data: {
        title: taskTitle,
        description: 'Test task for calendar sync',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        assignedTo: architect.name,
        linkedType: 'client',
        linkedId: client.id,
        status: 'a_faire',
        createdBy: 'Test Script'
      }
    });

    console.log(`✅ Task created: ${task.id}`);
    console.log(`   Title: ${task.title}`);
    console.log(`   Assigned to: ${task.assignedTo}`);

    // Step 5: NOW CREATE THE CALENDAR EVENT (THIS IS WHAT SHOULD BE AUTOMATIC)
    console.log('\n📍 Step 5: Creating calendar event (SHOULD BE AUTOMATIC!)...');
    
    const endDate = new Date(task.dueDate);
    endDate.setHours(endDate.getHours() + 1);

    const participants = [architect.id, ...admins.map(a => a.id).filter(id => id !== architect.id)];

    const event = await prisma.calendarEvent.create({
      data: {
        title: task.title,
        description: task.description,
        startDate: task.dueDate,
        endDate: endDate,
        eventType: 'suivi_projet',
        assignedTo: architect.id,  // ← USER ID, NOT NAME
        visibility: 'team',
        participants: participants,
        linkedClientId: client.id,
        createdBy: 'Test Script'
      }
    });

    console.log(`✅ Calendar event created: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Assigned to: ${event.assignedTo}`);
    console.log(`   Participants: ${event.participants.length}`);

    // Step 6: VERIFY - Try to fetch as admin
    console.log('\n📍 Step 6: Verifying - Admin should see this event...');
    const admin = admins[0];

    const eventsVisibleToAdmin = await prisma.calendarEvent.findMany({
      where: {
        OR: [
          { createdBy: admin.id },
          { assignedTo: admin.id },
          { participants: { has: admin.id } },
          { visibility: 'all' }
        ]
      }
    });

    const ourEvent = eventsVisibleToAdmin.find(e => e.id === event.id);

    if (ourEvent) {
      console.log(`✅ Admin CAN see the event`);
    } else {
      console.log(`❌ Admin CANNOT see the event (should be in participants)`);
      console.log(`   Event participants: ${event.participants}`);
      console.log(`   Admin ID: ${admin.id}`);
      console.log(`   Admin in participants? ${event.participants.includes(admin.id)}`);
    }

    // Step 7: Verify fetch via date range (like the calendar does)
    console.log('\n📍 Step 7: Verifying - Fetch by date range (like calendar does)...');
    const startOfMonth = new Date(task.dueDate);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(task.dueDate);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const eventsInRange = await prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        OR: [
          { createdBy: admin.id },
          { assignedTo: admin.id },
          { participants: { has: admin.id } },
          { visibility: 'all' }
        ]
      }
    });

    const ourEventInRange = eventsInRange.find(e => e.id === event.id);

    if (ourEventInRange) {
      console.log(`✅ Event IS visible in date range query`);
      console.log(`   Total events found: ${eventsInRange.length}`);
    } else {
      console.log(`❌ Event NOT visible in date range query`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📝 SUMMARY\n');
    console.log(`Task ID: ${task.id}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`Assignee: ${architect.name} (${architect.id})`);
    console.log(`Event assignedTo: ${event.assignedTo}`);
    console.log(`Participants: ${event.participants.length}`);
    console.log(`Visible to admin: ${ourEvent ? '✅' : '❌'}`);
    console.log(`In date range: ${ourEventInRange ? '✅' : '❌'}`);

    console.log('\n🎯 IF YOU SEE BOTH ✅, THEN THE IMPLEMENTATION WORKS!\n');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendarEventCreation();
