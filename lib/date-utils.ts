import { 
  format, 
  parseISO, 
  startOfDay, 
  endOfDay, 
  isSameDay as fnsIsSameDay,
  isSameMonth as fnsIsSameMonth,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Ensures a date is a Date object
 */
export function toDate(date: Date | string): Date {
  if (typeof date === 'string') {
    return parseISO(date);
  }
  return date;
}

/**
 * Checks if two dates are the same day, handling string/Date inputs safely
 */
export function isSameDay(dateLeft: Date | string, dateRight: Date | string): boolean {
  return fnsIsSameDay(toDate(dateLeft), toDate(dateRight));
}

/**
 * Checks if two dates are in the same month
 */
export function isSameMonth(dateLeft: Date | string, dateRight: Date | string): boolean {
  return fnsIsSameMonth(toDate(dateLeft), toDate(dateRight));
}

/**
 * Formats a date string safely
 */
export function formatDate(date: Date | string, formatStr: string): string {
  return format(toDate(date), formatStr, { locale: fr });
}

/**
 * Gets the start of the day for a given date
 */
export function getStartOfDay(date: Date | string): Date {
  return startOfDay(toDate(date));
}

/**
 * Gets the end of the day for a given date
 */
export function getEndOfDay(date: Date | string): Date {
  return endOfDay(toDate(date));
}

/**
 * Generates the days for the calendar grid (month view)
 */
export function getCalendarDays(currentDate: Date) {
  const monthStart = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const monthEnd = endOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
  
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}
