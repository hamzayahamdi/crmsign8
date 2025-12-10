/**
 * Test script to manually trigger reminder checking
 * 
 * Usage:
 *   npx tsx scripts/test-reminder-cron.ts
 * 
 * This simulates what the cron job does
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testReminderCheck() {
  console.log('🔍 Testing Reminder Check System...\n');

  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Checking reminders between: ${oneHourAgo.toISOString()} and ${fiveMinutesFromNow.toISOString()}\n`);

    // Check for pending reminders
    const reminders = await prisma.$queryRaw<Array<{
      id: string;
      event_id: string;
      user_id: string;
      reminder_time: Date;
      reminder_type: string;
      notification_sent: boolean;
    }>>`
      SELECT id, event_id, user_id, reminder_time, reminder_type, notification_sent
      FROM event_reminders
      WHERE reminder_time >= ${oneHourAgo}
        AND reminder_time <= ${fiveMinutesFromNow}
        AND notification_sent = false
      ORDER BY reminder_time ASC
    `;

    if (reminders.length === 0) {
      console.log('✅ No reminders to send at this time');
      
      // Show upcoming reminders
      const upcoming = await prisma.$queryRaw<Array<{
        id: string;
        event_id: string;
        reminder_time: Date;
        notification_sent: boolean;
      }>>`
        SELECT id, event_id, reminder_time, notification_sent
        FROM event_reminders
        WHERE reminder_time > ${now}
          AND notification_sent = false
        ORDER BY reminder_time ASC
        LIMIT 5
      `;

      if (upcoming.length > 0) {
        console.log('\n📅 Upcoming reminders:');
        upcoming.forEach((r, i) => {
          const timeUntil = Math.round((r.reminder_time.getTime() - now.getTime()) / (1000 * 60));
          console.log(`   ${i + 1}. In ${timeUntil} minutes (${r.reminder_time.toISOString()})`);
        });
      }
    } else {
      console.log(`🔔 Found ${reminders.length} reminder(s) ready to send:\n`);
      reminders.forEach((r, i) => {
        const timeDiff = Math.round((now.getTime() - r.reminder_time.getTime()) / (1000 * 60));
        console.log(`   ${i + 1}. Reminder ID: ${r.id}`);
        console.log(`      Event ID: ${r.event_id}`);
        console.log(`      User ID: ${r.user_id}`);
        console.log(`      Reminder time: ${r.reminder_time.toISOString()}`);
        console.log(`      Time difference: ${timeDiff} minutes ${timeDiff > 0 ? '(past)' : '(future)'}`);
        console.log('');
      });

      console.log('💡 To send these reminders, call:');
      console.log('   curl https://your-domain.com/api/notifications/check-reminders');
      console.log('   or trigger the cron job manually\n');
    }

    // Show statistics
    const stats = await prisma.$queryRaw<Array<{
      total: bigint;
      pending: bigint;
      sent: bigint;
    }>>`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN notification_sent = false THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN notification_sent = true THEN 1 ELSE 0 END) as sent
      FROM event_reminders
    `;

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('📊 Reminder Statistics:');
      console.log(`   Total reminders: ${stat.total}`);
      console.log(`   Pending: ${stat.pending}`);
      console.log(`   Sent: ${stat.sent}`);
    }

  } catch (error: any) {
    console.error('❌ Error checking reminders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReminderCheck();

