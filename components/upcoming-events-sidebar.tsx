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
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-80 glass border-l border-border/40 shadow-2xl z-50 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Prochains événements</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Events List */}
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 text-primary animate-pulse mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun événement à venir</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                  const startDate = new Date(event.startDate);
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onEventClick(event)}
                      className={`p-3 rounded-lg border-l-3 ${eventConfig.borderColor} ${eventConfig.bgLight} backdrop-blur-sm cursor-pointer transition-all hover:shadow-md`}
                    >
                      {/* Date Label */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {getDateLabel(startDate)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${eventConfig.color} text-white`}>
                          {eventConfig.icon}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-foreground">
                        {event.title}
                      </h3>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {format(startDate, 'HH:mm', { locale: fr })}
                          {event.endDate && ` - ${format(new Date(event.endDate), 'HH:mm', { locale: fr })}`}
                        </span>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}

                      {/* Assigned To */}
                      {event.assignedToName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{event.assignedToName}</span>
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
