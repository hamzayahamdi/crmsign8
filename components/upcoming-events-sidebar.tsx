'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface UpcomingEventsSidebarProps {
  events: CalendarEventWithDetails[];
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
  isLoading?: boolean;
}

export function UpcomingEventsSidebar({ events, isOpen, onClose, onEventClick, isLoading = false }: UpcomingEventsSidebarProps) {
  // Filter upcoming events - show events that haven't ended yet
  const upcomingEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }

    const now = new Date();
    const nowTime = now.getTime();
    
    const filtered = events
      .filter(event => {
        if (!event || !event.endDate) {
          return false;
        }

        try {
          // Handle both string and Date objects
          const endDate = event.endDate instanceof Date 
            ? event.endDate 
            : new Date(event.endDate);
          
          // Check if date is valid
          if (isNaN(endDate.getTime())) {
            console.warn('[UpcomingEventsSidebar] Invalid date:', event.endDate, 'for event:', event.title);
            return false;
          }

          const endTime = endDate.getTime();
          
          // Include events that haven't ended yet (endDate is after current time)
          // Add a small buffer (1 minute) to account for events that just ended
          const isUpcoming = endTime > (nowTime - 60000); // 1 minute buffer
          
          return isUpcoming;
        } catch (error) {
          console.error('[UpcomingEventsSidebar] Error parsing date:', event.endDate, error, 'Event:', event.title);
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = a.startDate instanceof Date 
            ? a.startDate.getTime() 
            : new Date(a.startDate).getTime();
          const dateB = b.startDate instanceof Date 
            ? b.startDate.getTime() 
            : new Date(b.startDate).getTime();
          
          if (isNaN(dateA) || isNaN(dateB)) {
            return 0;
          }
          
          return dateA - dateB;
        } catch (error) {
          return 0;
        }
      })
      .slice(0, 10);
    
    // Debug logging to help diagnose issues
    console.log('[UpcomingEventsSidebar] Processing events:', {
      totalEvents: events.length,
      filteredUpcoming: filtered.length,
      currentTime: now.toISOString(),
      isLoading
    });
    
    if (filtered.length === 0 && events.length > 0 && !isLoading) {
      console.log('[UpcomingEventsSidebar] No upcoming events found. Analyzing sample events:');
      events.slice(0, 5).forEach((event, idx) => {
        try {
          const endDate = event.endDate instanceof Date 
            ? event.endDate 
            : new Date(event.endDate);
          const endTime = endDate.getTime();
          const isUpcoming = endTime > (nowTime - 60000);
          
          console.log(`[UpcomingEventsSidebar] Event ${idx + 1}:`, {
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            endDateParsed: endDate.toISOString(),
            endTime,
            nowTime,
            timeDiff: endTime - nowTime,
            isUpcoming,
            isValid: !isNaN(endDate.getTime())
          });
        } catch (err) {
          console.error(`[UpcomingEventsSidebar] Error analyzing event ${idx + 1}:`, err);
        }
      });
    }
    
    return filtered;
  }, [events, isLoading]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEE d MMM', { locale: fr });
  };

  // Enhanced Skeleton loader component
  const EventSkeleton = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 animate-pulse"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="h-2.5 w-16 bg-muted-foreground/15 rounded-full"></div>
        <div className="h-5 w-20 bg-muted-foreground/15 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-muted-foreground/15 rounded"></div>
        <div className="h-3.5 w-3/4 bg-muted-foreground/15 rounded"></div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <div className="h-3 w-3 bg-muted-foreground/15 rounded"></div>
        <div className="h-2.5 w-24 bg-muted-foreground/15 rounded"></div>
      </div>
    </motion.div>
  );

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
              {isLoading ? (
                <div className="space-y-3">
                  {/* Enhanced Loading State */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-10"
                  >
                    <div className="relative mb-5">
                      {/* Glowing background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 rounded-full blur-2xl animate-pulse"></div>
                      {/* Spinner */}
                      <div className="relative">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" strokeWidth={2.5} />
                      </div>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Chargement des événements...
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xs text-muted-foreground/70 mt-1"
                    >
                      Veuillez patienter
                    </motion.p>
                  </motion.div>
                  {/* Enhanced Skeleton Loaders */}
                  {[...Array(3)].map((_, index) => (
                    <motion.div
                      key={`skeleton-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <EventSkeleton />
                    </motion.div>
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="relative mb-4">
                    <Calendar className="h-12 w-12 mx-auto opacity-20" />
                  </div>
                  <p className="text-sm font-medium mb-1">Aucun événement à venir</p>
                  <p className="text-xs text-muted-foreground/70">
                    {events.length > 0 
                      ? 'Tous les événements sont passés' 
                      : 'Aucun événement trouvé'}
                  </p>
                </motion.div>
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
