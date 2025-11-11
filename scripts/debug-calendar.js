const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCalendar() {
  try {
    console.log('=== DEBUGGING CALENDAR ===\n');
    
    // Get all events
    const allEvents = await prisma.calendarEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Total events in database: ${allEvents.length}\n`);
    
    if (allEvents.length > 0) {
      console.log('Recent events:');
      allEvents.forEach((event, idx) => {
        console.log(`\n${idx + 1}. ${event.title}`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Start: ${event.startDate}`);
        console.log(`   End: ${event.endDate}`);
        console.log(`   Type: ${event.eventType}`);
        console.log(`   Assigned To: ${event.assignedTo}`);
        console.log(`   Created By: ${event.createdBy}`);
        console.log(`   Visibility: ${event.visibility}`);
        console.log(`   Participants: ${JSON.stringify(event.participants)}`);
        console.log(`   Created At: ${event.createdAt}`);
      });
    } else {
      console.log('No events found in database!');
    }
    
    // Get all users
    console.log('\n\n=== USERS ===\n');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log(`Total users: ${users.length}\n`);
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCalendar();
