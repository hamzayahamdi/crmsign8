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
 * Sanitize and validate API key from environment variable
 */
function sanitizeApiKey(apiKey: string | undefined): string | null {
  if (!apiKey) {
    return null;
  }

  // Trim whitespace
  let cleaned = apiKey.trim();

  // Remove surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Validate format - should start with 're_'
  if (!cleaned.startsWith('re_')) {
    console.error('[Resend] ❌ Invalid API key format. Should start with "re_"');
    console.error('[Resend] ❌ Current value starts with:', cleaned.substring(0, 3) || '(empty)');
    return null;
  }

  // Check minimum length (Resend keys are typically 20+ characters)
  if (cleaned.length < 20) {
    console.error('[Resend] ❌ API key seems too short. Expected length: 20+ characters');
    console.error('[Resend] ❌ Current length:', cleaned.length);
    return null;
  }

  return cleaned;
}

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

  const rawApiKey = process.env.RESEND_API_KEY;
  console.log('[Resend] Raw API key from env:', rawApiKey ? `${rawApiKey.substring(0, 5)}...` : 'NOT SET');
  
  const apiKey = sanitizeApiKey(rawApiKey);

  if (!apiKey) {
    console.warn('[Resend] ❌ Missing or invalid RESEND_API_KEY. Email notifications disabled.');
    console.warn('[Resend] ❌ Please check your .env file:');
    console.warn('[Resend]    1. Ensure RESEND_API_KEY=re_xxxxxxxxxxxxx is on a single line');
    console.warn('[Resend]    2. Remove any quotes around the key');
    console.warn('[Resend]    3. Remove any trailing spaces');
    console.warn('[Resend]    4. Restart your server after making changes');
    return null;
  }

  console.log('[Resend] ✅ API key validated successfully');
  console.log('[Resend] ✅ API key format: correct (starts with re_)');
  console.log('[Resend] ✅ API key length:', apiKey.length, 'characters');

  try {
    resendClient = new Resend(apiKey);
    console.log('[Resend] ✅ Resend client initialized successfully');
    return resendClient;
  } catch (error) {
    console.error('[Resend] ❌ Failed to initialize Resend client:', error);
    console.error('[Resend] ❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  const rawApiKey = process.env.RESEND_API_KEY;
  const sanitizedKey = sanitizeApiKey(rawApiKey);
  const client = getResendClient();
  const isConfigured = !!sanitizedKey && !!client;
  
  if (!isConfigured) {
    console.log('[Resend] Configuration check failed:', {
      hasRawKey: !!rawApiKey,
      hasSanitizedKey: !!sanitizedKey,
      hasClient: !!client
    });
  }
  
  return isConfigured;
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
}): Promise<{ success: boolean; messageId?: string; error?: string; debug?: any }> {
  try {
    console.log('[Resend] ========== EMAIL SEND ATTEMPT START ==========');
    console.log('[Resend] Checking Resend configuration...');
    
    const rawApiKey = process.env.RESEND_API_KEY;
    const sanitizedKey = sanitizeApiKey(rawApiKey);
    console.log('[Resend] RESEND_API_KEY exists in env:', !!rawApiKey);
    console.log('[Resend] RESEND_API_KEY after sanitization:', !!sanitizedKey);
    if (rawApiKey) {
      console.log('[Resend] Raw key length:', rawApiKey.length);
      console.log('[Resend] Raw key preview:', rawApiKey.substring(0, 5) + '...');
      console.log('[Resend] Raw key has quotes:', rawApiKey.includes('"') || rawApiKey.includes("'"));
      console.log('[Resend] Raw key has leading/trailing spaces:', rawApiKey !== rawApiKey.trim());
    }
    if (sanitizedKey) {
      console.log('[Resend] Sanitized key length:', sanitizedKey.length);
      console.log('[Resend] Sanitized key format: valid (starts with re_)');
    }
    
    const client = getResendClient();
    
    if (!client) {
      console.error('[Resend] ❌ Resend client is null - cannot send email');
      console.error('[Resend] ❌ Check: 1) RESEND_API_KEY is set in .env, 2) Server was restarted after adding key');
      return {
        success: false,
        error: 'Resend not configured. Add RESEND_API_KEY to .env file and restart server.',
        debug: {
          hasApiKey: !!rawApiKey,
          apiKeyLength: rawApiKey?.length || 0,
          apiKeyFormat: rawApiKey ? (rawApiKey.startsWith('re_') ? 'valid' : 'invalid format') : 'missing',
          hasSanitizedKey: !!sanitizedKey
        }
      };
    }

    let fromEmail = options.from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    console.log('[Resend] From email:', fromEmail);
    console.log('[Resend] RESEND_FROM_EMAIL env var:', process.env.RESEND_FROM_EMAIL || 'not set (using default)');
    
    // Ensure 'to' is an array
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    console.log('[Resend] Recipients:', recipients);
    console.log('[Resend] Subject:', options.subject);
    console.log('[Resend] HTML length:', options.html.length, 'characters');

    console.log('[Resend] Attempting to send email via Resend API...');
    let result = await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: options.replyTo,
    });

    console.log('[Resend] Resend API response received');
    console.log('[Resend] Response has error:', !!result.error);
    console.log('[Resend] Response has data:', !!result.data);

    // Handle Resend testing mode limitation
    if (result.error && result.error.message && result.error.message.includes('You can only send testing emails to your own email address')) {
        console.error('[Resend] ❌ RESEND TESTING MODE LIMITATION');
        console.error('[Resend] ❌ Your Resend account is in testing mode');
        console.error('[Resend] ❌ You can only send emails to: i.aboulfadl@sketch.ma');
        console.error('[Resend] ❌ To send to other recipients, you MUST verify your domain');
        console.error('[Resend] ❌');
        console.error('[Resend] ✅ GOOD NEWS: Domain sketch.ma has been added to Resend!');
        console.error('[Resend] ⏳ NEXT STEP: Add DNS records to your domain provider');
        console.error('[Resend]    1. Go to https://resend.com/domains and copy the DNS records');
        console.error('[Resend]    2. Log in to your domain provider (where you manage sketch.ma)');
        console.error('[Resend]    3. Add the DNS records shown in Resend (DKIM, SPF, MX)');
        console.error('[Resend]    4. Wait for verification (5 minutes to 48 hours)');
        console.error('[Resend]    5. Once verified, set RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma in .env');
        console.error('[Resend]    6. Restart server');
        console.error('[Resend]    7. Test email sending');
      // Don't retry - this is a hard limitation that can't be worked around
    }
    // If domain verification error, try fallback to default Resend email
    else if (result.error && result.error.message && result.error.message.includes('domain is not verified')) {
      console.warn('[Resend] ⚠️ Domain verification error detected');
      console.warn('[Resend] ⚠️ Attempting fallback to default Resend email (onboarding@resend.dev)');
      
      // Only retry if we're not already using the default email
      if (fromEmail !== 'onboarding@resend.dev') {
        fromEmail = 'onboarding@resend.dev';
        console.log('[Resend] Retrying with fromEmail:', fromEmail);
        
        result = await client.emails.send({
          from: fromEmail,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>/g, ''),
          replyTo: options.replyTo,
        });
        
        if (!result.error) {
          console.log('[Resend] ✅ Email sent successfully using fallback address');
          console.warn('[Resend] ⚠️ IMPORTANT: Verify your domain at https://resend.com/domains to use custom email');
          console.warn('[Resend] ⚠️ Current domain:', process.env.RESEND_FROM_EMAIL?.split('@')[1] || 'unknown');
        }
      }
    }

    if (result.error) {
      console.error('[Resend] ❌ Resend API returned error:', JSON.stringify(result.error, null, 2));
      console.error('[Resend] Error type:', result.error.constructor.name);
      console.error('[Resend] Error message:', result.error.message);
      console.error('[Resend] Error status code:', result.error.statusCode);
      
      // Provide helpful error message based on error type
      let errorMessage = result.error.message || 'Failed to send email';
      let troubleshootingSteps: string[] = [];
      
      if (result.error.statusCode === 401 && result.error.message?.includes('API key is invalid')) {
        errorMessage = 'API key is invalid. Please check your RESEND_API_KEY in .env file.';
        troubleshootingSteps = [
          '1. Go to https://resend.com/api-keys',
          '2. Check if your API key is active',
          '3. Generate a new API key if needed',
          '4. Copy the new key (starts with re_)',
          '5. Update RESEND_API_KEY in your .env file',
          '6. Restart your server',
          '7. Test with: GET /api/email/test?email=your@email.com'
        ];
        console.error('[Resend] ❌ INVALID API KEY - Troubleshooting steps:');
        troubleshootingSteps.forEach(step => console.error(`[Resend]    ${step}`));
      } else if (result.error.statusCode === 403 && result.error.message?.includes('You can only send testing emails')) {
        errorMessage = 'Resend account is in testing mode. You can only send emails to your verified email address (i.aboulfadl@sketch.ma). To send to other recipients, verify your domain at https://resend.com/domains';
        troubleshootingSteps = [
          'IMPORTANT: You verify the DOMAIN (sketch.ma), not the email address!',
          '1. Go to https://resend.com/domains',
          '2. Click "Add Domain" button',
          '3. Enter: sketch.ma (domain only, NOT the email address)',
          '4. Copy the DNS records shown (TXT records for verification, SPF, DKIM)',
          '5. Add these DNS records to your domain provider (where you manage sketch.ma DNS)',
          '6. Wait for verification (can take a few minutes to 48 hours)',
          '7. Once verified, set RESEND_FROM_EMAIL=i.aboulfadl@sketch.ma in .env',
          '8. Restart your server',
          '9. Test with: GET /api/email/test?email=recipient@email.com',
          '',
          'Note: If domain already exists, check if you have access to the Resend account that owns it'
        ];
        console.error('[Resend] ❌ TESTING MODE LIMITATION - Troubleshooting steps:');
        troubleshootingSteps.forEach(step => console.error(`[Resend]    ${step}`));
      } else if (result.error.message && result.error.message.includes('domain is not verified')) {
        errorMessage += '\n\n💡 Solution: Verify your domain at https://resend.com/domains or use onboarding@resend.dev temporarily';
      }
      
      return {
        success: false,
        error: errorMessage,
        debug: {
          error: result.error,
          fromEmail,
          recipients,
          subject: options.subject,
          attemptedFallback: fromEmail === 'onboarding@resend.dev' && process.env.RESEND_FROM_EMAIL ? true : false,
          troubleshootingSteps: troubleshootingSteps.length > 0 ? troubleshootingSteps : undefined
        }
      };
    }

    const messageId = result.data?.id;
    console.log('[Resend] ✅ Email sent successfully!');
    console.log('[Resend] Message ID:', messageId);
    console.log('[Resend] ========== EMAIL SEND ATTEMPT SUCCESS ==========');
    
    return {
      success: true,
      messageId: messageId,
      debug: {
        fromEmail,
        recipients,
        subject: options.subject,
        messageId
      }
    };
  } catch (error: any) {
    console.error('[Resend] ❌ Exception caught while sending email:', error);
    console.error('[Resend] Error name:', error?.name);
    console.error('[Resend] Error message:', error?.message);
    console.error('[Resend] Error stack:', error?.stack);
    console.error('[Resend] ========== EMAIL SEND ATTEMPT FAILED ==========');
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
      debug: {
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      }
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
    taskData?: {
      taskTitle: string;
      dueDate: string;
      linkedName?: string;
      createdBy: string;
      taskId: string;
    };
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let html = '';

  // Special template for task_assigned notifications
  if (notification.type === 'task_assigned' && notification.taskData) {
    const { taskTitle, dueDate, linkedName, createdBy } = notification.taskData;
    
    html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${notification.title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px;">
            <tr>
              <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Nouvelle Tâche Assignée</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #1f2937; font-size: 18px; margin: 0 0 30px 0; font-weight: 500;">
                        ${notification.message}
                      </p>
                      
                      <!-- Task Card -->
                      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 25px; margin: 30px 0;">
                        <div style="margin-bottom: 20px;">
                          <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <span style="font-size: 24px; margin-right: 12px;">📋</span>
                            <h2 style="color: #1e40af; margin: 0; font-size: 22px; font-weight: 600;">${taskTitle}</h2>
                          </div>
                        </div>
                        
                        <div style="background: white; border-radius: 6px; padding: 20px; margin-top: 15px;">
                          <div style="margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                              <span style="font-size: 20px; margin-right: 10px;">📅</span>
                              <div>
                                <div style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Date d'échéance</div>
                                <div style="color: #1f2937; font-size: 16px; font-weight: 600;">${dueDate}</div>
                              </div>
                            </div>
                          </div>
                          
                          ${linkedName ? `
                            <div style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                              <div style="display: flex; align-items: center;">
                                <span style="font-size: 20px; margin-right: 10px;">🔗</span>
                                <div>
                                  <div style="color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Lié à</div>
                                  <div style="color: #1f2937; font-size: 16px; font-weight: 600;">${linkedName}</div>
                                </div>
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                      
                      <!-- Action Box -->
                      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <div style="display: flex; align-items: start;">
                          <span style="font-size: 24px; margin-right: 12px;">💡</span>
                          <div>
                            <div style="color: #92400e; font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Action Requise</div>
                            <p style="color: #78350f; font-size: 15px; margin: 0; line-height: 1.6;">
                              Merci de compléter cette tâche avant la date d'échéance indiquée ci-dessus.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Footer Info -->
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 13px; margin: 0; text-align: center;">
                          Créé par <strong style="color: #1f2937;">${createdBy}</strong>
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Signature8 CRM - Gestion de vos tâches et projets
                      </p>
                      <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
                        Ceci est un email automatique, merci de ne pas y répondre.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  } else {
    // Default template for other notifications
    html = `
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
  }

  return sendEmail({
    to,
    subject: notification.title,
    html,
  });
}


