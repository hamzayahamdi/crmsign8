/**
 * WhatsApp Notification Integration Examples
 * 
 * These are real-world examples showing how to integrate WhatsApp notifications
 * into your existing CRM features.
 */

import { sendWhatsAppNotification, formatPhoneForWhatsApp } from "@/lib/sendWhatsAppNotification";
import { prisma } from "@/lib/database";

// ============================================
// 📅 RDV (Appointment) Created
// ============================================

export async function notifyRDVCreated(rdvData: {
    id: string;
    clientName: string;
    architectId: string;
    architectPhone: string;
    date: Date;
    time: string;
    location?: string;
}) {
    // Format date nicely (e.g., "Vendredi 28 Nov.")
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    const formattedDate = rdvData.date.toLocaleDateString('fr-FR', dateOptions);
    const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Construct calendar link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signature8-sketch.vercel.app";
    const calendarLink = `${appUrl}/calendrier?event=${rdvData.id}`;

    await sendWhatsAppNotification({
        userId: rdvData.architectId,
        phone: formatPhoneForWhatsApp(rdvData.architectPhone),
        title: "Nouveau RDV Assigné",
        message: `📅 *Nouveau Rendez-vous Confirmé*\n\n` +
            `Bonjour,\n` +
            `Un nouveau rendez-vous a été ajouté à votre agenda.\n\n` +
            `📌 *RDV avec ${rdvData.clientName}*\n` +
            `───────────────\n` +
            `📆 *Date :* ${finalDate}\n` +
            `⏰ *Heure :* ${rdvData.time}\n` +
            `${rdvData.location ? `📍 *Lieu :* ${rdvData.location}\n` : ''}` +
            `\n🔗 *Voir dans l'agenda :*\n` +
            `${calendarLink}\n\n` +
            `💡 *Action requise :*\n` +
            `Merci de confirmer votre présence.`,
        type: "rdv_created",
        priority: "high",
        linkedType: "rdv",
        linkedId: rdvData.id,
        linkedName: rdvData.clientName,
        metadata: {
            date: rdvData.date.toISOString(),
            time: rdvData.time,
            location: rdvData.location,
        },
    });
}

// ============================================
// 📝 Task Assigned
// ============================================

export async function notifyTaskAssigned(taskData: {
    id: string;
    title: string;
    description?: string;
    assignedToId: string;
    assignedToPhone: string;
    dueDate: Date;
    linkedType?: string;
    linkedName?: string;
    assignedByName: string;
}) {
    const formattedDueDate = new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
    }).format(taskData.dueDate);

    await sendWhatsAppNotification({
        userId: taskData.assignedToId,
        phone: formatPhoneForWhatsApp(taskData.assignedToPhone),
        title: "Nouvelle tâche assignée",
        message: `📝 *Nouvelle Tâche*\n\n` +
            `📋 ${taskData.title}\n` +
            `${taskData.description ? `📄 ${taskData.description}\n` : ''}` +
            `⏰ Échéance: ${formattedDueDate}\n` +
            `👤 Assigné par: ${taskData.assignedByName}\n` +
            `${taskData.linkedName ? `🔗 Lié à: ${taskData.linkedName}\n` : ''}` +
            `\n✅ Accédez à vos tâches pour plus de détails`,
        type: "task_assigned",
        priority: "medium",
        linkedType: "task",
        linkedId: taskData.id,
        linkedName: taskData.title,
        metadata: {
            dueDate: taskData.dueDate.toISOString(),
            assignedBy: taskData.assignedByName,
            linkedType: taskData.linkedType,
            linkedName: taskData.linkedName,
        },
    });
}

// ============================================
// 💰 Payment Received (Acompte Reçu)
// ============================================

