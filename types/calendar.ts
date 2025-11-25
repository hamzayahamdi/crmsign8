export type EventType = 'rendez_vous' | 'suivi_projet' | 'appel_reunion' | 'urgent' | 'tache' | 'paiement' | 'devis' | 'interne';
export type ReminderType = 'min_5' | 'min_30' | 'hour_1' | 'day_1' | 'none';
export type EventVisibility = 'private' | 'team' | 'all';
export type EventCategory = 'RDV' | 'TASKS' | 'PAYMENTS' | 'DEVIS' | 'INTERNAL';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  eventType: EventType;
  assignedTo: string;
  location?: string;
  reminderType: ReminderType;
  reminderSent: boolean;
  linkedClientId?: string;
  linkedLeadId?: string;
  linkedArchitectId?: string;
  participants: string[]; // Array of user IDs
  visibility: EventVisibility;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ParticipantDetails {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CalendarEventWithDetails extends CalendarEvent {
  linkedClientName?: string;
  linkedLeadName?: string;
  linkedArchitectName?: string;
  assignedToName?: string;
  createdByName?: string;
  participantDetails?: ParticipantDetails[];
}

export const EVENT_TYPE_CONFIG = {
  rendez_vous: {
    label: 'Rendez-vous client',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    chipBg: 'bg-blue-50 dark:bg-blue-950/30',
    chipText: 'text-blue-700 dark:text-blue-300',
    icon: 'CalendarClock',
    badge: 'RDV',
    badgeColor: 'bg-blue-500 text-white',
    accentColor: 'from-blue-500 to-blue-600',
    category: 'RDV'
  },
  suivi_projet: {
    label: 'Suivi projet',
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    chipBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    chipText: 'text-emerald-700 dark:text-emerald-300',
    icon: 'CheckSquare',
    badge: 'Suivi',
    badgeColor: 'bg-emerald-500 text-white',
    accentColor: 'from-emerald-500 to-emerald-600',
    category: 'TASKS'
  },
  tache: {
    label: 'Tâche',
    color: 'bg-[#32d48e]',
    borderColor: 'border-[#32d48e]',
    textColor: 'text-[#2ab578]',
    bgLight: 'bg-[#32d48e]/10 dark:bg-[#32d48e]/20',
    chipBg: 'bg-[#32d48e]/10 dark:bg-[#32d48e]/20',
    chipText: 'text-[#1a8f5c] dark:text-[#32d48e]',
    icon: 'CheckSquare',
    badge: 'Tâche',
    badgeColor: 'bg-[#32d48e] text-white',
    accentColor: 'from-[#32d48e] to-[#2ab578]',
    category: 'TASKS'
  },
  appel_reunion: {
    label: 'Appel ou réunion',
    color: 'bg-blue-400',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-900/20',
    chipBg: 'bg-blue-50 dark:bg-blue-900/20',
    chipText: 'text-blue-700 dark:text-blue-300',
    icon: 'Phone',
    badge: 'Appel',
    badgeColor: 'bg-blue-400 text-white',
    accentColor: 'from-blue-400 to-blue-500',
    category: 'RDV'
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50 dark:bg-red-950/30',
    chipBg: 'bg-red-50 dark:bg-red-950/30',
    chipText: 'text-red-700 dark:text-red-300',
    icon: 'AlertCircle',
    badge: 'Urgent',
    badgeColor: 'bg-red-500 text-white',
    accentColor: 'from-red-500 to-red-600',
    category: 'RDV'
  },
  paiement: {
    label: 'Paiement',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50 dark:bg-orange-950/30',
    chipBg: 'bg-orange-50 dark:bg-orange-950/30',
    chipText: 'text-orange-700 dark:text-orange-300',
    icon: 'Wallet',
    badge: 'Paiement',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600',
    category: 'PAYMENTS'
  },
  devis: {
    label: 'Devis',
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
    chipBg: 'bg-purple-50 dark:bg-purple-950/30',
    chipText: 'text-purple-700 dark:text-purple-300',
    icon: 'FileText',
    badge: 'Devis',
    badgeColor: 'bg-purple-500 text-white',
    accentColor: 'from-purple-500 to-purple-600',
    category: 'DEVIS'
  },
  interne: {
    label: 'Événement interne',
    color: 'bg-gray-500',
    borderColor: 'border-gray-500',
    textColor: 'text-gray-600',
    bgLight: 'bg-gray-50 dark:bg-gray-950/30',
    chipBg: 'bg-gray-50 dark:bg-gray-950/30',
    chipText: 'text-gray-700 dark:text-gray-300',
    icon: 'Clock',
    badge: 'Interne',
    badgeColor: 'bg-gray-500 text-white',
    accentColor: 'from-gray-500 to-gray-600',
    category: 'INTERNAL'
  }
} as const;

export const REMINDER_TYPE_CONFIG = {
  'min_5': { label: '5 minutes avant', minutes: 5 },
  'min_30': { label: '30 minutes avant', minutes: 30 },
  'hour_1': { label: '1 heure avant', minutes: 60 },
  'day_1': { label: '1 jour avant', minutes: 1440 },
  'none': { label: 'Aucun rappel', minutes: 0 }
} as const;

// Notification preferences interface
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  email?: string;
}

/**
 * Récupère le badge visuel pour un événement basé sur son type
 * Utile pour identifier rapidement si c'est une tâche, RDV, etc.
 */
export function getEventBadge(title: string, eventType: EventType): string {
  const config = EVENT_TYPE_CONFIG[eventType];

  // Si le titre commence par [TÂCHE], c'est une tâche automatique liée à une task
  if (title.startsWith('[TÂCHE]')) {
    return '✅ Tâche';
  }

  return config.badge || eventType;
}
