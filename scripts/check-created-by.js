const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCreatedByValues() {
  const events = await prisma.calendarEvent.findMany({
    select: { title: true, createdBy: true },
    take: 10
  });

  console.log('Sample calendar_events createdBy values:');
  events.forEach(e => {
    console.log(`  - ${e.title}: "${e.createdBy}" (length: ${e.createdBy.length}, looks like UUID: ${/^[a-z0-9]{24}$/i.test(e.createdBy)})`);
  });

  await prisma.$disconnect();
}

checkCreatedByValues();
