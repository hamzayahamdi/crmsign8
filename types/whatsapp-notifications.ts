/**
 * WhatsApp Notification Types
 * 
 * TypeScript type definitions for WhatsApp notifications
 */

import { NotificationType, NotificationPriority } from "@prisma/client";

/**
 * WhatsApp notification data structure
 */
export interface WhatsAppNotificationData {
    /** User ID to send notification to */
    userId: string;
    /** Phone number in international format (e.g., +212612345678) */
    phone: string;
    /** Notification title */
    title: string;
    /** WhatsApp message body */
    message: string;
    /** Notification type (must match NotificationType enum) */
    type: NotificationType;
    /** Priority level */
    priority?: NotificationPriority;
    /** Type of linked entity (e.g., "rdv", "task", "contact", "opportunity") */
    linkedType?: string;
    /** ID of the linked entity */
    linkedId?: string;
    /** Name/title of the linked entity */
    linkedName?: string;
    /** Additional metadata to store with the notification */
    metadata?: Record<string, any>;
}

/**
 * WhatsApp notification response
 */
export interface WhatsAppNotificationResponse {
    ok: boolean;
    whatsappSent?: boolean;
    apiResponse?: UltraMSGResponse;
    savedNotification?: SavedNotification;
    error?: string;
    details?: string;
}

/**
 * UltraMSG API response
 */
export interface UltraMSGResponse {
    sent?: boolean;
    message?: string;
    id?: string;
    error?: string;
    [key: string]: any;
}

/**
 * Saved notification from database
 */
export interface SavedNotification {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    isRead: boolean;
    linkedType: string | null;
    linkedId: string | null;
    linkedName: string | null;
    metadata: any;
    createdBy: string | null;
    createdAt: Date;
    readAt: Date | null;
}

/**
 * RDV notification data
 */
export interface RDVNotificationData {
    id: string;
    clientName: string;
    architectId: string;
    architectPhone: string;
    date: Date;
    time: string;
    location?: string;
}

/**
 * Task notification data
 */
export interface TaskNotificationData {
    id: string;
    title: string;
    description?: string;
    assignedToId: string;
    assignedToPhone: string;
    dueDate: Date;
    linkedType?: string;
    linkedName?: string;
    assignedByName: string;
}

/**
 * Payment notification data
 */
export interface PaymentNotificationData {
    id: string;
    contactId: string;
    contactName: string;
    architectId: string;
    architectPhone: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
}

/**
 * Opportunity notification data
 */
export interface OpportunityNotificationData {
    id: string;
    titre: string;
    contactName: string;
    type: string;
    budget?: number;
    architectId: string;
    architectPhone: string;
    createdByName: string;
}

/**
 * Stage change notification data
 */
export interface StageChangeNotificationData {
    entityType: 'contact' | 'opportunity' | 'client';
    entityId: string;
    entityName: string;
    oldStage: string;
    newStage: string;
    userId: string;
    userPhone: string;
    changedByName: string;
}

/**
 * Document notification data
 */
export interface DocumentNotificationData {
    id: string;
    name: string;
    type: string;
    category: string;
    linkedType: 'contact' | 'opportunity' | 'client';
    linkedId: string;
    linkedName: string;
    uploadedByName: string;
    recipientId: string;
    recipientPhone: string;
}

/**
 * Client assignment notification data
 */
export interface ClientAssignmentNotificationData {
    clientId: string;
    clientName: string;
    clientPhone?: string;
    architectId: string;
    architectPhone: string;
    architectName: string;
    assignedByName: string;
    projectType?: string;
}

/**
 * Devis notification data
 */
export interface DevisNotificationData {
    id: string;
    title: string;
    clientName: string;
    amount: number;
    clientId: string;
    architectId: string;
    architectPhone: string;
    createdByName: string;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
    title: string;
    message: (data: any) => string;
    type: NotificationType;
    priority: NotificationPriority;
}

/**
 * Notification templates for common scenarios
 */
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
    rdv_created: {
        title: "Nouveau RDV créé",
        message: (data: RDVNotificationData) =>
            `📅 *Nouveau Rendez-vous*\n\n` +
            `👤 Client: ${data.clientName}\n` +
            `📆 Date: ${data.date}\n` +
            `🕐 Heure: ${data.time}\n` +
            `${data.location ? `📍 Lieu: ${data.location}\n` : ''}` +
            `\n✅ Confirmez votre présence`,
        type: "rdv_created",
        priority: "high",
    },

    task_assigned: {
        title: "Nouvelle tâche assignée",
        message: (data: TaskNotificationData) =>
            `📝 *Nouvelle Tâche*\n\n` +
            `📋 ${data.title}\n` +
            `${data.description ? `📄 ${data.description}\n` : ''}` +
            `⏰ Échéance: ${data.dueDate}\n` +
            `👤 Assigné par: ${data.assignedByName}\n` +
            `\n✅ Accédez à vos tâches pour plus de détails`,
        type: "task_assigned",
        priority: "medium",
    },

    payment_received: {
        title: "Acompte reçu",
        message: (data: PaymentNotificationData) =>
            `💰 *Paiement Reçu*\n\n` +
            `👤 Client: ${data.contactName}\n` +
            `💵 Montant: ${data.amount} MAD\n` +
            `💳 Méthode: ${data.paymentMethod}\n` +
            `${data.reference ? `📝 Référence: ${data.reference}\n` : ''}` +
            `\n✅ Le paiement a été enregistré avec succès`,
        type: "payment_received",
        priority: "high",
    },

    opportunity_created: {
        title: "Nouvelle opportunité",
        message: (data: OpportunityNotificationData) =>
            `🚀 *Nouvelle Opportunité*\n\n` +
            `📋 ${data.titre}\n` +
            `👤 Client: ${data.contactName}\n` +
            `🏠 Type: ${data.type}\n` +
            `${data.budget ? `💰 Budget: ${data.budget} MAD\n` : ''}` +
            `👨‍💼 Créé par: ${data.createdByName}\n` +
            `\n✅ Consultez les détails dans le CRM`,
        type: "stage_changed",
        priority: "medium",
    },
};

/**
 * Stage labels for French display
 */
export const STAGE_LABELS: Record<string, string> = {
    // Contact stages
    qualifie: 'Qualifié',
    prise_de_besoin: 'Prise de Besoin',
    acompte_recu: 'Acompte Reçu',
    perdu: 'Perdu',

    // Opportunity stages
    projet_accepte: 'Projet Accepté',
    gagnee: 'Gagnée',
    perdue: 'Perdue',
    on_hold: 'En Attente',

    // Client stages
    conception: 'Conception',
    devis_negociation: 'Devis/Négociation',
    accepte: 'Accepté',
    refuse: 'Refusé',
    en_chantier: 'En Chantier',
    livraison: 'Livraison',
    termine: 'Terminé',
};

/**
 * Notification type labels
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
    rdv_created: "RDV Créé",
    rdv_updated: "RDV Mis à Jour",
    rdv_reminder: "Rappel RDV",
    devis_created: "Devis Créé",
    devis_updated: "Devis Mis à Jour",
    stage_changed: "Changement de Statut",
    payment_received: "Paiement Reçu",
    note_added: "Note Ajoutée",
    task_assigned: "Tâche Assignée",
    task_due_soon: "Tâche Bientôt Due",
    document_uploaded: "Document Ajouté",
    client_assigned: "Client Assigné",
};

/**
 * Priority icons
 */
export const PRIORITY_ICONS: Record<NotificationPriority, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
};
