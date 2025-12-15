/**
 * Notification Creator Service
 * Helper functions to create notifications for various events
 */

import { PrismaClient } from '@prisma/client';
import { sendWhatsAppNotification, formatPhoneForWhatsApp } from './sendWhatsAppNotification';
import { sendNotificationEmail, isResendConfigured } from './resend-service';

const prisma = new PrismaClient();

interface CreateNotificationParams {
  userId: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  linkedType?: string;
  linkedId?: string;
  linkedName?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

/**
 * Generic notification creator
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    // Validate required fields
    if (!params.userId) {
      throw new Error('userId is required for creating a notification');
    }
    if (!params.type) {
      throw new Error('type is required for creating a notification');
    }
    if (!params.priority) {
      throw new Error('priority is required for creating a notification');
    }
    if (!params.title) {
      throw new Error('title is required for creating a notification');
    }
    if (!params.message) {
      throw new Error('message is required for creating a notification');
    }

    console.log('[NotificationCreator] Creating notification with params:', {
      userId: params.userId,
      type: params.type,
      priority: params.priority,
      title: params.title,
      createdBy: params.createdBy
    });

    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        priority: params.priority as any,
        title: params.title,
        message: params.message,
        linkedType: params.linkedType,
        linkedId: params.linkedId,
        linkedName: params.linkedName,
        metadata: params.metadata,
        createdBy: params.createdBy,
      },
    });

    console.log('[NotificationCreator] Created notification:', notification.id);
    return notification;
  } catch (error) {
    console.error('[NotificationCreator] Error creating notification:', error);
    console.error('[NotificationCreator] Params were:', params);
    throw error;
  }
}

/**
 * Create notification for new RDV
 */
export async function notifyRdvCreated(params: {
  userId: string;
  clientName: string;
  clientId: string;
  appointmentDate: string;
  location?: string;
  createdBy: string;
}) {
  const notification = await createNotification({
    userId: params.userId,
    type: 'rdv_created',
    priority: 'high',
    title: 'Nouveau RDV assigné',
    message: `RDV avec ${params.clientName} le ${params.appointmentDate}${params.location ? ` à ${params.location}` : ''}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      appointmentDate: params.appointmentDate,
      location: params.location,
    },
    createdBy: params.createdBy,
  });

  // Send WhatsApp notification
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { phone: true, name: true }
    });

    if (user?.phone) {
      const whatsappMessage = `📅 *Nouveau Rendez-vous Assigné*\n\n` +
        `Bonjour ${user.name.split(' ')[0]},\n\n` +
        `Un nouveau rendez-vous a été créé pour vous.\n\n` +
        `👤 *Client :* ${params.clientName}\n` +
        `📆 *Date :* ${params.appointmentDate}\n` +
        `${params.location ? `📍 *Lieu :* ${params.location}\n` : ''}` +
        `\n_Créé par ${params.createdBy}_`;

      await sendWhatsAppNotification({
        userId: params.userId,
        phone: user.phone,
        title: 'Nouveau RDV assigné',
        message: whatsappMessage,
        type: 'rdv_created',
        priority: 'high',
        linkedType: 'client',
        linkedId: params.clientId,
        linkedName: params.clientName,
        metadata: {
          appointmentDate: params.appointmentDate,
          location: params.location,
        }
      });

      console.log(`[NotificationCreator] WhatsApp sent for RDV to ${user.name}`);
    } else {
      console.log(`[NotificationCreator] No phone number for user ${params.userId}, skipping WhatsApp`);
    }
  } catch (error) {
    console.error('[NotificationCreator] Error sending WhatsApp for RDV:', error);
    // Don't fail the notification creation if WhatsApp fails
  }

  return notification;
}

/**
 * Create notification for RDV reminder
 */
export async function notifyRdvReminder(params: {
  userId: string;
  clientName: string;
  clientId: string;
  appointmentDate: string;
  location?: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'rdv_reminder',
    priority: 'high',
    title: 'Rappel RDV',
    message: `RDV avec ${params.clientName} prévu pour ${params.appointmentDate}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      appointmentDate: params.appointmentDate,
      location: params.location,
    },
  });
}

