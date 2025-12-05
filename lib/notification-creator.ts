/**
 * Notification Creator Service
 * Helper functions to create notifications for various events
 */

import { PrismaClient } from '@prisma/client';
import { sendWhatsAppNotification } from './sendWhatsAppNotification';

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
 * Create notification for stage change
 */
export async function notifyStageChanged(params: {
  userId: string;
  clientName: string;
  clientId: string;
  previousStage: string;
  newStage: string;
  createdBy: string;
}) {
  return createNotification({
    userId: params.userId,
    type: 'stage_changed',
    priority: 'medium',
    title: 'Changement d\'étape',
    message: `${params.clientName}: ${params.previousStage} → ${params.newStage}`,
    linkedType: 'client',
    linkedId: params.clientId,
    linkedName: params.clientName,
    metadata: {
      previousStage: params.previousStage,
      newStage: params.newStage,
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

  // Send WhatsApp notification
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { phone: true, name: true }
    });

    if (user?.phone) {
      const formattedDueDate = new Date(params.dueDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const whatsappMessage = `✅ *Nouvelle Tâche Assignée*\n\n` +
        `Bonjour ${user.name.split(' ')[0]},\n\n` +
        `Une nouvelle tâche vous a été assignée.\n\n` +
        `📋 *Tâche :* ${params.taskTitle}\n` +
        `📅 *Échéance :* ${formattedDueDate}\n` +
        `${params.linkedName ? `🔗 *Lié à :* ${params.linkedName}\n` : ''}` +
        `\n💡 *Action requise :*\n` +
        `Merci de compléter cette tâche avant la date d'échéance.\n\n` +
        `_Créé par ${params.createdBy}_`;

      await sendWhatsAppNotification({
        userId: params.userId,
        phone: user.phone,
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

      console.log(`[NotificationCreator] WhatsApp sent for task to ${user.name}`);
    } else {
      console.log(`[NotificationCreator] No phone number for user ${params.userId}, skipping WhatsApp`);
    }
  } catch (error) {
    console.error('[NotificationCreator] Error sending WhatsApp for task:', error);
    // Don't fail the notification creation if WhatsApp fails
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
