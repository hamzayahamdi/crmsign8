'use client';

import { useState, useMemo } from 'react';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { EventBadge } from '@/components/event-badge';
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
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8">
            Aujourd'hui
          </Button>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-lg font-semibold capitalize text-foreground">{getHeaderTitle()}</h2>
        <div className="w-32" />
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

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      rendez_vous: <Clock className="w-3 h-3" />,
      suivi_projet: <CheckSquare className="w-3 h-3" />,
      appel_reunion: <Phone className="w-3 h-3" />,
      urgent: <AlertCircle className="w-3 h-3" />
    };
    return iconMap[eventType] || null;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/40 rounded-t-lg overflow-hidden">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gradient-to-b from-muted/50 to-muted/20 p-3 text-center text-xs font-bold text-foreground/70 uppercase tracking-widest"
          >
            {day}
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
                bg-card p-2.5 min-h-[130px] cursor-pointer
                transition-all duration-200
                ${isTodayDate ? 'bg-gradient-to-br from-primary/5 to-primary/10 ring-2 ring-primary/20 shadow-md' : ''}
                ${hasEvents && !isTodayDate ? 'hover:shadow-md hover:bg-accent/40' : ''}
                ${!isCurrentMonth ? 'opacity-30 bg-muted/20' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <div className={`
                  text-sm font-bold mb-2 w-8 h-8 flex items-center justify-center rounded-lg
                  ${isTodayDate 
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg' 
                    : 'text-foreground/70 hover:bg-muted/50'
                  }
                  transition-colors
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1.5 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event, eventIdx) => {
                    const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                    const isTeamEvent = event.participants && event.participants.length > 0;
                    const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1;
                    const isTask = event.eventType === 'suivi_projet';
                    const isRDV = event.eventType === 'rendez_vous';
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: eventIdx * 0.05 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`
                          text-xs p-2 rounded-lg border-l-[3px] ${eventConfig.borderColor}
                          ${eventConfig.chipBg}
                          backdrop-blur-sm hover:shadow-lg hover:scale-102 transition-all duration-200
                          cursor-pointer ring-1 ring-border/30
                          ${isTeamEvent ? 'ring-2 ring-primary/40' : ''}
                          ${isTask ? 'border-l-[4px]' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <div className={`
                              w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                              ${eventConfig.color} text-white
                            `}>
                              {getEventIcon(event.eventType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`truncate font-semibold ${eventConfig.chipText}`}>
                                {event.title.replace('[TÂCHE] ', '')}
                              </p>
                            </div>
                          </div>
                          {isTeamEvent && (
                            <div className="flex items-center gap-0.5 shrink-0 bg-primary/15 rounded-full px-1.5 py-0.5">
                              <Users className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[9px] font-bold text-primary">{totalParticipants}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground pl-1.5 font-semibold"
                    >
                      +{dayEvents.length - 3} {dayEvents.length - 3 === 1 ? 'autre' : 'autres'}
                    </motion.div>
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

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      rendez_vous: <Clock className="w-3 h-3" />,
      suivi_projet: <CheckSquare className="w-3 h-3" />,
      appel_reunion: <Phone className="w-3 h-3" />,
      urgent: <AlertCircle className="w-3 h-3" />
    };
    return iconMap[eventType] || null;
  };

  return (
    <div className="grid grid-cols-7 gap-2.5 flex-1">
      {weekDays.map((day, dayIdx) => {
        const dayEvents = getEventsForDay(day);
        const isTodayDate = isToday(day);
        const hasEvents = dayEvents.length > 0;

        return (
          <motion.div
            key={day.toString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIdx * 0.05 }}
            onClick={() => onDateClick(day)}
            className={`
              flex flex-col bg-card rounded-xl border-2 p-3 cursor-pointer
              transition-all duration-200
              ${isTodayDate 
                ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg' 
                : 'border-border/40 hover:border-primary/30 hover:shadow-md'
              }
            `}
          >
            <div className={`
              text-center mb-3 pb-3 border-b-2
              ${isTodayDate ? 'border-primary/30' : 'border-border/20'}
            `}>
              <div className="text-xs font-bold uppercase mb-1.5 text-muted-foreground">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={`
                text-3xl font-bold inline-flex items-center justify-center w-12 h-12 rounded-xl
                transition-all
                ${isTodayDate 
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg' 
                  : 'text-foreground hover:bg-muted/50'
                }
              `}>
                {format(day, 'd')}
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {dayEvents.length === 0 ? (
                <div className="text-xs text-muted-foreground/50 text-center py-4">
                  Aucun événement
                </div>
              ) : (
                dayEvents.map((event, eventIdx) => {
                  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                  const isTeamEvent = event.participants && event.participants.length > 0;
                  const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1;
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: eventIdx * 0.05 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={`
                        p-2.5 rounded-lg border-l-[4px] ${eventConfig.borderColor}
                        ${eventConfig.chipBg}
                        backdrop-blur-sm hover:shadow-lg hover:scale-105 transition-all duration-200
                        cursor-pointer ring-1 ring-border/30
                        ${isTeamEvent ? 'ring-2 ring-primary/40' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                          <div className={`
                            w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5
                            ${eventConfig.color} text-white
                          `}>
                            {getEventIcon(event.eventType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold line-clamp-1 ${eventConfig.chipText}`}>
                              {event.title.replace('[TÂCHE] ', '')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(event.startDate), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        {isTeamEvent && (
                          <div className="flex items-center gap-0.5 shrink-0 bg-primary/15 rounded-full px-1 py-0.5">
                            <Users className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[9px] font-bold text-primary">{totalParticipants}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
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

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      rendez_vous: <Clock className="w-4 h-4" />,
      suivi_projet: <CheckSquare className="w-4 h-4" />,
      appel_reunion: <Phone className="w-4 h-4" />,
      urgent: <AlertCircle className="w-4 h-4" />
    };
    return iconMap[eventType] || null;
  };

  return (
    <div className="flex-1 bg-card rounded-xl border border-border/40 overflow-hidden flex flex-col">
      {/* Day header */}
      <div className="p-4 border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/10">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          {format(currentDate, 'EEEE', { locale: fr })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {format(currentDate, 'd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Aucun événement pour cette journée</p>
              <p className="text-sm mt-1">Votre agenda est libre!</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {dayEvents.map((event, idx) => {
              const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              const isTeamEvent = event.participants && event.participants.length > 0;
              const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1;
              const isTask = event.eventType === 'suivi_projet';
              const isRDV = event.eventType === 'rendez_vous';
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => onEventClick(event)}
                  className={`
                    p-4 rounded-xl border-l-[5px] ${eventConfig.borderColor}
                    ${eventConfig.bgLight}
                    backdrop-blur-sm cursor-pointer hover:shadow-xl transition-all duration-200
                    ${isTeamEvent ? 'ring-2 ring-primary/40 shadow-md' : 'shadow-sm hover:shadow-lg'}
                    group
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${eventConfig.color} text-white
                        `}>
                          {getEventIcon(event.eventType)}
                        </div>
                        <h3 className={`font-bold text-lg ${eventConfig.chipText} group-hover:translate-x-0.5 transition-transform`}>
                          {event.title.replace('[TÂCHE] ', '')}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <EventBadge event={event} size="md" showIcon={true} />
                      </div>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="flex items-center gap-4 mb-3 px-10">
                    <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </div>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <div className="mb-3 px-10 text-sm text-foreground/80">
                      {event.description}
                    </div>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div className="mb-3 px-10 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📍</span>
                      {event.location}
                    </div>
                  )}

                  {/* Team info */}
                  {isTeamEvent && (
                    <div className="mt-3 px-10 pt-3 border-t border-border/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">{totalParticipants} participants</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md" title={event.assignedToName}>
                          {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        {event.participantDetails?.slice(0, 3).map((participant, pidx) => (
                          <div 
                            key={participant.id}
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md"
                            title={participant.name}
                            style={{ zIndex: 9 - pidx }}
                          >
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {event.participants && event.participants.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md text-center">
                            +{event.participants.length - 3}
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