/**
 * Create notification for new devis
 */
export async function notifyDevisCreated(params: {
  userId: string;
  clientName: string;
  clientId: string;
  devisAmount: number;
  createdBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'devis_created',
    priority: 'medium',
    title: 'Nouveau devis créé',
    message: `Devis de ${params.devisAmount.toLocaleString('fr-FR')} DH pour ${params.clientName}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      devisAmount: params.devisAmount,
    },
    createdBy: params.createdBy,
  });
}

/**
 * Stage labels for French display
 */
const STAGE_LABELS: Record<string, string> = {
  qualifie: 'Qualifié',
  nouveau: 'Nouveau',
  prise_de_besoin: 'Prise de besoin',
  acompte_recu: 'Acompte reçu',
  acompte_verse: 'Acompte versé',
  conception: 'Conception',
  en_conception: 'En conception',
  devis_negociation: 'Devis/Négociation',
  en_validation: 'En validation',
  accepte: 'Accepté',
  refuse: 'Refusé',
  perdu: 'Perdu',
  annule: 'Annulé',
  suspendu: 'Suspendu',
  premier_depot: 'Premier dépôt',
  projet_en_cours: 'Projet en cours',
  chantier: 'Chantier',
  en_chantier: 'En chantier',
  facture_reglee: 'Facture réglée',
  livraison_termine: 'Livraison & Terminé',
  livraison: 'Livraison',
  termine: 'Terminé',
};

/**
 * Create notification for stage change with enhanced formatting
 */
export async function notifyStageChanged(params: {
  userId: string;
  clientName: string;
  clientId: string;
  previousStage: string;
  newStage: string;
  createdBy: string;
  projectName?: string;
}) {
  const previousLabel = STAGE_LABELS[params.previousStage] || params.previousStage;
  const newLabel = STAGE_LABELS[params.newStage] || params.newStage;
  const displayName = params.projectName || params.clientName;

  return createNotification({
    userId: params.userId,
    type: 'stage_changed',
    priority: 'medium',
    title: '📊 Changement d\'étape',
    message: `${displayName}\n${previousLabel} → ${newLabel}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: displayName,
    metadata: {
      previousStage: params.previousStage,
      newStage: params.newStage,
      previousStageLabel: previousLabel,
      newStageLabel: newLabel,
      projectName: params.projectName,
    },
    createdBy: params.createdBy,
  });
}

/**
 * Create notification for payment received
 */
