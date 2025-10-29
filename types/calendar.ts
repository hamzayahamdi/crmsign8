export type EventType = 'rendez_vous' | 'suivi_projet' | 'appel_reunion' | 'urgent';
export type ReminderType = 'min_15' | 'hour_1' | 'day_1' | 'none';

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
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CalendarEventWithDetails extends CalendarEvent {
  linkedClientName?: string;
  linkedLeadName?: string;
  linkedArchitectName?: string;
  assignedToName?: string;
}

export const EVENT_TYPE_CONFIG = {
  rendez_vous: {
    label: 'Rendez-vous client',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    chipBg: 'bg-blue-50 dark:bg-blue-500/15',
    chipText: 'text-blue-700 dark:text-blue-100',
    icon: '🟦'
  },
  suivi_projet: {
    label: 'Suivi projet',
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    chipBg: 'bg-green-50 dark:bg-green-500/15',
    chipText: 'text-green-700 dark:text-green-100',
    icon: '🟩'
  },
  appel_reunion: {
    label: 'Appel ou réunion',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    chipBg: 'bg-orange-50 dark:bg-orange-500/15',
    chipText: 'text-orange-700 dark:text-orange-100',
    icon: '🟧'
  },
  urgent: {
    label: 'Urgent / Délai critique',
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    chipBg: 'bg-red-50 dark:bg-red-500/15',
    chipText: 'text-red-700 dark:text-red-100',
    icon: '🟥'
  }
} as const;

export const REMINDER_TYPE_CONFIG = {
  'min_15': { label: '15 minutes avant', minutes: 15 },
  'hour_1': { label: '1 heure avant', minutes: 60 },
  'day_1': { label: '1 jour avant', minutes: 1440 },
  'none': { label: 'Aucun rappel', minutes: 0 }
} as const;
