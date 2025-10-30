// Supabase Edge Function - Check Reminders
// This function runs every 5 minutes via Supabase Scheduled Tasks

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface EventReminder {
  id: string;
  event_id: string;
  user_id: string;
  reminder_time: string;
  reminder_type: string;
  notification_sent: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  location: string | null;
}

interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  push_subscription: any;
}

interface User {
  id: string;
  email: string;
  name: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time and 5 minutes window
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    console.log('[CheckReminders] Checking reminders between', now.toISOString(), 'and', fiveMinutesLater.toISOString());

    // Find reminders that need to be sent in the next 5 minutes
    const { data: reminders, error: remindersError } = await supabase
      .from('event_reminders')
      .select('*')
      .gte('reminder_time', now.toISOString())
      .lte('reminder_time', fiveMinutesLater.toISOString())
      .eq('notification_sent', false);

    if (remindersError) {
      console.error('[CheckReminders] Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`[CheckReminders] Found ${reminders?.length || 0} reminders to process`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to process', count: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Process each reminder
    const results = await Promise.allSettled(
      reminders.map(async (reminder: EventReminder) => {
        try {
          // Get event details
          const { data: event, error: eventError } = await supabase
            .from('calendar_events')
            .select('id, title, description, start_date, location')
            .eq('id', reminder.event_id)
            .single();

          if (eventError || !event) {
            console.error('[CheckReminders] Event not found:', reminder.event_id);
            return;
          }

          // Get user details
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', reminder.user_id)
            .single();

          if (userError || !user) {
            console.error('[CheckReminders] User not found:', reminder.user_id);
            return;
          }

          // Get notification preferences
          const { data: preferences, error: prefsError } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', reminder.user_id)
            .single();

          if (prefsError) {
            console.log('[CheckReminders] No preferences found for user, using defaults');
          }

          const prefs = preferences as NotificationPreferences | null;

          // Send notifications based on preferences
          let notificationMethod = '';

          // Try push notification first if enabled
          if (prefs?.push_enabled && prefs?.push_subscription) {
            try {
              await sendPushNotification(
                prefs.push_subscription,
                event as CalendarEvent,
                reminder.reminder_type
              );
              notificationMethod = 'push';
              console.log('[CheckReminders] Push notification sent for event:', event.id);
            } catch (pushError) {
              console.error('[CheckReminders] Failed to send push notification:', pushError);
              // Fall back to email if push fails
              if (prefs?.email_enabled) {
                await sendEmailNotification(user as User, event as CalendarEvent, reminder.reminder_type);
                notificationMethod = 'email';
              }
            }
          } 
          // Send email if push is not enabled but email is
          else if (prefs?.email_enabled || !prefs) {
            await sendEmailNotification(user as User, event as CalendarEvent, reminder.reminder_type);
            notificationMethod = 'email';
            console.log('[CheckReminders] Email notification sent for event:', event.id);
          }

          // Mark reminder as sent
          const { error: updateError } = await supabase
            .from('event_reminders')
            .update({
              notification_sent: true,
              notification_method: notificationMethod,
              updated_at: new Date().toISOString()
            })
            .eq('id', reminder.id);

          if (updateError) {
            console.error('[CheckReminders] Error updating reminder:', updateError);
          }

          return { success: true, eventId: event.id, method: notificationMethod };
        } catch (error) {
          console.error('[CheckReminders] Error processing reminder:', error);
          return { success: false, error };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;

    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        total: reminders.length,
        successful: successCount,
        failed: reminders.length - successCount
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[CheckReminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendPushNotification(
  subscription: any,
  event: CalendarEvent,
  reminderType: string
): Promise<void> {
  // Use Web Push API to send notification
  // This requires VAPID keys configured in Supabase
  const webpush = await import('https://esm.sh/web-push@3.6.3');
  
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@signature8.com';

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: `🔔 Rappel : ${event.title}`,
    body: `Événement prévu ${formatReminderTime(reminderType)}${event.location ? `\n📍 ${event.location}` : ''}`,
    icon: '/favicon-32x32.png',
    badge: '/favicon-32x32.png',
    tag: event.id,
    url: '/calendrier',
    data: {
      eventId: event.id,
      url: '/calendrier'
    }
  });

  await webpush.sendNotification(subscription, payload);
}

async function sendEmailNotification(
  user: User,
  event: CalendarEvent,
  reminderType: string
): Promise<void> {
  // Use Resend API to send email
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';

  if (!resendApiKey) {
    console.warn('[CheckReminders] Resend API key not configured, skipping email');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Signature8 <notifications@signature8.com>',
      to: [user.email],
      subject: `🔔 Rappel : ${event.title}`,
      html: generateEmailTemplate(user, event, reminderType)
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

function formatReminderTime(reminderType: string): string {
  switch (reminderType) {
    case 'min_5':
      return 'dans 5 minutes';
    case 'min_30':
      return 'dans 30 minutes';
    case 'hour_1':
      return 'dans 1 heure';
    case 'day_1':
      return 'dans 1 jour';
    default:
      return 'bientôt';
  }
}

function generateEmailTemplate(user: User, event: CalendarEvent, reminderType: string): string {
  const eventDate = new Date(event.start_date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
        .event-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .event-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #1a1a1a; }
        .event-detail { margin: 8px 0; color: #666; }
        .icon { display: inline-block; width: 20px; margin-right: 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Rappel d'événement</h1>
          <p>Événement prévu ${formatReminderTime(reminderType)}</p>
        </div>
        <div class="content">
          <p>Bonjour ${user.name},</p>
          <p>Ceci est un rappel pour votre événement à venir :</p>
          
          <div class="event-card">
            <div class="event-title">${event.title}</div>
            ${event.description ? `<p>${event.description}</p>` : ''}
            <div class="event-detail">
              <span class="icon">📅</span>
              <strong>Date :</strong> ${formattedDate}
            </div>
            <div class="event-detail">
              <span class="icon">🕐</span>
              <strong>Heure :</strong> ${formattedTime}
            </div>
            ${event.location ? `
            <div class="event-detail">
              <span class="icon">📍</span>
              <strong>Lieu :</strong> ${event.location}
            </div>
            ` : ''}
          </div>

          <center>
            <a href="https://signature8.com/calendrier" class="button">Voir le calendrier</a>
          </center>

          <div class="footer">
            <p>Vous recevez cet email car vous avez activé les rappels pour vos événements Signature8.</p>
            <p>© ${new Date().getFullYear()} Signature8. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