export async function notifyPaymentReceived(paymentData: {
    id: string;
    contactId: string;
    contactName: string;
    architectId: string;
    architectPhone: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
}) {
    const formattedAmount = new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
    }).format(paymentData.amount);

    await sendWhatsAppNotification({
        userId: paymentData.architectId,
        phone: formatPhoneForWhatsApp(paymentData.architectPhone),
        title: "Acompte reçu",
        message: `💰 *Paiement Reçu*\n\n` +
            `👤 Client: ${paymentData.contactName}\n` +
            `💵 Montant: ${formattedAmount}\n` +
            `💳 Méthode: ${paymentData.paymentMethod}\n` +
            `${paymentData.reference ? `📝 Référence: ${paymentData.reference}\n` : ''}` +
            `\n✅ Le paiement a été enregistré avec succès`,
        type: "payment_received",
        priority: "high",
        linkedType: "contact",
        linkedId: paymentData.contactId,
        linkedName: paymentData.contactName,
        metadata: {
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            reference: paymentData.reference,
            paymentId: paymentData.id,
        },
    });
}

// ============================================
// 🚀 Opportunity Created
// ============================================

export async function notifyOpportunityCreated(opportunityData: {
    id: string;
    titre: string;
    contactName: string;
    type: string;
    budget?: number;
    architectId: string;
    architectPhone: string;
    createdByName: string;
}) {
    const formattedBudget = opportunityData.budget
        ? new Intl.NumberFormat('fr-MA', {
            style: 'currency',
            currency: 'MAD',
        }).format(opportunityData.budget)
        : 'Non spécifié';

    await sendWhatsAppNotification({
        userId: opportunityData.architectId,
        phone: formatPhoneForWhatsApp(opportunityData.architectPhone),
        title: "Nouvelle opportunité",
        message: `🚀 *Nouvelle Opportunité*\n\n` +
            `📋 ${opportunityData.titre}\n` +
            `👤 Client: ${opportunityData.contactName}\n` +
            `🏠 Type: ${opportunityData.type}\n` +
            `💰 Budget: ${formattedBudget}\n` +
            `👨‍💼 Créé par: ${opportunityData.createdByName}\n` +
            `\n✅ Consultez les détails dans le CRM`,
        type: "stage_changed",
        priority: "medium",
        linkedType: "opportunite",
        linkedId: opportunityData.id,
        linkedName: opportunityData.titre,
        metadata: {
            contactName: opportunityData.contactName,
            type: opportunityData.type,
            budget: opportunityData.budget,
            createdBy: opportunityData.createdByName,
        },
    });
}

// ============================================
// 🔔 Stage Changed (Status Update)
// ============================================

export async function notifyStageChanged(stageData: {
    entityType: 'contact' | 'opportunity' | 'client';
    entityId: string;
    entityName: string;
    oldStage: string;
    newStage: string;
    userId: string;
    userPhone: string;
    changedByName: string;
}) {
    const stageLabels: Record<string, string> = {
        // Contact stages
        qualifie: 'Qualifié',
        prise_de_besoin: 'Prise de Besoin',
        acompte_recu: 'Acompte Reçu',
        perdu: 'Perdu',
        // Opportunity stages
        projet_accepte: 'Projet Accepté',
        gagnee: 'Gagnée',
        perdue: 'Perdue',
    };

    const oldLabel = stageLabels[stageData.oldStage] || stageData.oldStage;
    const newLabel = stageLabels[stageData.newStage] || stageData.newStage;

    await sendWhatsAppNotification({
        userId: stageData.userId,
        phone: formatPhoneForWhatsApp(stageData.userPhone),
        title: "Statut mis à jour",
        message: `🔔 *Changement de Statut*\n\n` +
            `📋 ${stageData.entityName}\n` +
            `📊 ${oldLabel} ➡️ ${newLabel}\n` +
            `👤 Modifié par: ${stageData.changedByName}\n` +
            `\n✅ Le statut a été mis à jour`,
        type: "stage_changed",
        priority: "medium",
        linkedType: stageData.entityType,
        linkedId: stageData.entityId,
        linkedName: stageData.entityName,
        metadata: {
            oldStage: stageData.oldStage,
            newStage: stageData.newStage,
            changedBy: stageData.changedByName,
            timestamp: new Date().toISOString(),
        },
    });
}

// ============================================
// 📄 Document Uploaded
// ============================================

