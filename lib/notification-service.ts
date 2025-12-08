/**
 * Server-Side Notification Service
 * 
 * Handles in-app notifications and SMS notifications for architects
 * when contacts are assigned to them.
 * 
 * ⚠️ This file is SERVER-ONLY and should NOT be imported in client components.
 * Use lib/notification-service-client.ts for client-side code.
 */

'use server';

// Prisma client - only available server-side
let prisma: any = null;

function getPrisma() {
  // Only initialize Prisma on server-side
  if (typeof window !== 'undefined') {
    throw new Error('Prisma can only be used server-side');
  }
  
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  
  return prisma;
}

// Client-side methods have been moved to lib/notification-service-client.ts

// Dynamic import for Mocean service (server-side only)
// This prevents Next.js from bundling Node.js modules for the client
async function getMoceanService() {
  if (typeof window !== 'undefined') {
    // Client-side: return null, SMS not available
    return null;
  }
  // Server-side: dynamically import Mocean service
  try {
    const moceanService = await import('./mocean-service');
    return moceanService;
  } catch (error) {
    console.warn('[Notification] Mocean service not available:', error);
    return null;
  }
}

export type NotificationOptions = {
  userId: string;
  type: 'client_assigned' | 'task_assigned' | 'rdv_created' | 'rdv_reminder';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  linkedType?: string;
  linkedId?: string;
  linkedName?: string;
  metadata?: any;
  createdBy?: string;
  sendSMS?: boolean; // Enable SMS notification
  sendEmail?: boolean; // Enable email notification
};

/**
 * Send a notification to a user
 * Creates an in-app notification and optionally sends SMS
 */
export async function sendNotification(options: NotificationOptions) {
  const {
    userId,
    type,
    priority,
    title,
    message,
    linkedType,
    linkedId,
    linkedName,
    metadata,
    createdBy,
    sendSMS = false,
    sendEmail = false,
  } = options;

  // Only run on server-side
  if (typeof window !== 'undefined') {
    throw new Error('sendNotification can only be used server-side. Use API routes instead.');
  }

  try {
    const db = getPrisma();
    
    // 1. Create in-app notification
    const notification = await db.notification.create({
      data: {
        userId,
        type: type as any,
        priority: priority as any,
        title,
        message,
        linkedType,
        linkedId,
        linkedName,
        metadata,
        createdBy,
      },
    });

    // 2. Send SMS if enabled (server-side only)
    if (sendSMS) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { phone: true, name: true },
      });

      if (user?.phone) {
        await sendSMSNotification(user.phone, title, message);
      } else {
        console.warn(`[Notification] SMS requested for user ${userId} but no phone number found`);
      }
    }

    // 3. Send email if enabled (server-side only)
    if (sendEmail) {
      await sendEmailNotification(userId, title, message);
    }

    return { success: true, notification };
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
    return { success: false, error };
  }
}

/**
 * Send email notification using Resend (server-side only)
 * 
 * Uses the Resend service configured in lib/resend-service.ts
 * Checks user preferences before sending
 */
async function sendEmailNotification(userId: string, title: string, message: string) {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    console.warn('[Email] Email notifications are server-side only');
    return { success: false, error: 'Email not available on client-side' };
  }

  try {
    // Dynamically import Resend service (server-side only)
    const resendService = await import('./resend-service');
    
    if (!resendService.isResendConfigured()) {
      console.log(`[Email] Resend not configured. Would send email to user ${userId}: ${title} - ${message}`);
      console.log(`[Email] Add RESEND_API_KEY to .env to enable email notifications`);
      return { success: true, note: 'Email sending not yet configured' };
    }

    const db = getPrisma();
    
    // Check user preferences
    const prefs = await db.$queryRaw<Array<{
      email_enabled: boolean;
    }>>`
      SELECT email_enabled
      FROM notification_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const emailEnabled = prefs.length > 0 ? prefs[0].email_enabled : true;

    if (!emailEnabled) {
      console.log(`[Email] Email notifications disabled for user ${userId}`);
      return { success: true, note: 'Email notifications disabled by user' };
    }

    // Get user email
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) {
      console.warn(`[Email] No email found for user ${userId}`);
      return { success: false, error: 'No email address found' };
    }

    // Send email
    const result = await resendService.sendNotificationEmail(user.email, {
      title,
      message,
      type: 'notification',
    });
    
    if (result.success) {
      console.log(`[Email] Sent to ${user.email}: ${result.messageId}`);
    } else {
      console.error(`[Email] Failed to send to ${user.email}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`[Email] Error sending email to user ${userId}:`, error);
    return { success: false, error };
  }
}

/**
 * Send SMS notification using MoceanAPI (server-side only)
 * 
 * Uses the MoceanAPI service configured in lib/mocean-service.ts
 * If MoceanAPI is not configured, only logs the intent
 */
async function sendSMSNotification(phoneNumber: string, title: string, message: string) {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    console.warn('[SMS] SMS notifications are server-side only');
    return { success: false, error: 'SMS not available on client-side' };
  }

  try {
    // Dynamically import Mocean service (server-side only)
    const moceanService = await getMoceanService();
    
    if (!moceanService) {
      console.log(`[SMS] MoceanAPI not available. Would send to ${phoneNumber}: ${title} - ${message}`);
      console.log(`[SMS] Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env to enable SMS`);
      return { success: true, note: 'SMS sending not yet configured' };
    }

    // Check if MoceanAPI is configured
    if (!moceanService.isMoceanConfigured()) {
      console.log(`[SMS] MoceanAPI not configured. Would send to ${phoneNumber}: ${title} - ${message}`);
      console.log(`[SMS] Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env to enable SMS`);
      return { success: true, note: 'SMS sending not yet configured' };
    }

    // Send SMS via MoceanAPI
    const result = await moceanService.sendNotificationSMS(phoneNumber, title, message);
    
    if (result.success) {
      console.log(`[SMS] Sent to ${phoneNumber}: ${result.messageId}`);
    } else {
      console.error(`[SMS] Failed to send to ${phoneNumber}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`[SMS] Error sending SMS to ${phoneNumber}:`, error);
    return { success: false, error };
  }
}

/**
 * Notify architect when a contact is assigned to them
 */
export async function notifyArchitectContactAssigned(
  architectId: string,
  contact: {
    id: string;
    nom: string;
    telephone: string;
    ville?: string | null;
  },
  options: {
    isReassignment?: boolean;
    previousArchitect?: string | null;
    createdBy?: string;
    sendSMS?: boolean;
  } = {}
) {
  const { isReassignment = false, previousArchitect, createdBy, sendSMS = true } = options;

  const title = isReassignment ? 'Contact Réassigné' : 'Nouveau Contact Assigné';
  const message = isReassignment && previousArchitect
    ? `Le contact "${contact.nom}" vous a été réassigné (précédemment: ${previousArchitect}). Téléphone: ${contact.telephone}`
    : `Le contact "${contact.nom}" vous a été assigné. Téléphone: ${contact.telephone}`;

  return sendNotification({
    userId: architectId,
    type: 'client_assigned',
    priority: 'high',
    title,
    message,
    linkedType: 'contact',
    linkedId: contact.id,
    linkedName: contact.nom,
    metadata: {
      contactPhone: contact.telephone,
      contactVille: contact.ville,
      previousArchitect,
      assignmentType: isReassignment ? 'reassigned' : 'new_assignment',
    },
    createdBy,
    sendSMS,
  });
}

// Client-side methods are in lib/notification-service-client.ts
// This file only exports server-side functions
