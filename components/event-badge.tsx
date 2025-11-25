'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { Clock, CheckSquare, Phone, AlertCircle } from 'lucide-react';

interface EventBadgeProps {
  event: CalendarEventWithDetails;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const iconMap = {
  Clock: <Clock className="w-4 h-4" />,
  CheckSquare: <CheckSquare className="w-4 h-4" />,
  Phone: <Phone className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />
};

export function EventBadge({ event, size = 'md', showIcon = true }: EventBadgeProps) {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  const isTaskEvent = event.title.startsWith('[TÂCHE]');
  
  // Déterminer le badge à afficher
  const badge = isTaskEvent ? 'Tâche' : config.badge;
  const iconKey = (isTaskEvent ? 'CheckSquare' : config.iconLucide) as keyof typeof iconMap;
  const icon = iconMap[iconKey];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`
      inline-flex items-center rounded-full font-semibold
      ${config.badgeColor}
      ${sizeClasses[size]}
      whitespace-nowrap shadow-sm
    `}>
      {showIcon && icon && (
        <span className={iconSizeClasses[size]}>
          {icon}
        </span>
      )}
      <span className="truncate">{badge}</span>
    </span>
  );
}

/**
 * Affiche le badge de type d'événement avec styling professional
 */
export function EventTypeTag({ eventType, isTask = false }: { eventType: string; isTask?: boolean }) {
  const config = EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG];
  
  if (!config) return null;
  
  const displayBadge = isTask ? 'Tâche' : config.badge;
  const iconKey = (isTask ? 'CheckSquare' : config.iconLucide) as keyof typeof iconMap;
  const icon = iconMap[iconKey];

  return (
    <div className={`
      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
      ${config.badgeColor} shadow-md
    `}>
      {icon && (
        <span className="w-4 h-4 flex items-center justify-center">
          {icon}
        </span>
      )}
      {displayBadge}
    </div>
  );
}
