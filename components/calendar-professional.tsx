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
    <div className="h-full flex flex-col bg-background rounded-xl border border-border/40 shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="h-7 w-7 hover:bg-background shadow-sm transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-7 px-3 text-xs font-medium hover:bg-background shadow-sm transition-all"
            >
              Aujourd'hui
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-7 w-7 hover:bg-background shadow-sm transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="text-xl font-bold capitalize text-foreground tracking-tight">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-medium hidden sm:flex">
            <Filter className="h-3.5 w-3.5" />
            Filtres
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b border-border/40">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5">
          {days.map((day, index) => (
            <div
              key={day.date.toISOString()}
              onClick={() => onDayClick?.(day.date)}
              className={cn(
                "relative border-b border-r border-border/30 p-2 transition-colors hover:bg-muted/20 flex flex-col gap-1 min-h-0",
                !day.isCurrentMonth && "bg-muted/5 text-muted-foreground/50",
                index % 7 === 0 && "border-l-0", // Remove left border for first column if needed
                index % 7 === 6 && "border-r-0"  // Remove right border for last column
              )}
            >
              {/* Day Number */}
              <div className="flex justify-center mb-1">
                <span
                  className={cn(
                    "text-xs font-medium h-7 w-7 flex items-center justify-center rounded-full transition-all",
                    day.isToday
                      ? "bg-blue-600 text-white shadow-md scale-110"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {format(day.date, 'd')}
                </span>
              </div>

              {/* Events Stack */}
              <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
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

                {/* More Events Indicator */}
                {day.events.length > 3 && (
                  <div className="px-1">
                    <button
                      className="w-full text-left text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-1.5 py-0.5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDayClick?.(day.date);
                      }}
                    >
                      +{day.events.length - 3} autres...
                    </button>
                  </div>
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