export async function notifyPaymentReceived(params: {
  userId: string;
  clientName: string;
  clientId: string;
  amount: number;
  createdBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'payment_received',
    priority: 'high',
    title: 'Paiement reçu',
    message: `Paiement de ${params.amount.toLocaleString('fr-FR')} DH reçu de ${params.clientName}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      amount: params.amount,
    },
    createdBy: params.createdBy,
  });
}

/**
 * Create notification for task assignment
 */
export async function notifyTaskAssigned(params: {
  userId: string;
  taskTitle: string;
  taskId: string;
  dueDate: string;
  linkedName?: string;
  createdBy: string;
}) {
  const notification = await createNotification({
    userId: params.userId,
    type: 'task_assigned',
    priority: 'high',
    title: 'Nouvelle tâche assignée',
    message: `${params.taskTitle} - À faire avant le ${params.dueDate}`,
    linkedType: 'task',
    linkedId: params.taskId,
    linkedName: params.linkedName,
    metadata: {
      dueDate: params.dueDate,
    },
    createdBy: params.createdBy,
  });

  // Send WhatsApp and Email notifications
  try {
    console.log(`[NotificationCreator] 🔍 Looking up user for task notification: ${params.userId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { phone: true, name: true, email: true, id: true }
    });

    if (!user) {
      console.error(`[NotificationCreator] ❌ User ${params.userId} not found - cannot send notifications`);
      return notification;
    }

    console.log(`[NotificationCreator] ✅ User found: ${user.name} (phone: ${user.phone || 'NOT SET'}, email: ${user.email || 'NOT SET'})`);

    const formattedDueDate = new Date(params.dueDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Send WhatsApp notification
    if (user.phone) {
      try {
        // Format phone number to international format
        const formattedPhone = formatPhoneForWhatsApp(user.phone);
        console.log(`[NotificationCreator] 📱 Attempting to send WhatsApp to ${user.name} at ${formattedPhone} (original: ${user.phone})`);
        
        const whatsappMessage = `✅ *Nouvelle Tâche Assignée*\n\n` +
          `Bonjour ${user.name.split(' ')[0]},\n\n` +
          `Une nouvelle tâche vous a été assignée.\n\n` +
          `📋 *Tâche :* ${params.taskTitle}\n` +
          `📅 *Échéance :* ${formattedDueDate}\n` +
          `${params.linkedName ? `🔗 *Lié à :* ${params.linkedName}\n` : ''}` +
          `\n💡 *Action requise :*\n` +
          `Merci de compléter cette tâche avant la date d'échéance.\n\n` +
          `_Créé par ${params.createdBy}_`;

        const whatsappResult = await sendWhatsAppNotification({
          userId: params.userId,
          phone: formattedPhone,
          title: 'Nouvelle tâche assignée',
          message: whatsappMessage,
          type: 'task_assigned',
          priority: 'high',
          linkedType: 'task',
          linkedId: params.taskId,
          linkedName: params.linkedName,
          metadata: {
            dueDate: params.dueDate,
          }
        });

        if (whatsappResult.ok && whatsappResult.whatsappSent) {
          console.log(`[NotificationCreator] ✅ WhatsApp sent successfully for task to ${user.name} (${formattedPhone})`);
        } else {
          console.error(`[NotificationCreator] ❌ WhatsApp failed for task to ${user.name} (${formattedPhone}):`, whatsappResult.error || 'Unknown error');
        }
      } catch (whatsappError) {
        console.error('[NotificationCreator] ❌ Exception sending WhatsApp for task:', whatsappError);
        console.error('[NotificationCreator] WhatsApp error details:', {
          error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
          stack: whatsappError instanceof Error ? whatsappError.stack : undefined,
          userId: params.userId,
          phone: user.phone,
          formattedPhone: formatPhoneForWhatsApp(user.phone)
        });
        // Don't fail if WhatsApp fails
      }
    } else {
      console.warn(`[NotificationCreator] ⚠️ No phone number for user ${user.name} (${params.userId}), skipping WhatsApp`);
    }

    // Send Email notification
    if (user.email) {
      try {
        // Check if Resend is configured
        if (!isResendConfigured()) {
          console.warn(`[NotificationCreator] ⚠️ Resend not configured. Email notification skipped for ${user.email}`);
          console.warn(`[NotificationCreator] ⚠️ Add RESEND_API_KEY to .env file to enable email notifications`);
        } else {
          console.log(`[NotificationCreator] 📧 Attempting to send email to ${user.name} at ${user.email}`);
          console.log(`[NotificationCreator] Email validation:`, {
            email: user.email,
            isValidFormat: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email || '')
          });
          
          const emailResult = await sendNotificationEmail(user.email, {
            title: `Nouvelle tâche assignée: ${params.taskTitle}`,
            message: `Bonjour ${user.name},\n\nUne nouvelle tâche vous a été assignée.`,
            type: 'task_assigned',
            taskData: {
              taskTitle: params.taskTitle,
              dueDate: formattedDueDate,
              linkedName: params.linkedName,
              createdBy: params.createdBy,
              taskId: params.taskId
            }
          });
          
          if (emailResult.success) {
            console.log(`[NotificationCreator] ✅ Email sent successfully for task to ${user.email}`);
            if (emailResult.messageId) {
              console.log(`[NotificationCreator] 📬 Email message ID: ${emailResult.messageId}`);
            }
            if (emailResult.debug) {
              console.log(`[NotificationCreator] 📧 Email debug info:`, JSON.stringify(emailResult.debug, null, 2));
            }
          } else {
            console.error(`[NotificationCreator] ❌ Email failed for task to ${user.email}`);
            console.error(`[NotificationCreator] ❌ Error:`, emailResult.error || 'Unknown error');
            if (emailResult.debug) {
              console.error(`[NotificationCreator] ❌ Debug info:`, JSON.stringify(emailResult.debug, null, 2));
            }
            
            // Show specific troubleshooting based on error type
            if (emailResult.error?.includes('API key is invalid')) {
              console.error(`[NotificationCreator] ❌ INVALID API KEY DETECTED`);
              console.error(`[NotificationCreator] ❌ Your RESEND_API_KEY in .env is invalid or expired`);
              console.error(`[NotificationCreator] ❌ Steps to fix:`);
              console.error(`[NotificationCreator]    1. Go to https://resend.com/api-keys`);
              console.error(`[NotificationCreator]    2. Check if your API key is active`);
              console.error(`[NotificationCreator]    3. Generate a NEW API key if needed`);
              console.error(`[NotificationCreator]    4. Copy the key (starts with re_)`);
              console.error(`[NotificationCreator]    5. Update RESEND_API_KEY in .env file`);
              console.error(`[NotificationCreator]    6. RESTART your server`);
              console.error(`[NotificationCreator]    7. Test: GET /api/email/test?email=${user.email}`);
            } else {
              console.error(`[NotificationCreator] ❌ Troubleshooting steps:`);
              console.error(`[NotificationCreator]    1. Check RESEND_API_KEY is set in .env file`);
              console.error(`[NotificationCreator]    2. Verify email address is valid: ${user.email}`);
              console.error(`[NotificationCreator]    3. Check Resend account is active`);
              console.error(`[NotificationCreator]    4. Test email endpoint: GET /api/email/test?email=${user.email}`);
              console.error(`[NotificationCreator]    5. Check server logs for detailed error messages`);
            }
          }
        }
      } catch (emailError) {
        console.error('[NotificationCreator] ❌ Exception sending email for task:', emailError);
        console.error('[NotificationCreator] Email error details:', {
          error: emailError instanceof Error ? emailError.message : String(emailError),
          stack: emailError instanceof Error ? emailError.stack : undefined,
          userId: params.userId,
          email: user.email
        });
        // Don't fail if email fails
      }
    } else {
      console.warn(`[NotificationCreator] ⚠️ No email for user ${user.name} (${params.userId}), skipping email`);
    }
  } catch (error) {
    console.error('[NotificationCreator] ❌ Critical error sending notifications for task:', error);
    console.error('[NotificationCreator] Error details:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: params.userId,
      taskId: params.taskId
    });
    // Don't fail the notification creation if notifications fail
  }

  return notification;
}