export async function notifyDocumentUploaded(documentData: {
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
}) {
    await sendWhatsAppNotification({
        userId: documentData.recipientId,
        phone: formatPhoneForWhatsApp(documentData.recipientPhone),
        title: "Nouveau document",
        message: `📄 *Nouveau Document*\n\n` +
            `📁 ${documentData.name}\n` +
            `📂 Catégorie: ${documentData.category}\n` +
            `🔗 Lié à: ${documentData.linkedName}\n` +
            `👤 Ajouté par: ${documentData.uploadedByName}\n` +
            `\n✅ Consultez le document dans le CRM`,
        type: "document_uploaded",
        priority: "low",
        linkedType: documentData.linkedType,
        linkedId: documentData.linkedId,
        linkedName: documentData.linkedName,
        metadata: {
            documentId: documentData.id,
            documentName: documentData.name,
            documentType: documentData.type,
            category: documentData.category,
            uploadedBy: documentData.uploadedByName,
        },
    });
}

// ============================================
// 🔔 RDV Reminder (1 day before)
// ============================================

export async function notifyRDVReminder(rdvData: {
    id: string;
    title: string;
    clientName: string;
    date: Date;
    time: string;
    location?: string;
    userId: string;
    userPhone: string;
}) {
    const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(rdvData.date);

    await sendWhatsAppNotification({
        userId: rdvData.userId,
        phone: formatPhoneForWhatsApp(rdvData.userPhone),
        title: "Rappel RDV demain",
        message: `⏰ *Rappel de Rendez-vous*\n\n` +
            `📅 Demain: ${formattedDate}\n` +
            `🕐 Heure: ${rdvData.time}\n` +
            `👤 Client: ${rdvData.clientName}\n` +
            `${rdvData.location ? `📍 Lieu: ${rdvData.location}\n` : ''}` +
            `\n✅ N'oubliez pas votre rendez-vous!`,
        type: "rdv_reminder",
        priority: "high",
        linkedType: "rdv",
        linkedId: rdvData.id,
        linkedName: rdvData.clientName,
        metadata: {
            date: rdvData.date.toISOString(),
            time: rdvData.time,
            location: rdvData.location,
            reminderType: '1_day_before',
        },
    });
}

// ============================================
// 👤 Client Assigned to Architect
// ============================================

export async function notifyClientAssigned(assignmentData: {
    clientId: string;
    clientName: string;
    clientPhone?: string;
    architectId: string;
    architectPhone: string;
    architectName: string;
    assignedByName: string;
    projectType?: string;
}) {
    await sendWhatsAppNotification({
        userId: assignmentData.architectId,
        phone: formatPhoneForWhatsApp(assignmentData.architectPhone),
        title: "Nouveau client assigné",
        message: `👤 *Nouveau Client Assigné*\n\n` +
            `📋 ${assignmentData.clientName}\n` +
            `${assignmentData.projectType ? `🏠 Type: ${assignmentData.projectType}\n` : ''}` +
            `${assignmentData.clientPhone ? `📞 Tél: ${assignmentData.clientPhone}\n` : ''}` +
            `👨‍💼 Assigné par: ${assignmentData.assignedByName}\n` +
            `\n✅ Contactez votre nouveau client`,
        type: "client_assigned",
        priority: "high",
        linkedType: "client",
        linkedId: assignmentData.clientId,
        linkedName: assignmentData.clientName,
        metadata: {
            architectName: assignmentData.architectName,
            assignedBy: assignmentData.assignedByName,
            projectType: assignmentData.projectType,
        },
    });
}

// ============================================
// 📊 Devis Created
// ============================================

export async function notifyDevisCreated(devisData: {
    id: string;
    title: string;
    clientName: string;
    amount: number;
    clientId: string;
    architectId: string;
    architectPhone: string;
    createdByName: string;
}) {
    const formattedAmount = new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
    }).format(devisData.amount);

    await sendWhatsAppNotification({
        userId: devisData.architectId,
        phone: formatPhoneForWhatsApp(devisData.architectPhone),
        title: "Nouveau devis créé",
        message: `📊 *Nouveau Devis*\n\n` +
            `📋 ${devisData.title}\n` +
            `👤 Client: ${devisData.clientName}\n` +
            `💰 Montant: ${formattedAmount}\n` +
            `👨‍💼 Créé par: ${devisData.createdByName}\n` +
            `\n✅ Consultez le devis dans le CRM`,
        type: "devis_created",
        priority: "medium",
        linkedType: "devis",
        linkedId: devisData.id,
        linkedName: devisData.title,
        metadata: {
            amount: devisData.amount,
            clientName: devisData.clientName,
            createdBy: devisData.createdByName,
        },
    });
}

