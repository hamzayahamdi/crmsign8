'use client';

import { useState } from 'react';
import { CalendarEventWithDetails } from '@/types/calendar';
import { CalendarEventChip } from '@/components/calendar-event-chip';
import { CalendarEventPreviewModal } from '@/components/calendar-event-preview-modal';
import {
  getCalendarDays,
  isSameDay,
  isSameMonth,
} from '@/lib/date-utils';
import {
  addMonths,
  subMonths,
  isToday,
  format
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Settings, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CalendarProfessionalProps {
  events: CalendarEventWithDetails[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEventWithDetails) => void;
  onDayClick?: (date: Date) => void;
  isLoading?: boolean;
}

export function CalendarProfessional({
  events,
  currentDate,
  onDateChange,
  onEventClick,
  onDayClick,
  isLoading = false,
}: CalendarProfessionalProps) {
  const [previewEvent, setPreviewEvent] = useState<CalendarEventWithDetails | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });

  // Generate calendar days using the consistent utility
  const days = getCalendarDays(currentDate).map((date) => {
    const dayEvents = events.filter((e) => isSameDay(e.startDate, date));
    // Sort events: RDV first, then tasks, then by time
    dayEvents.sort((a, b) => {
      if (a.eventType === 'rendez_vous' && b.eventType !== 'rendez_vous') return -1;
      if (a.eventType !== 'rendez_vous' && b.eventType === 'rendez_vous') return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    return {
      date,
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isToday(date),
      events: dayEvents,
    };
  });

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handlePrevious = () => onDateChange(subMonths(currentDate, 1));
  const handleNext = () => onDateChange(addMonths(currentDate, 1));
  const handleToday = () => onDateChange(new Date());

  const handleEventMouseEnter = (event: CalendarEventWithDetails, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPreviewEvent(event);
    setPreviewPosition({
      x: rect.right + 10,
      y: rect.top - 20,
    });
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-xl border border-border/30 shadow-2xl overflow-hidden">
      {/* Header Controls - Google Calendar Style */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card/80 via-card to-card/80 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-background/80 rounded-xl p-1.5 border border-border/40 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="h-8 w-8 hover:bg-muted hover:scale-105 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-8 px-4 text-xs font-semibold hover:bg-muted hover:scale-105 transition-all duration-200"
            >
              Aujourd'hui
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 hover:bg-muted hover:scale-105 transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-2xl font-bold capitalize text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-semibold hidden sm:flex hover:bg-muted transition-all duration-200">
            <Filter className="h-3.5 w-3.5" />
            Filtres
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted transition-all duration-200">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
        {/* Week Day Headers - Google Calendar Style */}
        <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-bold text-muted-foreground/80 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid - Enhanced Design */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {days.map((day, index) => (
            <div
              key={day.date.toISOString()}
              onClick={() => onDayClick?.(day.date)}
              className={cn(
                "relative border-b border-r border-border/20 p-3 transition-all duration-200 flex flex-col gap-2 min-h-0 cursor-pointer",
                "hover:bg-muted/30 hover:shadow-inner",
                !day.isCurrentMonth && "bg-muted/10 text-muted-foreground/40",
                day.isCurrentMonth && "bg-background",
                index % 7 === 0 && "border-l border-border/20",
                day.isToday && "bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-inset ring-blue-500/30"
              )}
            >
              {/* Day Number - Improved Design */}
              <div className="flex justify-center mb-1">
                <span
                  className={cn(
                    "text-sm font-semibold h-8 w-8 flex items-center justify-center rounded-full transition-all duration-200",
                    day.isToday
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 scale-110 ring-2 ring-blue-200 dark:ring-blue-800"
                      : day.isCurrentMonth
                      ? "text-foreground hover:bg-muted/50"
                      : "text-muted-foreground/50"
                  )}
                >
                  {format(day.date, 'd')}
                </span>
              </div>

              {/* Events Stack */}
              <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-hidden">
                {day.events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onMouseEnter={(e) => handleEventMouseEnter(event, e)}
                    onMouseLeave={() => setPreviewEvent(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    <CalendarEventChip event={event} />
                  </div>
                ))}

                {/* More Events Indicator - Improved */}
                {day.events.length > 3 && (
                  <button
                    className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md px-2 py-1 transition-all duration-200 flex items-center gap-1 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick?.(day.date);
                    }}
                  >
                    <span className="group-hover:scale-110 transition-transform">+{day.events.length - 3}</span>
                    <span>plus</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Preview Modal */}
      <AnimatePresence>
        {previewEvent && (
          <CalendarEventPreviewModal
            event={previewEvent}
            position={previewPosition}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
