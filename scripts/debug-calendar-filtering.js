const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCalendarFiltering() {
  console.log('🔍 DEBUGGING CALENDAR FILTERING\n');
  console.log('============================================================\n');

  try {
    // Get an admin user (who can see all events)
    console.log('📍 Step 1: Getting admin user...');
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    if (!admin) {
      console.error('❌ No admin found');
      return;
    }
    console.log(`✅ Admin: ${admin.name} (ID: ${admin.id})`);
    const adminId = admin.id;

    // Get an architect user
    console.log('\n📍 Step 2: Getting architect user...');
    const architect = await prisma.user.findFirst({
      where: { role: 'architect' }
    });
    if (!architect) {
      console.error('❌ No architect found');
      return;
    }
    console.log(`✅ Architect: ${architect.name} (ID: ${architect.id})`);
    const architectId = architect.id;

    // Query ALL events in the database
    console.log('\n📍 Step 3: Fetching ALL events from database...');
    const allEvents = await prisma.calendarEvent.findMany();
    console.log(`✅ Total events in DB: ${allEvents.length}`);

    if (allEvents.length === 0) {
      console.warn('⚠️  No events in database');
      return;
    }

    // Show event details
    console.log('\n📍 Step 4: Analyzing each event for permissions...\n');
    
    let adminCanSee = 0;
    let architectCanSee = 0;

    allEvents.forEach((event, idx) => {
      const eventNum = idx + 1;
      console.log(`Event ${eventNum}: ${event.title}`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Type: ${event.eventType}`);
      console.log(`  Visibility: ${event.visibility}`);
      console.log(`  Created by: ${event.createdBy}`);
      console.log(`  Assigned to: ${event.assignedTo}`);
      console.log(`  Participants: [${event.participants.join(', ')}]`);
      
      // Check admin permissions
      const adminCanSeeEvent = 
        event.visibility === 'all' ||
        event.createdBy === adminId ||
        event.assignedTo === adminId ||
        event.participants.includes(adminId);
      
      console.log(`  Admin (${adminId}) can see: ${adminCanSeeEvent ? '✅ YES' : '❌ NO'}`);
      if (adminCanSeeEvent) adminCanSee++;
      
      // Check architect permissions
      const architectCanSeeEvent =
        event.visibility === 'all' ||
        event.createdBy === architectId ||
        event.assignedTo === architectId ||
        event.participants.includes(architectId);
      
      console.log(`  Architect (${architectId}) can see: ${architectCanSeeEvent ? '✅ YES' : '❌ NO'}`);
      if (architectCanSeeEvent) architectCanSee++;
      
      console.log();
    });

    console.log('============================================================');
    console.log('📝 SUMMARY\n');
    console.log(`Total events: ${allEvents.length}`);
    console.log(`Admin can see: ${adminCanSee}/${allEvents.length}`);
    console.log(`Architect can see: ${architectCanSee}/${allEvents.length}`);
    
    if (adminCanSee === 0) {
      console.error('\n❌ PROBLEM: Admin cannot see ANY events!');
      console.error('   This means the store permission check is blocking all events.');
    }

    // Check if there are 'suivi_projet' type events specifically
    console.log('\n📍 Checking for task-related events (type: suivi_projet)...');
    const taskEvents = allEvents.filter(e => e.eventType === 'suivi_projet');
    console.log(`Found ${taskEvents.length} suivi_projet event(s)`);
    
    if (taskEvents.length > 0) {
      console.log('\nRecent suivi_projet events:');
      taskEvents.slice(-3).forEach((event) => {
        console.log(`  - ${event.title} (created by: ${event.createdBy}, assigned to: ${event.assignedTo})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalendarFiltering();