/**
 * Create notification for task due soon
 */
export async function notifyTaskDueSoon(params: {
  userId: string;
  taskTitle: string;
  taskId: string;
  dueDate: string;
  linkedName?: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'task_due_soon',
    priority: 'high',
    title: 'Tâche à échéance proche',
    message: `${params.taskTitle} - Échéance: ${params.dueDate}`,
    linkedType: 'task',
    linkedId: params.taskId,
    linkedName: params.linkedName,
    metadata: {
      dueDate: params.dueDate,
    },
  });
}

/**
 * Create notification for document upload
 */
export async function notifyDocumentUploaded(params: {
  userId: string;
  clientName: string;
  clientId: string;
  documentName: string;
  createdBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'document_uploaded',
    priority: 'low',
    title: 'Document ajouté',
    message: `${params.documentName} ajouté pour ${params.clientName}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      documentName: params.documentName,
    },
    createdBy: params.createdBy,
  });
}

/**
 * Create notification for client assignment
 */
export async function notifyClientAssigned(params: {
  userId: string;
  clientName: string;
  clientId: string;
  createdBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'client_assigned',
    priority: 'high',
    title: 'Nouveau client assigné',
    message: `Le client ${params.clientName} vous a été assigné`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    createdBy: params.createdBy,
  });
}
