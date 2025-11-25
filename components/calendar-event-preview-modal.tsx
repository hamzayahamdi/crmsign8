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
            w-80 rounded-lg border border-border/40 bg-background shadow-2xl
            overflow-hidden pointer-events-auto
          "
        >
          {/* Header with color bar */}
          <div className={`h-1 w-full ${config.color}`} />

          <div className="p-4 space-y-3">
            {/* Title & Badge */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold line-clamp-2">{event.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${config.badgeColor}`}>
                  {config.badge}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {format(new Date(event.startDate), 'dd MMM HH:mm', { locale: fr })} —{' '}
                {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
              </span>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {/* Assigned To */}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Assigné:</span>
              <span className="font-medium">{event.assignedToName || 'Non assigné'}</span>
            </div>

            {/* Participants */}
            {participantAvatars.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-muted-foreground">Participants:</span>
                <div className="flex gap-1.5">
                  {participantAvatars.map((participant) => (
                    <Avatar key={participant.id} className="h-6 w-6 border border-white/20 dark:border-gray-700">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.email}`}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {(event.participantDetails || []).length > participantAvatars.length && (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium">
                      +{(event.participantDetails || []).length - participantAvatars.length}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 line-clamp-3">
                {event.description}
              </div>
            )}

            {/* Linked Lead/Client */}
            {(event.linkedClientName || event.linkedLeadName) && (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 pt-2">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                {event.linkedClientName && <span>Client: {event.linkedClientName}</span>}
                {event.linkedLeadName && <span>Lead: {event.linkedLeadName}</span>}
              </div>
            )}

            {/* Footer hint */}
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/30">
              Cliquez pour voir les détails complets
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
