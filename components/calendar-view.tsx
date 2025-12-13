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
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEventWithDetails[] } | null>(null);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = endOfDay(new Date(event.endDate));
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(dayEnd, { start: eventStart, end: eventEnd });
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const handleShowMore = (date: Date, dayEvents: CalendarEventWithDetails[], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDayEvents({ date, events: dayEvents });
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Week day headers - Google Calendar style */}
        <div className="grid grid-cols-7 border-b border-border/30">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid - Clean Google style */}
        <div className="grid grid-cols-7 flex-1 border-l border-t border-border/20">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={index}
                onClick={() => onDateClick(day)}
                className={`
                  relative border-r border-b border-border/20 p-2 min-h-[120px] cursor-pointer
                  transition-colors duration-150
                  ${!isCurrentMonth ? 'bg-muted/10' : 'bg-background'}
                  ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}
                  hover:bg-accent/30
                `}
              >
                {/* Date number - Google Calendar style */}
                <div className="flex items-center justify-center mb-2">
                  <div className={`
                    text-sm font-normal w-7 h-7 flex items-center justify-center rounded-full
                    ${isTodayDate
                      ? 'bg-blue-600 text-white font-medium'
                      : isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/40'
                    }
                  `}>
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Events list - Clean and readable */}
                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => {
                    const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                    const startTime = format(new Date(event.startDate), 'HH:mm');
                    const cleanTitle = event.title.replace(/^\[TÂCHE\]\s*/, '');

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`
                          group px-2 py-1 rounded text-[11px] leading-snug
                          cursor-pointer transition-all duration-150
                          ${eventConfig.chipBg}
                          border-l-2 ${eventConfig.borderColor}
                          hover:shadow-sm hover:scale-[1.02]
                        `}
                      >
                        <div className={`font-medium ${eventConfig.chipText} truncate`}>
                          <span className="font-semibold">{startTime}</span> {cleanTitle}
                        </div>
                      </div>
                    );
                  })}

                  {/* More events indicator - clickable */}
                  {dayEvents.length > 3 && (
                    <div
                      onClick={(e) => handleShowMore(day, dayEvents, e)}
                      className="text-[10px] text-blue-600 dark:text-blue-400 font-medium px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded cursor-pointer transition-colors"
                    >
                      +{dayEvents.length - 3} plus
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Events Modal */}
      {selectedDayEvents && (
        <DayEventsModal
          date={selectedDayEvents.date}
          events={selectedDayEvents.events}
          onClose={() => setSelectedDayEvents(null)}
          onEventClick={onEventClick}
        />
      )}
    </>
  );
}


