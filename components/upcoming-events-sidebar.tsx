'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface UpcomingEventsSidebarProps {
  events: CalendarEventWithDetails[];
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
}

export function UpcomingEventsSidebar({ events, isOpen, onClose, onEventClick }: UpcomingEventsSidebarProps) {
  const upcomingEvents = events
    .filter(event => !isPast(new Date(event.endDate)))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEE d MMM', { locale: fr });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-80 bg-background border-l border-border/40 shadow-2xl z-50"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/20 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base text-foreground">Prochains événements</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Events List */}
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-3 space-y-2">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-xs">Aucun événement à venir</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                  const startDate = new Date(event.startDate);
                  const endDate = new Date(event.endDate);
                  const cleanTitle = event.title.replace(/^\[TÂCHE\]\s*/, '');

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => onEventClick(event)}
                      className={`
                        relative p-3 rounded-lg cursor-pointer transition-all duration-150
                        ${eventConfig.chipBg}
                        border-l-4 ${eventConfig.borderColor}
                        hover:shadow-md
                      `}
                    >
                      {/* Date Label */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {getDateLabel(startDate)}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${eventConfig.chipBg} ${eventConfig.chipText} font-medium`}>
                          {eventConfig.label}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className={`text-sm font-semibold mb-2 line-clamp-2 ${eventConfig.chipText}`}>
                        {cleanTitle}
                      </h3>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="font-medium">
                          {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                        </span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1 font-medium">{event.location}</span>
                        </div>
                      )}

                      {/* Assigned To */}
                      {event.assignedToName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{event.assignedToName}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
