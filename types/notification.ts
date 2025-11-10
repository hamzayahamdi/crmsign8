export type NotificationType =
  | 'rdv_created'
  | 'rdv_updated'
  | 'rdv_reminder'
  | 'devis_created'
  | 'devis_updated'
  | 'stage_changed'
  | 'payment_received'
  | 'note_added'
  | 'task_assigned'
  | 'task_due_soon'
  | 'document_uploaded'
  | 'client_assigned';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  linkedType?: string;
  linkedId?: string;
  linkedName?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationMetadata {
  clientId?: string;
  clientName?: string;
  appointmentDate?: string;
  devisAmount?: number;
  previousStage?: string;
  newStage?: string;
  location?: string;
  [key: string]: any;
}

export interface NotificationIconConfig {
  icon: any; // Lucide icon component
  color: string;
  bgColor: string;
}

export interface ToastNotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  link?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
