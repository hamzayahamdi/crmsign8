import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a reminder for an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, userId, reminderType } = body;

    if (!eventId || !userId || !reminderType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get event details to calculate reminder time
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: { startDate: true }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Calculate reminder time based on type
    const reminderMinutes = getReminderMinutes(reminderType);
    const reminderTime = new Date(event.startDate.getTime() - reminderMinutes * 60 * 1000);

    // Create reminder using raw SQL
    await prisma.$executeRaw`
      INSERT INTO event_reminders (id, event_id, user_id, reminder_time, reminder_type, notification_sent, created_at, updated_at)
      VALUES (gen_random_uuid(), ${eventId}, ${userId}, ${reminderTime}, ${reminderType}, false, NOW(), NOW())
      ON CONFLICT (event_id, user_id) 
      DO UPDATE SET 
        reminder_time = ${reminderTime},
        reminder_type = ${reminderType},
        notification_sent = false,
        updated_at = NOW()
    `;

    return NextResponse.json({ 
      success: true,
      reminderTime: reminderTime.toISOString()
    });
  } catch (error) {
    console.error('[API] Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

// Get reminders for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    let query = `
      SELECT * FROM event_reminders
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (eventId) {
      query += ` AND event_id = $2`;
      params.push(eventId);
    }

    query += ` ORDER BY reminder_time ASC`;

    const reminders = await prisma.$queryRawUnsafe(query, ...params);

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('[API] Error getting reminders:', error);
    return NextResponse.json(
      { error: 'Failed to get reminders' },
      { status: 500 }
    );
  }
}

// Delete a reminder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');

    if (reminderId) {
      await prisma.$executeRaw`
        DELETE FROM event_reminders WHERE id = ${reminderId}
      `;
    } else if (eventId && userId) {
      await prisma.$executeRaw`
        DELETE FROM event_reminders WHERE event_id = ${eventId} AND user_id = ${userId}
      `;
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}

function getReminderMinutes(reminderType: string): number {
  switch (reminderType) {
    case 'min_5':
      return 5;
    case 'min_30':
      return 30;
    case 'hour_1':
      return 60;
    case 'day_1':
      return 1440;
    default:
      return 0;
  }
}
