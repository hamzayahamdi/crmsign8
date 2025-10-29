'use client';

import { useEffect, useRef } from 'react';
import { CalendarEventWithDetails } from '@/types/calendar';
import { REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { toast } from 'sonner';
import { differenceInMinutes } from 'date-fns';

export function useEventReminders(events: CalendarEventWithDetails[]) {
  const checkedEventsRef = useRef<Set<string>>(new Set());
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        notificationPermissionRef.current = permission;
      });
    } else if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
    }
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();

      events.forEach((event) => {
        // Skip if already checked or no reminder
        if (checkedEventsRef.current.has(event.id) || event.reminderType === 'none') {
          return;
        }

        const eventStart = new Date(event.startDate);
        const minutesUntilEvent = differenceInMinutes(eventStart, now);
        const reminderMinutes = REMINDER_TYPE_CONFIG[event.reminderType].minutes;

        // Check if it's time to send reminder (within 1 minute window)
        if (minutesUntilEvent <= reminderMinutes && minutesUntilEvent > reminderMinutes - 1) {
          sendReminder(event);
          checkedEventsRef.current.add(event.id);
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkReminders, 60000);
    
    // Check immediately
    checkReminders();

    return () => clearInterval(interval);
  }, [events]);

  const sendReminder = (event: CalendarEventWithDetails) => {
    const eventStart = new Date(event.startDate);
    const minutesUntilEvent = differenceInMinutes(eventStart, new Date());
    
    let timeText = '';
    if (minutesUntilEvent < 60) {
      timeText = `dans ${minutesUntilEvent} minutes`;
    } else if (minutesUntilEvent < 1440) {
      const hours = Math.floor(minutesUntilEvent / 60);
      timeText = `dans ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutesUntilEvent / 1440);
      timeText = `dans ${days} jour${days > 1 ? 's' : ''}`;
    }

    // In-app toast notification
    toast.info(`🔔 Rappel : ${event.title}`, {
      description: `Événement prévu ${timeText}${event.location ? ` à ${event.location}` : ''}`,
      duration: 10000,
      action: {
        label: 'Voir',
        onClick: () => {
          // Could trigger event detail modal here
          console.log('View event:', event.id);
        }
      }
    });

    // Browser notification
    if ('Notification' in window && notificationPermissionRef.current === 'granted') {
      try {
        const notification = new Notification(`🔔 Rappel : ${event.title}`, {
          body: `Événement prévu ${timeText}${event.location ? `\n📍 ${event.location}` : ''}`,
          icon: '/favicon-32x32.png',
          badge: '/favicon-32x32.png',
          tag: event.id,
          requireInteraction: false,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  return null;
}
