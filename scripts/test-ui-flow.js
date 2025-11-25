const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUIFlow() {
  console.log('🔍 SIMULATING UI TASK CREATION FLOW\n');
  console.log('============================================================\n');

  try {
    // Step 1: Get architect user
    console.log('📍 Step 1: Getting test architect user...');
    const architect = await prisma.user.findFirst({
      where: { role: 'architect' }
    });
    if (!architect) {
      console.error('❌ No architect found');
      return;
    }
    console.log(`✅ Found: ${architect.name} (ID: ${architect.id})`);
    const architectId = architect.id;
    const architectName = architect.name;

    // Step 2: Get client
    console.log('\n📍 Step 2: Getting test client...');
    const client = await prisma.client.findFirst();
    if (!client) {
      console.error('❌ No client found');
      return;
    }
    console.log(`✅ Found: ${client.nom} (ID: ${client.id})`);

    // Step 3: Get current user (who's creating the task)
    console.log('\n📍 Step 3: Getting admin user (task creator)...');
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    if (!admin) {
      console.error('❌ No admin found');
      return;
    }
    console.log(`✅ Found: ${admin.name} (ID: ${admin.id})`);
    const creatorId = admin.id;
    const creatorName = admin.name;

    // Step 4: Simulate UI form submission
    console.log('\n📍 Step 4: Simulating UI form submission...');
    console.log(`   Form data: {`);
    console.log(`     title: "TEST-${Date.now()}",`);
    console.log(`     assignedTo: "${architectName}" (IMPORTANT: NAME, NOT ID!),`);
    console.log(`     dueDate: "${new Date(Date.now() + 86400000).toISOString()}",`);
    console.log(`     createdBy: "${creatorName}" (IMPORTANT: NAME, NOT ID!),`);
    console.log(`   }`);

    // Step 5: Create task via API simulation
    console.log('\n📍 Step 5: Creating task...');
    const dueDate = new Date(Date.now() + 86400000);
    const taskTitle = `TEST-${Date.now()}`;
    
    const task = await prisma.task.create({
      data: {
        title: taskTitle,
        description: 'Test task from UI flow',
        dueDate: dueDate,
        assignedTo: architectName, // ← NAME STORED IN DB
        linkedType: 'client',
        linkedId: client.id,
        linkedName: client.nom,
        status: 'a_faire',
        createdBy: creatorName, // ← NAME STORED IN DB
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    console.log(`✅ Task created: ${task.id}`);
    console.log(`   Task.assignedTo: ${task.assignedTo} (TYPE: string - USER NAME)`);
    console.log(`   Task.createdBy: ${task.createdBy} (TYPE: string - USER NAME)`);

    // Step 6: Create calendar event (as backend does)
    console.log('\n📍 Step 6: Backend creates calendar event automatically...');
    const endDate = new Date(dueDate);
    endDate.setHours(endDate.getHours() + 1);

    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    const adminIds = admins.map(a => a.id);

    const event = await prisma.calendarEvent.create({
      data: {
        title: task.title,
        description: task.description,
        startDate: dueDate,
        endDate: endDate,
        eventType: 'suivi_projet',
        assignedTo: architectId, // ← CORRECTLY STORES USER ID
        visibility: 'team',
        participants: [architectId, ...adminIds],
        linkedClientId: client.id,
        createdBy: creatorId // ← CORRECTLY STORES USER ID
      }
    });
    console.log(`✅ Calendar event created: ${event.id}`);
    console.log(`   Event.assignedTo: ${event.assignedTo} (TYPE: UUID - USER ID)`);
    console.log(`   Event.createdBy: ${event.createdBy} (TYPE: UUID - USER ID)`);
    console.log(`   Event.participants: [${event.participants.join(', ')}]`);

    // Step 7: Fetch event as calendar page would
    console.log('\n📍 Step 7: Fetching event as calendar page does (for creator)...');
    const eventWithEnrich = await prisma.calendarEvent.findUnique({
      where: { id: event.id }
    });

    if (!eventWithEnrich) {
      console.error('❌ Event not found!');
      return;
    }

    // Now check permissions
    console.log('   Event data from DB:');
    console.log(`     - createdBy: ${eventWithEnrich.createdBy}`);
    console.log(`     - assignedTo: ${eventWithEnrich.assignedTo}`);
    console.log(`     - visibility: ${eventWithEnrich.visibility}`);
    console.log(`\n   Creator ID: ${creatorId}`);
    console.log(`   Does creator ID match createdBy? ${eventWithEnrich.createdBy === creatorId ? '✅ YES' : '❌ NO'}`);
    console.log(`\n   Creator can see event? ${eventWithEnrich.visibility === 'team' || eventWithEnrich.createdBy === creatorId || eventWithEnrich.participants.includes(creatorId) ? '✅ YES' : '❌ NO'}`);

    // Step 8: Check architect's view
    console.log('\n📍 Step 8: Checking architect view...');
    console.log(`   Architect ID: ${architectId}`);
    console.log(`   Does architect ID match assignedTo? ${eventWithEnrich.assignedTo === architectId ? '✅ YES' : '❌ NO'}`);
    console.log(`   Is architect in participants? ${eventWithEnrich.participants.includes(architectId) ? '✅ YES' : '❌ NO'}`);
    console.log(`   Architect can see event? ${eventWithEnrich.visibility === 'team' || eventWithEnrich.assignedTo === architectId || eventWithEnrich.participants.includes(architectId) ? '✅ YES' : '❌ NO'}`);

    // Step 9: Verify via API call (like calendar page does)
    console.log('\n📍 Step 9: Query like calendar API would (date range)...');
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const eventsInRange = await prisma.calendarEvent.findMany({
      where: {
        startDate: { gte: now, lte: oneMonthLater }
      }
    });

    console.log(`✅ Found ${eventsInRange.length} event(s) in date range`);
    const foundOurEvent = eventsInRange.find(e => e.id === event.id);
    console.log(`   Our event in range? ${foundOurEvent ? '✅ YES' : '❌ NO'}`);

    console.log('\n============================================================');
    console.log('📝 SUMMARY\n');
    console.log(`Task ID: ${task.id}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`Creator: ${creatorName} (ID: ${creatorId})`);
    console.log(`Assignee: ${architectName} (ID: ${architectId})`);
    console.log(`\n✅ All steps completed successfully!`);
    console.log(`\nIf event still doesn't appear in UI:`);
    console.log(`1. Check browser console for JavaScript errors`);
    console.log(`2. Check if currentUserId is being set correctly in store`);
    console.log(`3. Check if permission checks in calendar-store.ts are working`);
    console.log(`4. Verify event.createdBy === currentUserId comparison`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUIFlow();
