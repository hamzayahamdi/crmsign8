'use client';

import { useState, useMemo } from 'react';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
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
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/40 rounded-t-lg overflow-hidden">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-muted/30 p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
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

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => onDateClick(day)}
              className={`
                bg-card p-2 min-h-[120px] cursor-pointer
                hover:bg-accent/50 transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}
              `}
            >
              <div className="flex flex-col h-full">
                <div className={`
                  text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full
                  ${isTodayDate ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground'}
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                    const isTeamEvent = event.participants && event.participants.length > 0;
                    const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1; // +1 for assignedTo
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`
                          text-xs p-1.5 rounded border-l-2 ${eventConfig.borderColor} ${eventConfig.chipBg}
                          backdrop-blur-sm hover:shadow-md transition-all cursor-pointer ring-1 ring-border/40
                          ${isTeamEvent ? 'ring-2 ring-primary/30' : ''}
                        `}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${eventConfig.color} shrink-0`} />
                            <span className={`truncate font-medium ${eventConfig.chipText}`}>{event.title}</span>
                          </div>
                          {isTeamEvent && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Users className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-bold text-primary">{totalParticipants}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1 font-medium">
                      +{dayEvents.length - 3} autres
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
    <div className="grid grid-cols-7 gap-3 flex-1">
      {weekDays.map((day) => {
        const dayEvents = getEventsForDay(day);
        const isTodayDate = isToday(day);

        return (
          <div
            key={day.toString()}
            onClick={() => onDateClick(day)}
            className="flex flex-col bg-card rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-accent/30 transition-all"
          >
            <div className={`
              text-center mb-3 pb-2 border-b border-border/40
              ${isTodayDate ? 'text-primary' : ''}
            `}>
              <div className="text-xs font-medium uppercase mb-1 text-muted-foreground">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={`
                text-2xl font-bold inline-flex items-center justify-center w-10 h-10 rounded-full
                ${isTodayDate ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground'}
              `}>
                {format(day, 'd')}
              </div>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
              {dayEvents.map((event) => {
                const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                const isTeamEvent = event.participants && event.participants.length > 0;
                const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1;
                
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`
                      p-2 rounded-lg border-l-2 ${eventConfig.borderColor} ${eventConfig.chipBg}
                      backdrop-blur-sm hover:shadow-md transition-all cursor-pointer ring-1 ring-border/40
                      ${isTeamEvent ? 'ring-2 ring-primary/30' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className={`text-xs font-semibold line-clamp-2 flex-1 ${eventConfig.chipText}`}>
                        {event.title}
                      </div>
                      {isTeamEvent && (
                        <div className="flex items-center gap-0.5 shrink-0 bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <Users className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold text-primary">{totalParticipants}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(event.startDate), 'HH:mm')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

  return (
    <div className="flex-1 bg-card rounded-lg border border-border/40 overflow-hidden">
      <div className="flex h-full">
        {/* Time column */}
        <div className="w-16 border-r border-border/40 bg-muted/20">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-14 border-b border-border/20 px-2 py-1 text-xs text-muted-foreground font-medium"
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="flex-1 relative overflow-y-auto custom-scrollbar">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-14 border-b border-border/20"
            />
          ))}

          {/* Events overlay */}
          <div className="absolute inset-0 p-3">
            {dayEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucun événement pour cette journée
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                  const startDate = new Date(event.startDate);
                  const isTeamEvent = event.participants && event.participants.length > 0;
                  const totalParticipants = isTeamEvent ? event.participants.length + 1 : 1;
                  
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => onEventClick(event)}
                      className={`
                        p-4 rounded-lg border-l-4 ${eventConfig.borderColor} ${eventConfig.bgLight}
                        backdrop-blur-sm cursor-pointer hover:shadow-lg transition-all
                        ${isTeamEvent ? 'ring-2 ring-primary/30' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base text-foreground mb-1">{event.title}</h3>
                          {isTeamEvent && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center -space-x-2">
                                {/* Assigned user avatar */}
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md z-10">
                                  {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                {/* Participant avatars */}
                                {event.participantDetails?.slice(0, 3).map((participant, idx) => (
                                  <div 
                                    key={participant.id}
                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md"
                                    style={{ zIndex: 9 - idx }}
                                  >
                                    {participant.name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {event.participants && event.participants.length > 3 && (
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md">
                                    +{event.participants.length - 3}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                                <Users className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold text-primary">{totalParticipants} participants</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs ${eventConfig.color} text-white shrink-0 ml-2 shadow-sm`}>
                          {eventConfig.label}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2 font-medium">
                        {format(startDate, 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                      </div>

                      {event.description && (
                        <p className="text-sm text-foreground/80 mb-2">
                          {event.description}
                        </p>
                      )}

                      {event.location && (
                        <div className="text-sm text-muted-foreground">
                          📍 {event.location}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
