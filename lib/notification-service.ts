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
    contactId?: string; // For fetching notes from unified Note table when converted from lead
    leadId?: string; // For fetching notes from LeadNote table before deletion
    leadNotes?: Array<{ content: string; author: string; createdAt: Date }>; // Pre-fetched lead notes (before deletion)
  } = {}
) {
  const { 
    isReassignment = false, 
    previousArchitect, 
    createdBy,
    convertedFromLead = false,
    leadSource,
    leadTypeBien,
    contactId,
    leadId,
    leadNotes: preFetchedNotes = []
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

  // Helper function to format source names for display
  const formatSourceName = (source: string | null | undefined): string => {
    if (!source) return '';
    const sourceMap: Record<string, string> = {
      'magasin': 'Magasin',
      'site_web': 'Site Web',
      'facebook': 'Facebook',
      'instagram': 'Instagram',
      'tiktok': 'TikTok',
      'reference_client': 'Recommandation', // Changed from "Référence Client" to "Recommandation"
      'recommandation': 'Recommandation',
      'autre': 'Autre'
    };
    const normalizedSource = source.toLowerCase().trim();
    return sourceMap[normalizedSource] || source.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Fetch ALL lead notes if converted from lead (including history notes)
  let userNotes: Array<{ content: string; author: string; createdAt: Date }> = [];
  if (convertedFromLead) {
    try {
      console.log(`[Notification] Fetching notes for converted lead - contactId: ${contactId}, leadId: ${leadId}, preFetchedNotes: ${preFetchedNotes?.length || 0}`);
      
      // Strategy 0: Use pre-fetched notes if available (most reliable - fetched before lead deletion)
      if (preFetchedNotes && preFetchedNotes.length > 0) {
        userNotes = preFetchedNotes;
        console.log(`[Notification] ✅ Using ${userNotes.length} pre-fetched lead notes`);
        
        // Map author IDs to names if they look like IDs
        const uniqueAuthors = Array.from(
          new Set(userNotes.map(n => n.author).filter(Boolean) as string[])
        );
        const possibleIds = uniqueAuthors.filter(a => a.length > 20);

        if (possibleIds.length > 0) {
          const users = await db.user.findMany({
            where: { id: { in: possibleIds } },
            select: { id: true, name: true }
          });
          const authorNameMap = users.reduce<Record<string, string>>((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {});

          userNotes = userNotes.map(note => ({
            ...note,
            author: authorNameMap[note.author] || note.author
          }));
          console.log(`[Notification] ✅ Mapped ${possibleIds.length} author IDs to names`);
        }
      }
      
      // Strategy 1: Try to fetch from unified Note table first (after migration)
      if (userNotes.length === 0 && contactId) {
        const unifiedNotes = await db.note.findMany({
          where: {
            entityType: 'contact',
            entityId: contactId,
            sourceType: 'lead', // Only notes that came from the lead
          },
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            author: true,
            createdAt: true,
          },
        });

        console.log(`[Notification] Found ${unifiedNotes.length} notes in unified Note table for contact ${contactId}`);

        if (unifiedNotes.length > 0) {
          // Include ALL notes from the lead (don't filter out system notes - user wants all history)
          userNotes = unifiedNotes.filter(note => {
            const content = note.content.trim();
            // Only exclude empty notes
            return content.length > 0;
          });
          console.log(`[Notification] Filtered to ${userNotes.length} non-empty notes from unified Note table`);
        }
      }

      // Strategy 2: If no notes found in unified table, try fetching directly from LeadNote table
      // This is a fallback in case notes haven't been migrated yet
      if (userNotes.length === 0 && leadId) {
        console.log(`[Notification] No notes in unified table, trying LeadNote table for leadId: ${leadId}`);
        const leadNotes = await db.leadNote.findMany({
          where: { leadId: leadId },
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            author: true,
            createdAt: true,
          },
        });

        console.log(`[Notification] Found ${leadNotes.length} notes in LeadNote table for lead ${leadId}`);

        if (leadNotes.length > 0) {
          // Include ALL notes from the lead (don't filter out system notes - user wants all history)
          userNotes = leadNotes.filter(note => {
            const content = note.content.trim();
            // Only exclude empty notes
            return content.length > 0;
          });
          console.log(`[Notification] Filtered to ${userNotes.length} non-empty notes from LeadNote table`);
        }
      }
      
      // Strategy 3: Also try fetching notes by sourceId if available
      if (userNotes.length === 0 && contactId && leadId) {
        console.log(`[Notification] Trying to fetch notes by sourceId: ${leadId}`);
        const notesBySourceId = await db.note.findMany({
          where: {
            entityType: 'contact',
            entityId: contactId,
            sourceId: leadId, // Try matching by sourceId
          },
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            author: true,
            createdAt: true,
          },
        });

        console.log(`[Notification] Found ${notesBySourceId.length} notes by sourceId for contact ${contactId}`);

        if (notesBySourceId.length > 0) {
          userNotes = notesBySourceId.filter(note => {
            const content = note.content.trim();
            return content.length > 0;
          });
          console.log(`[Notification] Filtered to ${userNotes.length} non-empty notes by sourceId`);
        }
      }
      
      // Strategy 4: Fetch ALL notes for this contact (as last resort) and filter by date/content
      // This catches notes that might not have sourceType or sourceId set correctly
      if (userNotes.length === 0 && contactId) {
        console.log(`[Notification] Last resort: fetching all notes for contact ${contactId}`);
        const allContactNotes = await db.note.findMany({
          where: {
            entityType: 'contact',
            entityId: contactId,
          },
          orderBy: { createdAt: 'asc' },
          select: {
            content: true,
            author: true,
            createdAt: true,
            sourceType: true,
            sourceId: true,
          },
        });

        console.log(`[Notification] Found ${allContactNotes.length} total notes for contact ${contactId}`);
        
        // Filter to only include notes that are likely from the lead (by sourceId or recent creation)
        // or all notes if we can't determine (better to include than exclude)
        if (allContactNotes.length > 0) {
          userNotes = allContactNotes
            .filter(note => {
              const content = note.content.trim();
              if (!content.length) return false;
              // Include if it has sourceId matching leadId, or sourceType is 'lead', or we can't determine
              return !leadId || note.sourceId === leadId || note.sourceType === 'lead' || !note.sourceType;
            })
            .map(note => ({
              content: note.content,
              author: note.author,
              createdAt: note.createdAt
            }));
          console.log(`[Notification] Filtered to ${userNotes.length} notes from all contact notes`);
        }
      }

      // Map author IDs to names if they look like IDs
      if (userNotes.length > 0) {
        const uniqueAuthors = Array.from(
          new Set(userNotes.map(n => n.author).filter(Boolean) as string[])
        );
        const possibleIds = uniqueAuthors.filter(a => a.length > 20);

        if (possibleIds.length > 0) {
          const users = await db.user.findMany({
            where: { id: { in: possibleIds } },
            select: { id: true, name: true }
          });
          const authorNameMap = users.reduce<Record<string, string>>((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {});

          userNotes = userNotes.map(note => ({
            ...note,
            author: authorNameMap[note.author] || note.author
          }));
        }
      }

      // Filter out auto-generated notes: "Lead créé par" and "Statut détaillé"
      const filteredNotes = userNotes.filter(note => {
        const content = note.content.trim();
        // Exclude notes that start with "Lead créé par" (case-insensitive)
        const isLeadCreated = /^Lead créé par/i.test(content);
        // Exclude notes that start with "Statut détaillé" or "📋 Statut détaillé" (case-insensitive)
        const isStatusDetaille = /^(📋\s*)?Statut détaillé:/i.test(content);
        
        if (isLeadCreated || isStatusDetaille) {
          console.log(`[Notification] Filtering out auto-generated note: "${content.substring(0, 50)}..."`);
        }
        return !isLeadCreated && !isStatusDetaille && content.length > 0;
      });

      console.log(`[Notification] Filtered ${userNotes.length} notes to ${filteredNotes.length} (removed ${userNotes.length - filteredNotes.length} auto-generated notes)`);
      userNotes = filteredNotes;
      console.log(`[Notification] Total notes to include in notification: ${userNotes.length}`);
    } catch (noteError) {
      console.error('[Notification] Error fetching notes:', noteError);
      // Continue without notes if fetch fails
    }
  }

  if (convertedFromLead) {
    // Lead converted to contact
    title = '🎯 Nouveau Contact Converti';
    
    const formattedSource = formatSourceName(contact.source || leadSource);
    
    // Build notes section for platform message (filtered notes)
    let platformNotesSection = '';
    if (userNotes.length > 0) {
      platformNotesSection = `\n\n📝 *Historique du Lead (${userNotes.length} note${userNotes.length > 1 ? 's' : ''}):*\n` +
        userNotes.map((note, index) => {
          const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
          const date = noteDate.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          // Clean content (remove emoji prefixes)
          const cleanedContent = note.content.replace(/^[📞📝💬📅👤🎯✨🔔]\s*/, '').trim();
          return `\n${index + 1}. [${date}] ${note.author}:\n   ${cleanedContent.replace(/\n/g, '\n   ')}`;
        }).join('\n') + `\n`;
    }
    
    platformMessage = `Un nouveau contact "${contact.nom}" vous a été assigné depuis un lead qualifié.\n\n📞 Téléphone: ${contact.telephone}${contact.ville ? `\n📍 Ville: ${contact.ville}` : ''}${contact.typeBien || leadTypeBien ? `\n🏠 Type de bien: ${contact.typeBien || leadTypeBien}` : ''}${formattedSource ? `\n📊 Source: ${formattedSource}` : ''}${platformNotesSection}`;
    
    // Build WhatsApp message with enhanced notes section
    // CRITICAL: Always build notes section if notes exist
    let notesSection = '';
    console.log(`[Notification] ========== Building WhatsApp message ==========`);
    console.log(`[Notification] userNotes.length: ${userNotes.length}`);
    console.log(`[Notification] userNotes:`, JSON.stringify(userNotes.map(n => ({ author: n.author, content: n.content.substring(0, 50) + '...', createdAt: n.createdAt })), null, 2));
    
    if (userNotes && userNotes.length > 0) {
      console.log(`[Notification] ✅ Adding ${userNotes.length} notes to WhatsApp message`);
      
      try {
        // Improved notes formatting for better readability - cleaner format
        notesSection = `\n\n📝 *HISTORIQUE DU LEAD*\n\n` +
          userNotes.map((note, index) => {
            // Ensure createdAt is a Date object
            const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
            const date = noteDate.toLocaleDateString('fr-FR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric'
            });
            const time = noteDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            
            // Format note content - clean and readable
            const noteContent = (note.content || '').trim();
            // Remove emoji prefixes if they exist (like 📞, 📝, etc.) for cleaner display
            const cleanedContent = noteContent.replace(/^[📞📝💬📅👤🎯✨🔔]\s*/, '').trim();
            
            // Format content with proper line breaks - simpler format
            const formattedContent = cleanedContent
              .split('\n')
              .filter(line => line.trim().length > 0) // Remove empty lines
              .map(line => line.trim())
              .join('\n');
            
            const author = note.author || 'Système';
            
            // Cleaner format: no separators between notes, just spacing
            return `📌 *Note ${index + 1}/${userNotes.length}*\n` +
              `📅 ${date} à ${time} | 👤 ${author}\n` +
              `${formattedContent || cleanedContent}`;
          }).join('\n\n') + `\n`;
        
        console.log(`[Notification] ✅ Notes section built successfully (length: ${notesSection.length} chars)`);
        console.log(`[Notification] Notes section preview:`, notesSection.substring(0, 200) + '...');
      } catch (notesError) {
        console.error(`[Notification] ❌ Error building notes section:`, notesError);
        notesSection = `\n\n📝 *HISTORIQUE DU LEAD*\n\n⚠️ Erreur lors du chargement des notes\n`;
      }
    } else {
      console.log(`[Notification] ⚠️ No notes to include in WhatsApp message`);
      console.log(`[Notification] userNotes is:`, userNotes);
      console.log(`[Notification] userNotes.length:`, userNotes?.length);
    }
    
    console.log(`[Notification] Final notesSection length: ${notesSection.length}`);
    console.log(`[Notification] ================================================`);
    
    // Build WhatsApp message - Clean, intuitive and readable format
    // Only include notes section if there are actual notes (not auto-generated ones)
    const hasNotes = notesSection.length > 0;
    
    whatsappMessage = `🎯 *NOUVEAU CONTACT CONVERTI*\n\n` +
      `Bonjour ${architect.name.split(' ')[0]},\n\n` +
      `Un nouveau contact vous a été assigné depuis un lead qualifié.\n\n` +
      `📋 *INFORMATIONS DU CONTACT*\n\n` +
      `👤 *Nom:* ${contact.nom}\n` +
      `📞 *Téléphone:* ${contact.telephone}\n` +
      (contact.ville ? `📍 *Ville:* ${contact.ville}\n` : '') +
      (contact.typeBien || leadTypeBien ? `🏠 *Type de bien:* ${contact.typeBien || leadTypeBien}\n` : '') +
      (formattedSource ? `📊 *Source:* ${formattedSource}\n` : '') +
      (hasNotes ? notesSection : '') + // Only include if there are actual notes
      `\n💼 *ACTION REQUISE*\n\n` +
      `Veuillez contacter ce prospect dans les plus brefs délais.\n\n` +
      `Cordialement,\nL'équipe Signature8`;
    
    console.log(`[Notification] ✅ WhatsApp message built - total length: ${whatsappMessage.length} chars`);
    console.log(`[Notification] WhatsApp message includes notes: ${notesSection.length > 0 ? 'YES ✅' : 'NO ❌'}`);
    if (notesSection.length > 0) {
      console.log(`[Notification] Notes section is included in message: ${whatsappMessage.includes('HISTORIQUE DU LEAD') ? 'YES ✅' : 'NO ❌'}`);
    }
    
    emailSubject = `🎯 Nouveau Contact Converti - ${contact.nom}`;
    
    // Build notes section for email with enhanced formatting (filtered notes)
    let emailNotesSection = '';
    if (userNotes.length > 0) {
      emailNotesSection = `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">📝 Historique du Lead (${userNotes.length} note${userNotes.length > 1 ? 's' : ''})</h3>
          ${userNotes.map((note, index) => {
            const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
            const date = noteDate.toLocaleDateString('fr-FR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            });
            const time = noteDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            });
            // Clean content (remove emoji prefixes)
            const cleanedContent = note.content.replace(/^[📞📝💬📅👤🎯✨🔔]\s*/, '').trim();
            const noteContent = cleanedContent.replace(/\n/g, '<br>');
            return `
              <div style="margin-bottom: 15px; padding: 12px; background-color: #fffbeb; border-radius: 6px; border-bottom: ${index < userNotes.length - 1 ? '1px solid #fde68a' : 'none'};">
                <p style="margin: 0; font-size: 12px; color: #78350f; font-weight: bold;">
                  📌 Note ${index + 1}/${userNotes.length} - ${date} à ${time} | 👤 ${note.author}
                </p>
                <p style="margin: 8px 0 0 0; color: #1f2937; line-height: 1.6; white-space: pre-wrap;">${noteContent}</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    
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
          ${formattedSource ? `<p><strong>📊 Source:</strong> ${formattedSource}</p>` : ''}
        </div>
        ${emailNotesSection}
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
