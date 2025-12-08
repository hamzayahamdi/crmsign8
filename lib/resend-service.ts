/**
 * Resend Email Service
 * 
 * Handles email notifications via Resend API
 * 
 * Setup Instructions:
 * 1. Sign up for Resend: https://resend.com
 * 2. Get your API Key from dashboard
 * 3. Add to your .env file:
 *    RESEND_API_KEY=re_xxxxxxxxxxxxx
 *    RESEND_FROM_EMAIL=noreply@yourdomain.com (or use Resend's default)
 */

import { Resend } from 'resend';

// Resend client singleton
let resendClient: Resend | null = null;

/**
 * Get or create Resend client
 */
function getResendClient(): Resend | null {
  if (typeof window !== 'undefined') {
    console.warn('[Resend] Email service is server-side only');
    return null;
  }

  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn('[Resend] Missing RESEND_API_KEY. Email notifications disabled.');
    console.warn('[Resend] Add RESEND_API_KEY to .env file');
    return null;
  }

  try {
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (error) {
    console.error('[Resend] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!getResendClient();
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getResendClient();
    
    if (!client) {
      return {
        success: false,
        error: 'Resend not configured. Add RESEND_API_KEY to .env file.',
      };
    }

    const fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    // Ensure 'to' is an array
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    console.log(`[Resend] Sending email to ${recipients.join(', ')} from ${fromEmail}`);

    const result = await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: options.replyTo,
    });

    if (result.error) {
      console.error('[Resend] Error sending email:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    console.log(`[Resend] Email sent successfully. Message ID: ${result.data?.id}`);
    
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error: any) {
    console.error('[Resend] Error sending email:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
    };
  }
}

/**
 * Send a reminder email for a calendar event
 */
export async function sendReminderEmail(
  to: string,
  event: {
    title: string;
    startDate: Date | string;
    location?: string | null;
    description?: string | null;
  },
  reminderMinutes: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const eventDate = new Date(event.startDate);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let timeText = '';
  if (reminderMinutes < 60) {
    timeText = `dans ${reminderMinutes} minutes`;
  } else if (reminderMinutes < 1440) {
    const hours = Math.floor(reminderMinutes / 60);
    timeText = `dans ${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(reminderMinutes / 1440);
    timeText = `dans ${days} jour${days > 1 ? 's' : ''}`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rappel d'événement</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Rappel d'événement</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">${event.title}</h2>
          <p style="color: #6b7280; font-size: 16px; margin: 10px 0;">
            <strong>⏰ Date et heure:</strong> ${formattedDate}
          </p>
          ${event.location ? `
            <p style="color: #6b7280; font-size: 16px; margin: 10px 0;">
              <strong>📍 Lieu:</strong> ${event.location}
            </p>
          ` : ''}
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af; font-size: 16px;">
              <strong>⏳ Cet événement est prévu ${timeText}</strong>
            </p>
          </div>
          ${event.description ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #4b5563; font-size: 14px; white-space: pre-wrap;">${event.description}</p>
            </div>
          ` : ''}
        </div>
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>Ceci est un rappel automatique de Signature8 CRM</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `🔔 Rappel : ${event.title} ${timeText}`,
    html,
  });
}

/**
 * Send a notification email (for general notifications)
 */
export async function sendNotificationEmail(
  to: string,
  notification: {
    title: string;
    message: string;
    type?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${notification.title}</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #4b5563; font-size: 16px; white-space: pre-wrap;">${notification.message}</p>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>Signature8 CRM</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: notification.title,
    html,
  });
}

