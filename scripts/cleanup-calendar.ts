/**
 * Standalone script to clean up orphaned calendar events
 * Removes calendar events that were created for tasks that no longer exist
 * 
 * Usage: npx tsx scripts/cleanup-calendar.ts
 * Or: node --loader ts-node/esm scripts/cleanup-calendar.ts
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function cleanupOrphanedCalendarEvents() {
  try {
    console.log('🧹 Starting cleanup of orphaned calendar events...\n');

    // Get all tasks
    const allTasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignedTo: true,
        createdAt: true,
      },
    });

    console.log(`📋 Found ${allTasks.length} existing tasks`);

    // Get all calendar events of type 'suivi_projet' (created from tasks)
    const taskEvents = await prisma.calendarEvent.findMany({
      where: {
        eventType: 'suivi_projet',
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        assignedTo: true,
        createdAt: true,
      },
    });

    console.log(`📅 Found ${taskEvents.length} calendar events of type 'suivi_projet'\n`);

    // Get all users to map names to IDs
    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.name, u.id]));
    const userIdToNameMap = new Map(users.map((u) => [u.id, u.name]));

    const orphanedEvents: string[] = [];

    // Check each calendar event to see if it has a matching task
    for (const event of taskEvents) {
      let hasMatchingTask = false;

      // Get the user name from the assignedTo ID
      const assignedUserName = userIdToNameMap.get(event.assignedTo);

      if (assignedUserName) {
        // Find tasks that match this event
        const matchingTasks = allTasks.filter((task) => {
          // Check if title matches (exact match)
          if (task.title !== event.title) {
            return false;
          }

          // Check if assignedTo matches
          if (task.assignedTo !== assignedUserName) {
            return false;
          }

          // Check if dates match (within 1 hour tolerance)
          const taskStartDate = new Date(task.dueDate);
          const taskEndDate = new Date(task.dueDate);
          taskEndDate.setHours(taskEndDate.getHours() + 1);

          if (
            event.startDate < taskStartDate ||
            event.startDate > taskEndDate
          ) {
            return false;
          }

          // Check if created around the same time (within 5 minutes)
          const taskCreatedStart = new Date(task.createdAt);
          taskCreatedStart.setMinutes(taskCreatedStart.getMinutes() - 5);
          const taskCreatedEnd = new Date(task.createdAt);
          taskCreatedEnd.setMinutes(taskCreatedEnd.getMinutes() + 5);

          if (
            event.createdAt < taskCreatedStart ||
            event.createdAt > taskCreatedEnd
          ) {
            return false;
          }

          return true;
        });

        if (matchingTasks.length > 0) {
          hasMatchingTask = true;
        }
      }

      if (!hasMatchingTask) {
        orphanedEvents.push(event.id);
        console.log(`  ⚠️  Orphaned event found: "${event.title}" (ID: ${event.id})`);
      }
    }

    console.log(`\n🔍 Found ${orphanedEvents.length} orphaned calendar events\n`);

    if (orphanedEvents.length === 0) {
      console.log('✅ No orphaned events found. Calendar is clean!');
      return;
    }

    // Delete event reminders first
    console.log('🗑️  Deleting associated event reminders...');
    const deletedReminders = await prisma.eventReminder.deleteMany({
      where: {
        eventId: { in: orphanedEvents },
      },
    });
    console.log(`   Deleted ${deletedReminders.count} reminder(s)\n`);

    // Delete the orphaned calendar events
    console.log('🗑️  Deleting orphaned calendar events...');
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        id: { in: orphanedEvents },
      },
    });

    console.log(`\n✅ Successfully deleted ${deleteResult.count} orphaned calendar event(s)`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total tasks: ${allTasks.length}`);
    console.log(`   - Total task events: ${taskEvents.length}`);
    console.log(`   - Orphaned events removed: ${deleteResult.count}`);
    console.log(`   - Remaining valid events: ${taskEvents.length - deleteResult.count}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupOrphanedCalendarEvents()
  .then(() => {
    console.log('\n✨ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });

