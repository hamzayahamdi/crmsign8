'use client';

import { useState, useMemo } from 'react';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { EventBadge } from '@/components/event-badge';
import { CalendarEventChip } from '@/components/calendar-event-chip';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  isWithinInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, Clock, CheckSquare, Phone, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface CalendarViewProps {
  events: CalendarEventWithDetails[];
  viewMode: 'month' | 'week' | 'day';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
}

export function CalendarView({
  events,
  viewMode,
  currentDate,
  onDateChange,
  onDateClick,
  onEventClick
}: CalendarViewProps) {

  const handlePrevious = () => {
    if (viewMode === 'month') {
      onDateChange(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onDateChange(addDays(currentDate, -7));
    } else {
      onDateChange(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      onDateChange(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onDateChange(addDays(currentDate, 7));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: fr });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`;
    } else {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 md:mb-4 pb-2 md:pb-3 border-b border-border/40 gap-2 md:gap-0">
        <div className="flex items-center justify-between md:justify-start gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-4">
            Aujourd'hui
          </Button>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-8 w-8 md:h-9 md:w-9">
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 md:h-9 md:w-9">
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
        <h2 className="text-base md:text-lg font-semibold capitalize text-foreground text-center md:text-left">{getHeaderTitle()}</h2>
        <div className="hidden md:block w-32" />
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <MonthView
          events={events}
          currentDate={currentDate}
          onDateClick={onDateClick}
          onEventClick={onEventClick}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          events={events}
          currentDate={currentDate}
          onDateClick={onDateClick}
          onEventClick={onEventClick}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          events={events}
          currentDate={currentDate}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

// Month View Component
function MonthView({
  events,
  currentDate,
  onDateClick,
  onEventClick
}: {
  events: CalendarEventWithDetails[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const weekDaysMobile = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(dayEnd, { start: eventStart, end: eventEnd });
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/40 rounded-t-lg overflow-hidden">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className="bg-gradient-to-b from-muted/50 to-muted/20 p-1.5 md:p-3 text-center text-[10px] md:text-xs font-bold text-foreground/70 uppercase tracking-wider md:tracking-widest"
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{weekDaysMobile[idx]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/40 rounded-b-lg overflow-hidden flex-1">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const hasEvents = dayEvents.length > 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.005 }}
              onClick={() => onDateClick(day)}
              className={`
                bg-card p-1 md:p-2.5 min-h-[70px] md:min-h-[130px] cursor-pointer
                transition-all duration-200
                ${isTodayDate ? 'bg-gradient-to-br from-primary/5 to-primary/10 ring-1 md:ring-2 ring-primary/20 shadow-md' : ''}
                ${hasEvents && !isTodayDate ? 'hover:shadow-md hover:bg-accent/40' : ''}
                ${!isCurrentMonth ? 'opacity-30 bg-muted/20' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <div className={`
                  text-xs md:text-sm font-bold mb-1 md:mb-2 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-md md:rounded-lg
                  ${isTodayDate
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg'
                    : 'text-foreground/70 hover:bg-muted/50'
                  }
                  transition-colors
                `}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5 md:space-y-1.5 flex-1 overflow-hidden">
                  {/* Mobile: Show dots for events */}
                  <div className="md:hidden flex flex-wrap gap-1">
                    {dayEvents.slice(0, 4).map((event) => {
                      const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          className={`w-4 h-4 rounded-full ${eventConfig.color} cursor-pointer hover:scale-125 active:scale-110 transition-transform shadow-sm`}
                          title={event.title}
                        />
                      );
                    })}
                  </div>

                  {/* Desktop: Show event chips */}
                  <div className="hidden md:block space-y-1.5">
                    {dayEvents.slice(0, 3).map((event, eventIdx) => (
                      <div key={event.id} onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}>
                        <CalendarEventChip event={event} />
                      </div>
                    ))}
                  </div>

                  {dayEvents.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] md:text-xs text-muted-foreground pl-0.5 md:pl-1.5 font-semibold hidden md:block"
                    >
                      +{dayEvents.length - 3} {dayEvents.length - 3 === 1 ? 'autre' : 'autres'}
                    </motion.div>
                  )}

                  {/* Mobile: Show count if more than 4 events */}
                  {dayEvents.length > 4 && (
                    <div className="md:hidden text-[9px] text-muted-foreground font-semibold mt-0.5">
                      +{dayEvents.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  events,
  currentDate,
  onDateClick,
  onEventClick
}: {
  events: CalendarEventWithDetails[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(dayEnd, { start: eventStart, end: eventEnd });
    });
  };

  return (
    <div className="flex gap-2 md:gap-2.5 flex-1 overflow-x-auto pb-2 md:pb-0">
      {weekDays.map((day, dayIdx) => {
        const dayEvents = getEventsForDay(day);
        const isTodayDate = isToday(day);

        return (
          <motion.div
            key={day.toString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIdx * 0.05 }}
            onClick={() => onDateClick(day)}
            className={`
              flex flex-col bg-card rounded-xl border-2 p-2 md:p-3 cursor-pointer min-w-[100px] md:min-w-0 flex-1
              transition-all duration-200
              ${isTodayDate
                ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg'
                : 'border-border/40 hover:border-primary/30 hover:shadow-md'
              }
            `}
          >
            <div className={`
              text-center mb-2 md:mb-3 pb-2 md:pb-3 border-b-2
              ${isTodayDate ? 'border-primary/30' : 'border-border/20'}
            `}>
              <div className="text-[10px] md:text-xs font-bold uppercase mb-1 md:mb-1.5 text-muted-foreground">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={`
                text-xl md:text-3xl font-bold inline-flex items-center justify-center w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl
                transition-all
                ${isTodayDate
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg'
                  : 'text-foreground hover:bg-muted/50'
                }
              `}>
                {format(day, 'd')}
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5 md:pr-1">
              {dayEvents.length === 0 ? (
                <div className="text-[10px] md:text-xs text-muted-foreground/50 text-center py-2 md:py-4">
                  Aucun événement
                </div>
              ) : (
                dayEvents.map((event, eventIdx) => (
                  <div key={event.id} onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}>
                    <CalendarEventChip event={event} />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Day View Component
function DayView({
  events,
  currentDate,
  onEventClick
}: {
  events: CalendarEventWithDetails[];
  currentDate: Date;
  onEventClick: (event: CalendarEventWithDetails) => void;
}) {
  const dayEvents = events.filter(event =>
    isSameDay(new Date(event.startDate), currentDate)
  ).sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      rendez_vous: <Clock className="w-5 h-5" />,
      suivi_projet: <CheckSquare className="w-5 h-5" />,
      appel_reunion: <Phone className="w-5 h-5" />,
      urgent: <AlertCircle className="w-5 h-5" />
    };
    return iconMap[eventType] || null;
  };

  return (
    <div className="flex-1 bg-card rounded-lg md:rounded-xl border border-border/40 overflow-hidden flex flex-col">
      {/* Day header */}
      <div className="p-3 md:p-6 border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/10">
        <h2 className="text-xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">
          {format(currentDate, 'EEEE', { locale: fr })}
        </h2>
        <p className="text-sm md:text-lg text-muted-foreground">
          {format(currentDate, 'd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4 md:p-8">
            <div className="text-center">
              <Calendar className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-30" />
              <p className="text-base md:text-xl font-medium">Aucun événement pour cette journée</p>
              <p className="text-sm md:text-base mt-1 md:mt-2">Votre agenda est libre!</p>
            </div>
          </div>
        ) : (
          <div className="p-3 md:p-6 space-y-2.5 md:space-y-4">
            {dayEvents.map((event, idx) => {
              const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              // Only show participants for RDV types, NOT for tasks
              const isTaskType = eventConfig.category === 'TASKS' ||
                event.eventType === 'tache' ||
                event.eventType === 'suivi_projet';
              const hasParticipants = event.participants && event.participants.length > 0;
              const showParticipants = !isTaskType && hasParticipants;
              const totalParticipants = hasParticipants ? event.participants.length + 1 : 1;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => onEventClick(event)}
                  className={`
                    p-3 md:p-6 rounded-lg md:rounded-xl border-l-[4px] md:border-l-[6px] ${eventConfig.borderColor}
                    ${eventConfig.bgLight}
                    backdrop-blur-sm cursor-pointer hover:shadow-xl transition-all duration-200
                    ${showParticipants ? 'ring-1 md:ring-2 ring-primary/30 shadow-md border border-primary/20' : 'shadow-sm hover:shadow-lg'}
                    group
                  `}
                >
                  <div className="flex items-start justify-between mb-2 md:mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                        <div className={`
                          w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0
                          ${eventConfig.color} text-white shadow-sm
                        `}>
                          {getEventIcon(event.eventType)}
                        </div>
                        <h3 className={`font-bold text-sm md:text-xl ${eventConfig.chipText} group-hover:translate-x-1 transition-transform`}>
                          {event.title.replace('[TÂCHE] ', '')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 md:mt-2">
                        <EventBadge event={event} size="lg" showIcon={true} />
                      </div>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-4 px-0 md:px-12">
                    <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-base font-semibold text-muted-foreground">
                      <Clock className="w-4 h-4 md:w-5 md:h-5" />
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div className="mb-2 md:mb-4 px-0 md:px-12 text-xs md:text-base text-foreground/80">
                      {event.description}
                    </div>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div className="mb-2 md:mb-4 px-0 md:px-12 flex items-center gap-1.5 md:gap-2 text-xs md:text-base text-muted-foreground">
                      <span>📍</span>
                      {event.location}
                    </div>
                  )}

                  {/* Team info - Only for RDV with participants */}
                  {showParticipants && (
                    <div className="mt-2 md:mt-4 px-0 md:px-12 pt-2 md:pt-4 border-t border-border/20">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <span className="text-xs md:text-sm font-semibold text-primary">{totalParticipants} participant{totalParticipants > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs md:text-sm font-bold ring-2 ring-background shadow-lg" title={event.assignedToName}>
                          {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        {event.participantDetails?.slice(0, 4).map((participant, pidx) => (
                          <div
                            key={participant.id}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs md:text-sm font-bold ring-2 ring-background shadow-lg"
                            title={participant.name}
                            style={{ zIndex: 9 - pidx }}
                          >
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {event.participants && event.participants.length > 4 && (
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs md:text-sm font-bold ring-2 ring-background shadow-lg text-center">
                            +{event.participants.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
