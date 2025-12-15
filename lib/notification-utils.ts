import { 
  Calendar, 
  FileText, 
  Flag, 
  DollarSign, 
  Bell, 
  CheckCircle2, 
  Upload, 
  UserPlus,
  StickyNote,
  AlertCircle
} from 'lucide-react';
import { NotificationType, NotificationIconConfig } from '@/types/notification';

/**
 * Get icon configuration for notification type
 */
export function getNotificationIcon(type: NotificationType): NotificationIconConfig {
  const iconMap: Record<NotificationType, NotificationIconConfig> = {
    rdv_created: {
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    rdv_updated: {
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    rdv_reminder: {
      icon: Bell,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    },
    devis_created: {
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    devis_updated: {
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    stage_changed: {
      icon: Flag,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    payment_received: {
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    note_added: {
      icon: StickyNote,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10'
    },
    task_assigned: {
      icon: CheckCircle2,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10'
    },
    task_due_soon: {
      icon: AlertCircle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    document_uploaded: {
      icon: Upload,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    },
    client_assigned: {
      icon: UserPlus,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    }
  };

  return iconMap[type] || {
    icon: Bell,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10'
  };
}

/**
 * Format notification time (relative)
 */
export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(notifications: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "Cette semaine": [],
    "Plus ancien": []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  notifications.forEach(notif => {
    const notifDate = new Date(notif.createdAt);
    const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

    if (notifDay.getTime() === today.getTime()) {
      groups["Aujourd'hui"].push(notif);
    } else if (notifDay.getTime() === yesterday.getTime()) {
      groups["Hier"].push(notif);
    } else if (notifDate >= weekAgo) {
      groups["Cette semaine"].push(notif);
    } else {
      groups["Plus ancien"].push(notif);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

/**
 * Get notification link based on type and metadata
 */
export function getNotificationLink(notification: any): string | undefined {
  if (!notification.linkedId) return undefined;

  switch (notification.linkedType) {
    case 'client':
      return `/clients/${notification.linkedId}`;
    case 'lead':
      return `/?leadId=${notification.linkedId}`;
    case 'appointment':
      return `/calendrier?appointmentId=${notification.linkedId}`;
    case 'task':
      return `/tasks?taskId=${notification.linkedId}`;
    default:
      return undefined;
  }
}

/**
 * Determine if notification should show toast based on priority and context
 */
export function shouldShowToast(
  type: NotificationType,
  priority: string,
  currentPath: string,
  linkedId?: string
): boolean {
  // Don't show toast if user is already on the related page (but only for specific linkedIds)
  if (linkedId && linkedId !== 'test-client-id' && currentPath.includes(linkedId)) {
    console.log('[shouldShowToast] Skipping - user on related page:', { linkedId, currentPath });
    return false;
  }

  // Always show high priority notifications
  if (priority === 'high') {
    console.log('[shouldShowToast] Showing - high priority');
    return true;
  }

  // Show toast for medium priority important notifications
  if (priority === 'medium' && (
    type === 'rdv_created' || 
    type === 'rdv_reminder' || 
    type === 'rdv_updated' ||
    type === 'task_assigned' ||
    type === 'task_due_soon' ||
    type === 'stage_changed' ||
    type === 'devis_created'
  )) {
    console.log('[shouldShowToast] Showing - medium priority important type:', type);
    return true;
  }

  // Show low priority for critical types
  if (priority === 'low' && (
    type === 'rdv_reminder' || 
    type === 'task_due_soon'
  )) {
    console.log('[shouldShowToast] Showing - low priority critical type:', type);
    return true;
  }

  console.log('[shouldShowToast] Not showing - filtered out:', { type, priority });
  return false;
}

/**
 * Get formatted stage change data for better readability
 */
export function getStageChangeData(notification: any): { projectName: string; previousLabel: string; newLabel: string } | null {
  if (notification.type !== 'stage_changed') {
    return null;
  }

  // Try to get stage labels from metadata
  const previousLabel = notification.metadata?.previousStageLabel || notification.metadata?.previousStage || 'Inconnu';
  const newLabel = notification.metadata?.newStageLabel || notification.metadata?.newStage || 'Inconnu';
  
  // Extract project/client name from message (format: "ProjectName\nPrevious → New")
  const lines = notification.message.split('\n');
  const projectName = lines[0] || notification.linkedName || 'Client';

  return {
    projectName,
    previousLabel,
    newLabel,
  };
}
