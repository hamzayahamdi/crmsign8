const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLatestEvents() {
  try {
    const latestEvents = await prisma.calendarEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Latest 5 calendar events:\n');
    latestEvents.forEach((event, idx) => {
      console.log(`${idx + 1}. ${event.title}`);
      console.log(`   Created by: "${event.createdBy}"`);
      console.log(`   Type: ${typeof event.createdBy}`);
      console.log(`   Is UUID? ${/^[a-z0-9]{24}$/i.test(event.createdBy)}`);
      console.log(`   Looks like user name? ${event.createdBy.includes(' ') || event.createdBy === 'Système' || event.createdBy === 'Test Script'}`);
      console.log();
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestEvents();