// ============================================
// 🎯 Complete Workflow Example
// ============================================

/**
 * Example: Complete Contact → Opportunity → Client Workflow
 * This shows how to integrate WhatsApp notifications throughout the entire flow
 */
export async function completeContactWorkflowExample() {
    // Step 1: Contact created from Lead
    const contact = await prisma.contact.create({
        data: {
            nom: "Ahmed Bennani",
            telephone: "+212612345678",
            email: "ahmed@example.com",
            ville: "Casablanca",
            architecteAssigne: "arch_123",
            tag: "prospect",
            status: "qualifie",
            createdBy: "user_123",
        },
    });

    // Notify architect about new contact
    await sendWhatsAppNotification({
        userId: "arch_123",
        phone: "+212698765432",
        title: "Nouveau contact créé",
        message: `👤 *Nouveau Contact*\n\n` +
            `📋 ${contact.nom}\n` +
            `📞 ${contact.telephone}\n` +
            `📍 ${contact.ville}\n` +
            `\n✅ Contactez-le pour la prise de besoin`,
        type: "stage_changed",
        priority: "high",
        linkedType: "contact",
        linkedId: contact.id,
        linkedName: contact.nom,
    });

    // Step 2: Prise de besoin completed
    await prisma.contact.update({
        where: { id: contact.id },
        data: { status: "prise_de_besoin" },
    });

    await notifyStageChanged({
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.nom,
        oldStage: "qualifie",
        newStage: "prise_de_besoin",
        userId: "arch_123",
        userPhone: "+212698765432",
        changedByName: "Mohammed Alami",
    });

    // Step 3: Acompte received
    const payment = await prisma.contactPayment.create({
        data: {
            contactId: contact.id,
            montant: 5000,
            methode: "virement",
            reference: "VIR-2025-001",
            createdBy: "user_123",
        },
    });

    await notifyPaymentReceived({
        id: payment.id,
        contactId: contact.id,
        contactName: contact.nom,
        architectId: "arch_123",
        architectPhone: "+212698765432",
        amount: 5000,
        paymentMethod: "Virement",
        reference: "VIR-2025-001",
    });

    // Step 4: Opportunity created
    const opportunity = await prisma.opportunity.create({
        data: {
            contactId: contact.id,
            titre: "Villa Moderne - Casablanca",
            type: "villa",
            statut: "open",
            pipelineStage: "projet_accepte",
            budget: 150000,
            architecteAssigne: "arch_123",
            createdBy: "user_123",
        },
    });

    await notifyOpportunityCreated({
        id: opportunity.id,
        titre: opportunity.titre,
        contactName: contact.nom,
        type: "Villa",
        budget: 150000,
        architectId: "arch_123",
        architectPhone: "+212698765432",
        createdByName: "Mohammed Alami",
    });

    // Step 5: Opportunity won → Contact becomes Client
    await prisma.opportunity.update({
        where: { id: opportunity.id },
        data: {
            statut: "won",
            pipelineStage: "gagnee",
        },
    });

    await prisma.contact.update({
        where: { id: contact.id },
        data: {
            tag: "client",
            clientSince: new Date(),
        },
    });

    await sendWhatsAppNotification({
        userId: "arch_123",
        phone: "+212698765432",
        title: "🎉 Opportunité gagnée!",
        message: `🎉 *Félicitations!*\n\n` +
            `✅ Opportunité gagnée: ${opportunity.titre}\n` +
            `👤 ${contact.nom} est maintenant un client!\n` +
            `💰 Budget: 150,000 MAD\n` +
            `\n🚀 Prochaine étape: Planifier le projet`,
        type: "stage_changed",
        priority: "high",
        linkedType: "opportunity",
        linkedId: opportunity.id,
        linkedName: opportunity.titre,
        metadata: {
            contactId: contact.id,
            contactName: contact.nom,
            becameClient: true,
            clientSince: new Date().toISOString(),
        },
    });

    console.log("✅ Complete workflow with WhatsApp notifications executed!");
}
