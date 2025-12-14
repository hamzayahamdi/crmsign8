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

/**
 * Enhanced notification function for architect when contact is converted from lead or assigned
 * Sends notifications via platform, WhatsApp, and email
 */
export async function notifyArchitectContactConvertedOrAssigned(
  architectId: string,
  contact: {
    id: string;
    nom: string;
    telephone: string;
    ville?: string | null;
    email?: string | null;
    typeBien?: string | null;
    source?: string | null;
  },
  options: {
    isReassignment?: boolean;
    previousArchitect?: string | null;
    createdBy?: string;
    convertedFromLead?: boolean;
    leadSource?: string | null;
    leadTypeBien?: string | null;
  } = {}
) {
  const { 
    isReassignment = false, 
    previousArchitect, 
    createdBy,
    convertedFromLead = false,
    leadSource,
    leadTypeBien
  } = options;

  const db = getPrisma();
  
  // Get architect details
  const architect = await db.user.findUnique({
    where: { id: architectId },
    select: { 
      id: true, 
      name: true, 
      phone: true, 
      email: true 
    },
  });

  if (!architect) {
    console.warn(`[Notification] Architect ${architectId} not found`);
    return { success: false, error: 'Architect not found' };
  }

  // Build enhanced messages
  let title: string;
  let platformMessage: string;
  let whatsappMessage: string;
  let emailSubject: string;
  let emailBody: string;

  if (convertedFromLead) {
    // Lead converted to contact
    title = '🎯 Nouveau Contact Converti';
    platformMessage = `Un nouveau contact "${contact.nom}" vous a été assigné depuis un lead qualifié.\n\n📞 Téléphone: ${contact.telephone}${contact.ville ? `\n📍 Ville: ${contact.ville}` : ''}${contact.typeBien || leadTypeBien ? `\n🏠 Type de bien: ${contact.typeBien || leadTypeBien}` : ''}${contact.source || leadSource ? `\n📊 Source: ${contact.source || leadSource}` : ''}`;
    
    whatsappMessage = `🎯 *Nouveau Contact Converti*\n\n` +
      `Bonjour ${architect.name},\n\n` +
      `Un nouveau contact vous a été assigné depuis un lead qualifié.\n\n` +
      `👤 *Contact:* ${contact.nom}\n` +
      `📞 *Téléphone:* ${contact.telephone}\n` +
      (contact.ville ? `📍 *Ville:* ${contact.ville}\n` : '') +
      (contact.typeBien || leadTypeBien ? `🏠 *Type de bien:* ${contact.typeBien || leadTypeBien}\n` : '') +
      (contact.source || leadSource ? `📊 *Source:* ${contact.source || leadSource}\n` : '') +
      `\n💼 Veuillez contacter ce prospect dans les plus brefs délais.\n\n` +
      `Cordialement,\nL'équipe Signature8`;
    
    emailSubject = `🎯 Nouveau Contact Converti - ${contact.nom}`;
    emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🎯 Nouveau Contact Converti</h2>
        <p>Bonjour ${architect.name},</p>
        <p>Un nouveau contact vous a été assigné depuis un lead qualifié.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails du Contact</h3>
          <p><strong>👤 Nom:</strong> ${contact.nom}</p>
          <p><strong>📞 Téléphone:</strong> ${contact.telephone}</p>
          ${contact.ville ? `<p><strong>📍 Ville:</strong> ${contact.ville}</p>` : ''}
          ${contact.email ? `<p><strong>📧 Email:</strong> ${contact.email}</p>` : ''}
          ${contact.typeBien || leadTypeBien ? `<p><strong>🏠 Type de bien:</strong> ${contact.typeBien || leadTypeBien}</p>` : ''}
          ${contact.source || leadSource ? `<p><strong>📊 Source:</strong> ${contact.source || leadSource}</p>` : ''}
        </div>
        <p style="color: #dc2626; font-weight: bold;">💼 Veuillez contacter ce prospect dans les plus brefs délais.</p>
        <p>Cordialement,<br>L'équipe Signature8</p>
      </div>
    `;
  } else if (isReassignment) {
    // Contact reassigned
    title = '🔄 Contact Réassigné';
    platformMessage = `Le contact "${contact.nom}" vous a été réassigné${previousArchitect ? ` (précédemment: ${previousArchitect})` : ''}.\n\n📞 Téléphone: ${contact.telephone}${contact.ville ? `\n📍 Ville: ${contact.ville}` : ''}`;
    
    whatsappMessage = `🔄 *Contact Réassigné*\n\n` +
      `Bonjour ${architect.name},\n\n` +
      `Le contact "${contact.nom}" vous a été réassigné${previousArchitect ? ` (précédemment: ${previousArchitect})` : ''}.\n\n` +
      `👤 *Contact:* ${contact.nom}\n` +
      `📞 *Téléphone:* ${contact.telephone}\n` +
      (contact.ville ? `📍 *Ville:* ${contact.ville}\n` : '') +
      `\n💼 Veuillez prendre en charge ce contact.\n\n` +
      `Cordialement,\nL'équipe Signature8`;
    
    emailSubject = `🔄 Contact Réassigné - ${contact.nom}`;
    emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🔄 Contact Réassigné</h2>
        <p>Bonjour ${architect.name},</p>
        <p>Le contact "${contact.nom}" vous a été réassigné${previousArchitect ? ` (précédemment: ${previousArchitect})` : ''}.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails du Contact</h3>
          <p><strong>👤 Nom:</strong> ${contact.nom}</p>
          <p><strong>📞 Téléphone:</strong> ${contact.telephone}</p>
          ${contact.ville ? `<p><strong>📍 Ville:</strong> ${contact.ville}</p>` : ''}
          ${contact.email ? `<p><strong>📧 Email:</strong> ${contact.email}</p>` : ''}
        </div>
        <p style="color: #dc2626; font-weight: bold;">💼 Veuillez prendre en charge ce contact.</p>
        <p>Cordialement,<br>L'équipe Signature8</p>
      </div>
    `;
  } else {
    // New contact assigned
    title = '✨ Nouveau Contact Assigné';
    platformMessage = `Le contact "${contact.nom}" vous a été assigné.\n\n📞 Téléphone: ${contact.telephone}${contact.ville ? `\n📍 Ville: ${contact.ville}` : ''}${contact.typeBien ? `\n🏠 Type de bien: ${contact.typeBien}` : ''}`;
    
    whatsappMessage = `✨ *Nouveau Contact Assigné*\n\n` +
      `Bonjour ${architect.name},\n\n` +
      `Un nouveau contact vous a été assigné.\n\n` +
      `👤 *Contact:* ${contact.nom}\n` +
      `📞 *Téléphone:* ${contact.telephone}\n` +
      (contact.ville ? `📍 *Ville:* ${contact.ville}\n` : '') +
      (contact.typeBien ? `🏠 *Type de bien:* ${contact.typeBien}\n` : '') +
      `\n💼 Veuillez contacter ce prospect dans les plus brefs délais.\n\n` +
      `Cordialement,\nL'équipe Signature8`;
    
    emailSubject = `✨ Nouveau Contact Assigné - ${contact.nom}`;
    emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">✨ Nouveau Contact Assigné</h2>
        <p>Bonjour ${architect.name},</p>
        <p>Un nouveau contact vous a été assigné.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails du Contact</h3>
          <p><strong>👤 Nom:</strong> ${contact.nom}</p>
          <p><strong>📞 Téléphone:</strong> ${contact.telephone}</p>
          ${contact.ville ? `<p><strong>📍 Ville:</strong> ${contact.ville}</p>` : ''}
          ${contact.email ? `<p><strong>📧 Email:</strong> ${contact.email}</p>` : ''}
          ${contact.typeBien ? `<p><strong>🏠 Type de bien:</strong> ${contact.typeBien}</p>` : ''}
        </div>
        <p style="color: #dc2626; font-weight: bold;">💼 Veuillez contacter ce prospect dans les plus brefs délais.</p>
        <p>Cordialement,<br>L'équipe Signature8</p>
      </div>
    `;
  }

  // 1. Create in-app notification
  const notificationResult = await sendNotification({
    userId: architectId,
    type: 'client_assigned',
    priority: 'high',
    title,
    message: platformMessage,
    linkedType: 'contact',
    linkedId: contact.id,
    linkedName: contact.nom,
    metadata: {
      contactPhone: contact.telephone,
      contactVille: contact.ville,
      contactEmail: contact.email,
      previousArchitect,
      assignmentType: convertedFromLead ? 'converted_from_lead' : (isReassignment ? 'reassigned' : 'new_assignment'),
      convertedFromLead,
      leadSource: leadSource || contact.source,
      leadTypeBien: leadTypeBien || contact.typeBien,
    },
    createdBy,
    sendSMS: false, // We'll handle WhatsApp separately
    sendEmail: false, // We'll handle email separately
  });

  // 2. Send WhatsApp notification
  let whatsappResult = { success: false, error: 'No phone number' };
  if (architect.phone) {
    try {
      const { sendWhatsAppNotification, formatPhoneForWhatsApp } = await import('./sendWhatsAppNotification');
      const formattedPhone = formatPhoneForWhatsApp(architect.phone);
      
      whatsappResult = await sendWhatsAppNotification({
        userId: architectId,
        phone: formattedPhone,
        title,
        message: whatsappMessage,
        type: 'client_assigned',
        priority: 'high',
        linkedType: 'contact',
        linkedId: contact.id,
        linkedName: contact.nom,
        metadata: {
          contactPhone: contact.telephone,
          contactVille: contact.ville,
          convertedFromLead,
          assignmentType: convertedFromLead ? 'converted_from_lead' : (isReassignment ? 'reassigned' : 'new_assignment'),
        },
      });
    } catch (error) {
      console.error('[Notification] WhatsApp error:', error);
      whatsappResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    console.warn(`[Notification] No phone number for architect ${architectId}`);
  }

  // 3. Send email notification with HTML
  let emailResult = { success: false, error: 'No email address' };
  if (architect.email) {
    try {
      // Use sendEmail directly to send HTML emails
      const resendService = await import('./resend-service');
      
      // Convert HTML body to plain text for text version
      const textBody = emailBody
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      
      emailResult = await resendService.sendEmail({
        to: architect.email,
        subject: emailSubject,
        html: emailBody,
        text: textBody,
      });
    } catch (error) {
      console.error('[Notification] Email error:', error);
      emailResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    console.warn(`[Notification] No email address for architect ${architectId}`);
  }

  return {
    success: notificationResult.success,
    notification: notificationResult.notification,
    whatsapp: whatsappResult,
    email: emailResult,
  };
}

// Client-side methods are in lib/notification-service-client.ts
// This file only exports server-side functions
