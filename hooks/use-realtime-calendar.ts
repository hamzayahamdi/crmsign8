import { useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useCalendarStore } from '@/stores/calendar-store';
import { CalendarEventWithDetails } from '@/types/calendar';
import { toast } from 'sonner';
import { Calendar, Edit, Trash2 } from 'lucide-react';

export function useRealtimeCalendar(userId: string | null) {
  const { addEvent, updateEvent, removeEvent } = useCalendarStore();

  const supabase = useCallback(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[useRealtimeCalendar] Supabase credentials not found');
      return null;
    }
    
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const client = supabase();
    if (!client) return;

    console.log('[useRealtimeCalendar] Setting up realtime subscription for calendar events');

    const channel = client
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calendar_events',
        },
        async (payload) => {
          console.log('[useRealtimeCalendar] New event created:', payload);
          const newEvent = payload.new as any;

          // Check if this event is relevant to the current user
          const isRelevant = 
            newEvent.created_by === userId ||
            newEvent.assigned_to === userId ||
            (newEvent.participants && newEvent.participants.includes(userId)) ||
            newEvent.visibility === 'all';

          if (isRelevant) {
            // Fetch full event details with user names
            try {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              const response = await fetch(`/api/calendar?id=${newEvent.id}`, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (response.ok) {
                const eventWithDetails = await response.json();
                
                console.log('[useRealtimeCalendar] Event details fetched:', eventWithDetails);
                addEvent(eventWithDetails);

                // Show toast notification if not created by current user
                if (newEvent.created_by !== userId) {
                  toast.success(`Nouveau RDV ajouté`, {
                    description: `${eventWithDetails.createdByName || 'Un utilisateur'} vous a ajouté à : ${newEvent.title}`,
                    duration: 6000,
                  });
                }
              } else {
                console.error('[useRealtimeCalendar] Failed to fetch event details:', response.status);
              }
            } catch (error) {
              console.error('[useRealtimeCalendar] Error fetching event details:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calendar_events',
        },
        async (payload) => {
          console.log('[useRealtimeCalendar] Event updated:', payload);
          const updatedEvent = payload.new as any;

          // Check if this event is relevant to the current user
          const isRelevant = 
            updatedEvent.created_by === userId ||
            updatedEvent.assigned_to === userId ||
            (updatedEvent.participants && updatedEvent.participants.includes(userId)) ||
            updatedEvent.visibility === 'all';

          if (isRelevant) {
            // Fetch full event details
            try {
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              const response = await fetch(`/api/calendar?id=${updatedEvent.id}`, {
                credentials: 'include',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (response.ok) {
                const eventWithDetails = await response.json();
                
                console.log('[useRealtimeCalendar] Updated event details fetched:', eventWithDetails);
                updateEvent(updatedEvent.id, eventWithDetails);

                // Show toast notification if not updated by current user
                if (updatedEvent.updated_at && payload.old.updated_at !== updatedEvent.updated_at) {
                  toast.info(`RDV modifié`, {
                    description: `Le rendez-vous "${updatedEvent.title}" a été mis à jour`,
                    duration: 5000,
                  });
                }
              } else {
                console.error('[useRealtimeCalendar] Failed to fetch updated event:', response.status);
              }
            } catch (error) {
              console.error('[useRealtimeCalendar] Error fetching updated event:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'calendar_events',
        },
        (payload) => {
          console.log('[useRealtimeCalendar] Event deleted:', payload);
          const deletedId = payload.old.id;
          
          removeEvent(deletedId);

          toast.error(`RDV supprimé`, {
            description: `Un rendez-vous a été supprimé du calendrier`,
            duration: 4000,
          });
        }
      )
      .subscribe((status) => {
        console.log('[useRealtimeCalendar] Subscription status:', status);
      });

    return () => {
      console.log('[useRealtimeCalendar] Cleaning up realtime subscription');
      client.removeChannel(channel);
    };
  }, [userId, addEvent, updateEvent, removeEvent, supabase]);
}