// Day Events Modal Component
function DayEventsModal({
  date,
  events,
  onClose,
  onEventClick
}: {
  date: Date;
  events: CalendarEventWithDetails[];
  onClose: () => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1117] rounded-xl border border-slate-700/50 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-900/30">
          <h3 className="text-base font-light text-slate-100 capitalize">
            {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
          </h3>
          <p className="text-xs font-light text-slate-400 mt-1">
            {events.length} événement{events.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Events list */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
          {events.map((event) => {
            const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
            const startTime = format(new Date(event.startDate), 'HH:mm');
            const endTime = format(new Date(event.endDate), 'HH:mm');
            const cleanTitle = event.title.replace(/^\[TÂCHE\]\s*/, '');

            return (
              <div
                key={event.id}
                onClick={() => {
                  onEventClick(event);
                  onClose();
                }}
                className={`
                  relative pl-4 pr-4 py-3 rounded-lg cursor-pointer transition-all duration-200
                  ${eventConfig.chipBg.replace('bg-', 'bg-opacity-10 bg-')} 
                  border border-slate-700/50 hover:border-slate-600/50
                  hover:bg-slate-800/50 group
                `}
              >
                {/* Left accent border */}
                <div className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${eventConfig.badgeColor.replace('bg-', 'bg-').replace('text-', '')}`} />

                <div className="flex flex-col gap-1">
                  <div className={`text-sm font-light text-slate-100 leading-snug group-hover:text-white transition-colors`}>
                    {cleanTitle}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-light text-slate-400 group-hover:text-slate-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{startTime} - {endTime}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs font-light text-slate-400 truncate max-w-[150px] group-hover:text-slate-300">
                        <span>📍</span>
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/30">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full h-9 text-xs font-light text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          >
            Fermer
          </Button>
        </div>
      </motion.div>
    </motion.div>
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
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  return (
    <div className="flex gap-1 flex-1 overflow-x-auto">
      {weekDays.map((day) => {
        const dayEvents = getEventsForDay(day);
        const isTodayDate = isToday(day);

        return (
          <div
            key={day.toString()}
            onClick={() => onDateClick(day)}
            className={`
              flex flex-col flex-1 min-w-[140px] border border-border/20 rounded-lg
              cursor-pointer transition-colors duration-150
              ${isTodayDate ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-background hover:bg-accent/20'}
            `}
          >
            {/* Day header */}
            <div className={`
              text-center py-2 border-b border-border/20
              ${isTodayDate ? 'bg-blue-100/50 dark:bg-blue-900/30' : ''}
            `}>
              <div className="text-[10px] font-medium uppercase text-muted-foreground mb-1">
                {format(day, 'EEE', { locale: fr })}
              </div>
              <div className={`
                text-2xl font-normal inline-flex items-center justify-center w-10 h-10 rounded-full
                ${isTodayDate ? 'bg-blue-600 text-white font-medium' : 'text-foreground'}
              `}>
                {format(day, 'd')}
              </div>
            </div>

            {/* Events list */}
            <div className="flex-1 p-2 space-y-1 overflow-y-auto">
              {dayEvents.length === 0 ? (
                <div className="text-[10px] text-muted-foreground/50 text-center py-4">
                  Aucun événement
                </div>
              ) : (
                dayEvents.map((event) => {
                  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
                  const startTime = format(new Date(event.startDate), 'HH:mm');
                  const cleanTitle = event.title.replace(/^\[TÂCHE\]\s*/, '');

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={`
                        px-2 py-1.5 rounded text-[10px] leading-tight
                        cursor-pointer transition-all duration-150
                        ${eventConfig.chipBg}
                        border-l-2 ${eventConfig.borderColor}
                        hover:shadow-md hover:scale-[1.02]
                      `}
                    >
                      <div className={`font-semibold ${eventConfig.chipText} mb-0.5`}>
                        {startTime}
                      </div>
                      <div className={`font-medium ${eventConfig.chipText} line-clamp-2`}>
                        {cleanTitle}
                      </div>
                    </div>
                  );
                })
              )}
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

  return (
    <div className="flex-1 bg-background rounded-lg border border-border/20 overflow-hidden flex flex-col">
      {/* Day header - Google Calendar style */}
      <div className="p-4 border-b border-border/20 bg-muted/10">
        <h2 className="text-2xl font-normal text-foreground mb-0.5">
          {format(currentDate, 'EEEE', { locale: fr })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {format(currentDate, 'd MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground p-8">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-base font-medium">Aucun événement pour cette journée</p>
              <p className="text-sm mt-1">Votre agenda est libre!</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {dayEvents.map((event) => {
              const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
              const startDate = new Date(event.startDate);
              const endDate = new Date(event.endDate);
              const cleanTitle = event.title.replace(/^\[TÂCHE\]\s*/, '');

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-all duration-150
                    ${eventConfig.chipBg}
                    border-l-4 ${eventConfig.borderColor}
                    hover:shadow-md hover:scale-[1.01]
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Time */}
                    <div className="text-xs font-medium text-muted-foreground min-w-[80px]">
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </div>

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${eventConfig.chipText} mb-1`}>
                        {cleanTitle}
                      </div>

                      {event.description && (
                        <div className="text-xs text-foreground/70 line-clamp-2 mb-1">
                          {event.description}
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>📍</span>
                          {event.location}
                        </div>
                      )}
                    </div>

                    {/* Event type badge */}
                    <div className={`
                      px-2 py-1 rounded text-[10px] font-medium
                      ${eventConfig.chipBg} ${eventConfig.chipText}
                    `}>
                      {eventConfig.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
