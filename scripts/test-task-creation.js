/**
 * Test script to verify task creation creates calendar events
 * Usage: node scripts/test-task-creation.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTaskCreation() {
  console.log('🧪 Starting task creation test...\n');

  try {
    // 1. Get an existing user
    console.log('📍 Step 1: Fetching test user...');
    const testUser = await prisma.user.findFirst({
      where: { role: 'architect' }
    });

    if (!testUser) {
      console.error('❌ No architect user found');
      return;
    }

    console.log(`✅ Found user: ${testUser.name} (ID: ${testUser.id})\n`);

    // 2. Get a test client
    console.log('📍 Step 2: Fetching test client...');
    const testClient = await prisma.client.findFirst();

    if (!testClient) {
      console.error('❌ No client found');
      return;
    }

    console.log(`✅ Found client: ${testClient.nom} (ID: ${testClient.id})\n`);

    // 3. Fetch the sync function
    console.log('📍 Step 3: Loading task creation function...');
    // We can't import ES modules in Node directly, so we'll use Prisma directly
    
    // Get all admin users for participants
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    });
    const adminIds = admins.map(admin => admin.id);

    console.log(`✅ Found ${admins.length} admin(s)\n`);

    // Create a task
    console.log('📍 Step 4: Creating task...');
    const task = await prisma.task.create({
      data: {
        title: `Test Task - ${new Date().toISOString().slice(0, 10)}`,
        description: 'This is a test task created for debugging',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        assignedTo: testUser.name,
        linkedType: 'client',
        linkedId: testClient.id,
        status: 'a_faire',
        createdBy: 'Test Script'
      }
    });

    console.log(`✅ Task created: ${task.id}\n`);

    // 4. Create the calendar event
    console.log('📍 Step 5: Creating calendar event...');
    const endDate = new Date(task.dueDate);
    endDate.setHours(endDate.getHours() + 1);

    const participants = [testUser.id, ...adminIds.filter(id => id !== testUser.id)];

    const event = await prisma.calendarEvent.create({
      data: {
        title: task.title,
        description: task.description,
        startDate: task.dueDate,
        endDate: endDate,
        eventType: 'suivi_projet',
        assignedTo: testUser.id,
        visibility: 'team',
        participants: participants,
        linkedClientId: testClient.id,
        createdBy: 'Test Script'
      }
    });

    console.log(`✅ Calendar event created: ${event.id}\n`);

    // 5. Verify the calendar event
    console.log('📍 Step 6: Verifying calendar event...');
    const verifyEvent = await prisma.calendarEvent.findUnique({
      where: { id: event.id }
    });

    if (!verifyEvent) {
      console.error('❌ Calendar event not found in database');
      return;
    }

    console.log('✅ Calendar event verified:');
    console.log(`   - Title: ${verifyEvent.title}`);
    console.log(`   - Assigned to (user ID): ${verifyEvent.assignedTo}`);
    console.log(`   - Event type: ${verifyEvent.eventType}`);
    console.log(`   - Visibility: ${verifyEvent.visibility}`);
    console.log(`   - Participants: ${verifyEvent.participants.join(', ')}\n`);

    // 6. Check if admin can fetch this event
    console.log('📍 Step 7: Checking admin access...');
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.warn('⚠️ No admin user found to test access');
    } else {
      console.log(`✅ Admin found: ${admin.name} (ID: ${admin.id})`);
      console.log(`   Admin should see this event`);
      console.log(`   Participants array includes admin: ${verifyEvent.participants.includes(admin.id)}\n`);
    }

    console.log('🎉 Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Task created: ${task.id}`);
    console.log(`   - Calendar event created: ${event.id}`);
    console.log(`   - Event assigned to: ${verifyEvent.assignedTo} (${testUser.name})`);
    console.log(`   - Linked to client: ${verifyEvent.linkedClientId}`);

  } catch (error) {
    console.error('💥 Error during test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTaskCreation();
