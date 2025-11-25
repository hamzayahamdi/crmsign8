'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarEventWithDetails, EventType, EventCategory } from '@/types/calendar';
import { fetchCalendarEvents } from '@/lib/calendar-service';
import { useCalendarStore } from '@/stores/calendar-store';
import { useRealtimeCalendar } from '@/hooks/use-realtime-calendar';
import { CalendarProfessional } from '@/components/calendar-professional';
import { CalendarFiltersSidebar } from '@/components/calendar-filters-sidebar';
import { CalendarEventDetailSidebar } from '@/components/calendar-event-detail-sidebar';
import { AddEventModal } from '@/components/add-event-modal';
import { NotificationPermissionDialog } from '@/components/notification-permission-dialog';
import { useEventReminders } from '@/hooks/useEventReminders';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Plus, Bell, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

function CalendarProfessionalContent() {
  const { events, setEvents, setLoading, isLoading } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetails | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [architects, setArchitects] = useState<Array<{ id: string; name: string }>>([]);

  // Filter states
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([
    'rendez_vous',
    'suivi_projet',
    'tache',
    'appel_reunion',
    'urgent',
    'paiement',
    'devis',
    'interne',
  ]);
  const [selectedArchitects, setSelectedArchitects] = useState<string[]>([]);
  const [showOnlyMyEvents, setShowOnlyMyEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewEvent, setPreviewEvent] = useState<CalendarEventWithDetails | null>(null);

  // Real-time sync
  useRealtimeCalendar(currentUserId || null);

  // Smart reminders
  useEventReminders(events);

  // Get filtered events
  const filteredEvents = events.filter((event) => {
    // Event type filter
    if (!selectedEventTypes.includes(event.eventType)) {
      return false;
    }

    // Architect filter
    if (selectedArchitects.length > 0 && !selectedArchitects.includes(event.assignedTo)) {
      return false;
    }

    // Show only my events
    if (showOnlyMyEvents && event.assignedTo !== currentUserId) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.linkedClientName?.toLowerCase().includes(query) ||
        event.linkedLeadName?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfMonth(addMonths(currentDate, -1));
      const end = endOfMonth(addMonths(currentDate, 1));

      const data = await fetchCalendarEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      setEvents(data);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  }, [currentDate, setEvents, setLoading]);

  // Load events on mount and when date changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setCurrentUserId(user.id);
          setCurrentUserEmail(user.email);
          setCurrentUserRole(user.role);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };

    loadUserInfo();
  }, []);

  // Load architects for filter
  useEffect(() => {
    const loadArchitects = async () => {
      try {
        const response = await fetch('/api/users?role=architecte');
        if (response.ok) {
          const data = await response.json();
          setArchitects(data);
        }
      } catch (error) {
        console.error('Error loading architects:', error);
      }
    };

    if (currentUserRole === 'admin' || currentUserRole === 'gestionnaire') {
      loadArchitects();
    }
  }, [currentUserRole]);

  const handleEventClick = (event: CalendarEventWithDetails) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleEventCreated = async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await loadEvents();
    toast.success('Événement créé avec succès');
  };

  const handleEventDelete = async (event: CalendarEventWithDetails) => {
    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadEvents();
        setShowEventDetail(false);
        toast.success('Événement supprimé');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMarkComplete = async (event: CalendarEventWithDetails) => {
    toast.info('Fonctionnalité de complétion à venir');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col h-screen bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="shrink-0 border-b border-border/40 bg-gradient-to-r from-background via-background to-muted/20 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendrier</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez vos événements avec une vue professionnelle
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotificationDialog(true)}
              className="h-10 w-10"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Nouvel événement
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-px bg-border/40">
        {/* Left Sidebar - Filters */}
        <div className="w-80 bg-background border-r border-border/40 overflow-y-auto shrink-0">
          <CalendarFiltersSidebar
            architects={architects}
            selectedEventTypes={selectedEventTypes}
            onEventTypeChange={setSelectedEventTypes}
            selectedArchitects={selectedArchitects}
            onArchitectChange={setSelectedArchitects}
            showOnlyMyEvents={showOnlyMyEvents}
            onShowOnlyMyEventsChange={setShowOnlyMyEvents}
            currentUserId={currentUserId}
            onSearch={setSearchQuery}
          />
        </div>

        {/* Center - Calendar */}
        <div className="flex-1 bg-background overflow-hidden flex flex-col">
          <CalendarProfessional
            events={filteredEvents}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onEventClick={handleEventClick}
            onDayClick={(date) => {
              setSelectedDate(date);
              setShowAddModal(true);
            }}
            isLoading={isLoading}
          />
        </div>

        {/* Right Sidebar - Event Details */}
        {showEventDetail && (
          <div className="w-96 bg-background border-l border-border/40 overflow-y-auto shrink-0">
            <CalendarEventDetailSidebar
              event={selectedEvent}
              isOpen={showEventDetail}
              onClose={() => setShowEventDetail(false)}
              onDelete={handleEventDelete}
              onMarkComplete={handleMarkComplete}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedDate(undefined);
        }}
        onEventCreated={handleEventCreated}
        selectedDate={selectedDate}
      />

      <NotificationPermissionDialog
        isOpen={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        userId={currentUserId}
        userEmail={currentUserEmail}
      />
    </motion.div>
  );
}

export default function CalendarProfessionalPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <CalendarProfessionalContent />
      </div>
    </AuthGuard>
  );
}
