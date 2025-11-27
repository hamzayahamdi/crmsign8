'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarCheck,
  CheckSquare2,
  Phone,
  AlertCircle,
  Wallet,
  FileText,
  Clock,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarEventChipProps {
  event: CalendarEventWithDetails;
  onHover?: (event: CalendarEventWithDetails | null) => void;
  onClick?: (event: CalendarEventWithDetails) => void;
  isPreview?: boolean;
  isCompleted?: boolean;
  isOverdue?: boolean;
}

const IconMap: Record<string, any> = {
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  CheckSquare2,
  Phone,
  AlertCircle,
  Wallet,
  FileText,
  Clock,
};

export function CalendarEventChip({
  event,
  onHover,
  onClick,
  isPreview = false,
  isCompleted = false,
  isOverdue = false,
}: CalendarEventChipProps) {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  const IconComponent = IconMap[config.icon] || Clock;

  // Determine if we should show participants (ONLY for RDV types, NOT for tasks)
  const isTaskType = config.category === 'TASKS' ||
    event.eventType === 'tache' ||
    event.eventType === 'suivi_projet';
  const showParticipants = !isTaskType;

  // Check if event has multiple participants
  const hasParticipants = event.participantDetails && event.participantDetails.length > 0;
  const totalParticipants = hasParticipants ? event.participantDetails.length + 1 : 1; // +1 for assigned user

  const getStartTime = () => {
    try {
      const start = new Date(event.startDate);
      return format(start, 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  const getEndTime = () => {
    try {
      const end = new Date(event.endDate);
      return format(end, 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  const truncateTitle = (title: string, maxLength = 30) => {
    // Remove [TÂCHE] prefix if present for cleaner display
    const cleanTitle = title.replace(/^\[TÂCHE\]\s*/, '');
    if (cleanTitle.length > maxLength) {
      return cleanTitle.substring(0, maxLength) + '...';
    }
    return cleanTitle;
  };

  const participantAvatars = (event.participantDetails || []).slice(0, 2);
  const extraParticipants = Math.max(0, (event.participantDetails || []).length - 2);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => onHover?.(event)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(event)}
      className={`
        group relative cursor-pointer rounded-lg px-3 py-2 transition-all duration-200
        ${config.chipBg}
        border-l-[4px] ${config.borderColor}
        hover:shadow-lg hover:shadow-${config.borderColor.split('-')[1]}-500/20 hover:scale-[1.02] active:scale-[0.98]
        ${isPreview ? 'ring-2 ring-primary/30 ring-offset-1' : ''}
        ${isCompleted ? 'opacity-60 line-through grayscale' : ''}
        ${isOverdue ? 'ring-2 ring-red-400' : ''}
        ${hasParticipants && showParticipants ? 'border border-primary/20' : 'border border-transparent'}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Icon with improved styling */}
        <div className={`flex-shrink-0 ${config.chipText}`}>
          <div className={`p-1 rounded-md ${config.color} bg-opacity-15`}>
            <IconComponent className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className={`text-xs font-bold truncate ${config.chipText} leading-tight`}>
            {truncateTitle(event.title)}
          </div>
          {getStartTime() && (
            <div className={`text-[10px] font-medium mt-0.5 opacity-80 ${config.chipText} flex items-center gap-1`}>
              <Clock className="h-3 w-3 inline" />
              {getStartTime()}
            </div>
          )}
        </div>

        {/* Participant Badge - Only for RDV with participants */}
        {showParticipants && hasParticipants && (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5 border border-primary/20">
              <div className="flex -space-x-1.5">
                {participantAvatars.map((participant, idx) => (
                  <div
                    key={participant.id}
                    className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white border border-white dark:border-gray-800 shadow-sm"
                    style={{ zIndex: participantAvatars.length - idx }}
                    title={participant.name}
                  >
                    <span className="text-[8px] font-bold">
                      {getInitials(participant.name)}
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-primary ml-1">
                {totalParticipants}
              </span>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        {(isCompleted || isOverdue) && (
          <div className="flex-shrink-0 flex gap-1">
            {isCompleted && (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            )}
            {isOverdue && (
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
