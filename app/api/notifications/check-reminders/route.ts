import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendReminderEmail } from '@/lib/resend-service';
import { differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Check and send reminder emails for upcoming events
 * 
 * This endpoint should be called periodically (e.g., via cron job)
 * to check for reminders that need to be sent
 * 
 * GET /api/notifications/check-reminders
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute window

    // Find reminders that need to be sent
    // - reminder_time is within the next 5 minutes
    // - notification_sent is false
    const reminders = await prisma.$queryRaw<Array<{
      id: string;
      event_id: string;
      user_id: string;
      reminder_time: Date;
      reminder_type: string;
    }>>`
      SELECT id, event_id, user_id, reminder_time, reminder_type
      FROM event_reminders
      WHERE reminder_time >= ${now}
        AND reminder_time <= ${fiveMinutesFromNow}
        AND notification_sent = false
      ORDER BY reminder_time ASC
    `;

    if (reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        sent: 0,
      });
    }

    console.log(`[Reminders] Found ${reminders.length} reminder(s) to send`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        // Get user preferences
        const userPrefs = await prisma.$queryRaw<Array<{
          email_enabled: boolean;
        }>>`
          SELECT email_enabled
          FROM notification_preferences
          WHERE user_id = ${reminder.user_id}
          LIMIT 1
        `;

        const emailEnabled = userPrefs.length > 0 ? userPrefs[0].email_enabled : true;

        if (!emailEnabled) {
          console.log(`[Reminders] Email disabled for user ${reminder.user_id}, skipping`);
          // Mark as sent anyway to avoid retrying
          await prisma.$executeRaw`
            UPDATE event_reminders
            SET notification_sent = true, updated_at = NOW()
            WHERE id = ${reminder.id}
          `;
          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            eventId: reminder.event_id,
            status: 'skipped',
            reason: 'Email notifications disabled',
          });
          continue;
        }

        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: reminder.user_id },
          select: { email: true, name: true },
        });

        if (!user?.email) {
          console.warn(`[Reminders] No email found for user ${reminder.user_id}`);
          // Mark as sent to avoid retrying
          await prisma.$executeRaw`
            UPDATE event_reminders
            SET notification_sent = true, updated_at = NOW()
            WHERE id = ${reminder.id}
          `;
          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            eventId: reminder.event_id,
            status: 'skipped',
            reason: 'No email address',
          });
          continue;
        }

        // Get event details
        const event = await prisma.calendarEvent.findUnique({
          where: { id: reminder.event_id },
          select: {
            title: true,
            startDate: true,
            location: true,
            description: true,
          },
        });

        if (!event) {
          console.warn(`[Reminders] Event ${reminder.event_id} not found`);
          // Mark as sent to avoid retrying
          await prisma.$executeRaw`
            UPDATE event_reminders
            SET notification_sent = true, updated_at = NOW()
            WHERE id = ${reminder.id}
          `;
          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            eventId: reminder.event_id,
            status: 'skipped',
            reason: 'Event not found',
          });
          continue;
        }

        // Calculate reminder minutes
        const eventStart = new Date(event.startDate);
        const reminderTime = new Date(reminder.reminder_time);
        const reminderMinutes = Math.max(0, differenceInMinutes(eventStart, reminderTime));

        // Send email
        const emailResult = await sendReminderEmail(
          user.email,
          {
            title: event.title,
            startDate: event.startDate,
            location: event.location,
            description: event.description,
          },
          reminderMinutes
        );

        if (emailResult.success) {
          // Mark reminder as sent
          await prisma.$executeRaw`
            UPDATE event_reminders
            SET notification_sent = true, notification_method = 'email', updated_at = NOW()
            WHERE id = ${reminder.id}
          `;

          successCount++;
          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            eventId: reminder.event_id,
            status: 'sent',
            messageId: emailResult.messageId,
          });

          console.log(`[Reminders] ✅ Sent reminder email to ${user.email} for event "${event.title}"`);
        } else {
          errorCount++;
          results.push({
            reminderId: reminder.id,
            userId: reminder.user_id,
            eventId: reminder.event_id,
            status: 'error',
            error: emailResult.error,
          });

          console.error(`[Reminders] ❌ Failed to send reminder email: ${emailResult.error}`);
        }
      } catch (error: any) {
        errorCount++;
        results.push({
          reminderId: reminder.id,
          userId: reminder.user_id,
          eventId: reminder.event_id,
          status: 'error',
          error: error?.message || 'Unknown error',
        });

        console.error(`[Reminders] ❌ Error processing reminder ${reminder.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      errors: errorCount,
      total: reminders.length,
      results,
    });
  } catch (error: any) {
    console.error('[API] Error checking reminders:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check reminders' },
      { status: 500 }
    );
  }
}

