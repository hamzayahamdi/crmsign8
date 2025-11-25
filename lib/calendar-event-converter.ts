import { Task } from '@/types/task';
import { CalendarEventWithDetails, EventType } from '@/types/calendar';
import { Payment } from '@/types/payment';
import { Devis } from '@/types/devis';

/**
 * Converts a Task to a CalendarEvent
 * This allows tasks to appear on the calendar with unified event handling
 */
export function taskToCalendarEvent(
  task: Task,
  userName?: string
): Partial<CalendarEventWithDetails> {
  return {
    id: `task-${task.id}`,
    title: `[TÂCHE] ${task.title}`,
    description: task.description,
    startDate: task.dueDate,
    endDate: task.dueDate,
    eventType: 'tache' as EventType,
    assignedTo: task.assignedTo,
    assignedToName: userName,
    participants: task.participants || [task.assignedTo, task.createdBy],
    visibility: 'team' as const,
    createdBy: task.createdBy,
    createdByName: 'System',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    linkedId: task.linkedId,
    linkedType: task.linkedType as any,
    linkedName: task.linkedName,
    reminderType: 'none' as const,
    reminderSent: false,
  };
}

/**
 * Converts a Payment to a CalendarEvent
 */
export function paymentToCalendarEvent(
  payment: Payment,
  creatorName?: string
): Partial<CalendarEventWithDetails> {
  return {
    id: `payment-${payment.id}`,
    title: `💰 Paiement reçu - ${payment.montant}€`,
    description: payment.description || `Paiement reçu via ${payment.methode}`,
    startDate: payment.date,
    endDate: payment.date,
    eventType: 'paiement' as EventType,
    assignedTo: payment.createdBy,
    participants: [payment.createdBy],
    visibility: 'team' as const,
    createdBy: payment.createdBy,
    createdByName: creatorName || 'System',
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    linkedClientId: payment.clientId,
    reminderType: 'none' as const,
    reminderSent: false,
  };
}

/**
 * Converts a Devis to a CalendarEvent
 */
export function devisToCalendarEvent(
  devis: Devis,
  creatorName?: string
): Partial<CalendarEventWithDetails> {
  const statusMap = {
    en_attente: '⏳ En attente',
    accepte: '✅ Accepté',
    refuse: '❌ Refusé',
    en_cours: '🔄 En cours',
  };

  const statusLabel = statusMap[devis.statut as keyof typeof statusMap] || devis.statut;

  return {
    id: `devis-${devis.id}`,
    title: `${statusLabel} - Devis ${devis.title}`,
    description: devis.description || `Montant: ${devis.montant}€`,
    startDate: devis.date,
    endDate: devis.date,
    eventType: 'devis' as EventType,
    assignedTo: devis.createdBy,
    participants: [devis.createdBy],
    visibility: 'team' as const,
    createdBy: devis.createdBy,
    createdByName: creatorName || 'System',
    createdAt: devis.createdAt,
    updatedAt: devis.updatedAt,
    linkedClientId: devis.clientId,
    reminderType: 'none' as const,
    reminderSent: false,
  };
}

/**
 * Merges calendar events with tasks and payments
 * Creates a unified event stream for the calendar
 */
export function mergeCalendarEvents(
  calendarEvents: CalendarEventWithDetails[],
  tasks: (Task & { createdByName?: string; assignedToName?: string })[] = [],
  payments: (Payment & { createdByName?: string })[] = [],
  devis: (Devis & { createdByName?: string })[] = []
): CalendarEventWithDetails[] {
  const merged: CalendarEventWithDetails[] = [];

  // Add calendar events
  merged.push(...calendarEvents);

  // Add tasks as events
  tasks.forEach((task) => {
    const taskEvent = taskToCalendarEvent(task, task.assignedToName);
    merged.push(taskEvent as CalendarEventWithDetails);
  });

  // Add payments as events
  payments.forEach((payment) => {
    const paymentEvent = paymentToCalendarEvent(payment, payment.createdByName);
    merged.push(paymentEvent as CalendarEventWithDetails);
  });

  // Add devis as events
  devis.forEach((d) => {
    const devisEvent = devisToCalendarEvent(d, d.createdByName);
    merged.push(devisEvent as CalendarEventWithDetails);
  });

  // Sort by start date
  return merged.sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}
