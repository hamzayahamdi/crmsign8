import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendReminderEmail, sendNotificationEmail } from '@/lib/resend-service';

/**
 * API Route to send emails via Resend
 * 
 * POST /api/notifications/send-email
 * Body: {
 *   type: 'reminder' | 'notification',
 *   to: string | string[],
 *   ... (type-specific fields)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: type and to' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'reminder') {
      const { event, reminderMinutes } = body;
      
      if (!event || reminderMinutes === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields for reminder: event and reminderMinutes' },
          { status: 400 }
        );
      }

      // Handle multiple recipients
      const recipients = Array.isArray(to) ? to : [to];
      const results = await Promise.all(
        recipients.map(recipient => sendReminderEmail(recipient, event, reminderMinutes))
      );

      const allSuccess = results.every(r => r.success);
      const firstError = results.find(r => !r.success)?.error;

      result = {
        success: allSuccess,
        messageIds: results.map(r => r.messageId).filter(Boolean),
        error: allSuccess ? undefined : firstError,
      };
    } else if (type === 'notification') {
      const { notification } = body;
      
      if (!notification) {
        return NextResponse.json(
          { error: 'Missing required field: notification' },
          { status: 400 }
        );
      }

      result = await sendNotificationEmail(to, notification);
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "reminder" or "notification"' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      messageIds: (result as any).messageIds,
    });
  } catch (error: any) {
    console.error('[API] Error sending email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}



