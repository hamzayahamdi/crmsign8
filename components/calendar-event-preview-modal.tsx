'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, MapPin, Users, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CalendarEventPreviewModalProps {
  event: CalendarEventWithDetails | null;
  position: { x: number; y: number };
}

export function CalendarEventPreviewModal({
  event,
  position,
}: CalendarEventPreviewModalProps) {
  if (!event) return null;

  const config = EVENT_TYPE_CONFIG[event.eventType];
  
  // Only show participants for RDV types, NOT for tasks
  const isTaskType = config.category === 'TASKS' || 
                     event.eventType === 'tache' || 
                     event.eventType === 'suivi_projet';
  const showParticipants = !isTaskType;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const participantAvatars = (event.participantDetails || []).slice(0, 4);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.2 }}
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          className="
            w-96 rounded-xl border-2 border-border/30 bg-gradient-to-br from-background via-background to-muted/10 shadow-2xl backdrop-blur-xl
            overflow-hidden pointer-events-auto
          "
        >
          {/* Header with color gradient bar */}
          <div className={`h-2 w-full ${config.color} bg-gradient-to-r opacity-90`} />

          <div className="p-5 space-y-4">
            {/* Title & Badge */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-base font-bold line-clamp-2 flex-1">
                  {event.title.replace('[TÂCHE] ', '')}
                </h3>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${config.badgeColor} shadow-sm`}>
                  {config.badge}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">
                {format(new Date(event.startDate), 'dd MMM HH:mm', { locale: fr })} —{' '}
                {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate font-medium">{event.location}</span>
              </div>
            )}

            {/* Assigned To */}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Assigné:</span>
              <span className="font-semibold">{event.assignedToName || 'Non assigné'}</span>
            </div>

            {/* Participants - Only for RDV types */}
            {showParticipants && participantAvatars.length > 0 && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {participantAvatars.length + 1} participant{participantAvatars.length > 0 ? 's' : ''}
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {participantAvatars.map((participant) => (
                    <Avatar key={participant.id} className="h-7 w-7 border-2 border-background ring-1 ring-border shadow-md">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.email}`}
                      />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {(event.participantDetails || []).length > participantAvatars.length && (
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 text-white text-xs font-bold border-2 border-background ring-1 ring-border shadow-md">
                      +{(event.participantDetails || []).length - participantAvatars.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 line-clamp-3 border border-border/30">
                {event.description}
              </div>
            )}

            {/* Linked Lead/Client */}
            {(event.linkedClientName || event.linkedLeadName) && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                {event.linkedClientName && <span className="font-medium">Client: {event.linkedClientName}</span>}
                {event.linkedLeadName && <span className="font-medium">Lead: {event.linkedLeadName}</span>}
              </div>
            )}

            {/* Footer hint */}
            <div className="text-xs text-muted-foreground/80 pt-3 border-t border-border/30 text-center">
              💡 Cliquez pour voir les détails complets
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
