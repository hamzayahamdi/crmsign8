'use client';

import { useState, useEffect } from 'react';
import { CalendarEventWithDetails, EventType } from '@/types/calendar';
import { fetchCalendarEvents } from '@/lib/calendar-service';
import { CalendarView } from '@/components/calendar-view';
import { AddEventModal } from '@/components/add-event-modal';
import { EventDetailModal } from '@/components/event-detail-modal';
import { UpcomingEventsSidebar } from '@/components/upcoming-events-sidebar';
import { NotificationPermissionDialog } from '@/components/notification-permission-dialog';
import { useEventReminders } from '@/hooks/useEventReminders';
import { notificationService } from '@/lib/notification-service';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  LayoutList, 
  CalendarDays,
  PanelRightOpen,
  PanelRightClose,
  User,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day';

function CalendrierContent() {
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetails | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Smart reminders
  useEventReminders(events);

  useEffect(() => {
    loadEvents();
    loadUsers();
    initializeNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, filterType, filterUser]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      
      // Fetch events for a wider range (3 months)
      const start = startOfMonth(addMonths(currentDate, -1));
      const end = endOfMonth(addMonths(currentDate, 1));
      
      console.log('[Calendar] Loading events...');
      const data = await fetchCalendarEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
      
      console.log('[Calendar] Events loaded:', data.length);
      setEvents(data);
    } catch (error) {
      console.error('[Calendar] Error loading events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors du chargement des événements: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      console.log('[Calendar] Loading users...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/auth/users', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Calendar] Users loaded:', data.length);
        setUsers(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] Failed to load users:', response.status, errorData);
        toast.error(`Erreur lors du chargement des utilisateurs: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('[Calendar] Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const initializeNotifications = async () => {
    try {
      // Get current user info
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
        setCurrentUserEmail(userData.email);

        // Initialize service worker
        await notificationService.initServiceWorker();

        // Check if we should show the notification permission dialog
        const hasSeenDialog = localStorage.getItem('notification-dialog-seen');
        const permission = notificationService.getPermissionStatus();

        if (!hasSeenDialog && permission === 'default') {
          // Show dialog after a short delay for better UX
          setTimeout(() => {
            setShowNotificationDialog(true);
            localStorage.setItem('notification-dialog-seen', 'true');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('[Calendar] Error initializing notifications:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.eventType === filterType);
    }

    // User filter
    if (filterUser !== 'all') {
      filtered = filtered.filter(event => event.assignedTo === filterUser);
    }

    setFilteredEvents(filtered);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleEventClick = (event: CalendarEventWithDetails) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleEventCreated = () => {
    loadEvents();
  };

  const handleEventDeleted = () => {
    loadEvents();
  };

  const handleEventEdit = (event: CalendarEventWithDetails) => {
    // For now, just close the detail modal
    // In a full implementation, you'd open an edit modal
    setShowEventDetail(false);
    toast.info('Fonctionnalité d\'édition à venir');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 glass border-b border-border/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-xl shadow-lg">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Calendrier Intelligent
              </h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos événements et rendez-vous
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotificationDialog(true)}
              className="h-10 w-10"
              title="Paramètres de notification"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(undefined);
                setShowAddModal(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvel événement
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-3">
        <div className="h-full flex flex-col gap-3">
          {/* Filters & Controls */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0"
          >
            <div className="glass rounded-xl border border-border/40 p-4">
              <div className="flex flex-col gap-3">
                {/* Top Row: Search and View Modes */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search */}
                  <div className="flex-1 min-w-[250px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un événement..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-background/50"
                    />
                  </div>

                  {/* View Mode Toggles */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('month')}
                      className="gap-2 h-9 px-4"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="font-medium">Mois</span>
                    </Button>
                    <Button
                      variant={viewMode === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('week')}
                      className="gap-2 h-9 px-4"
                    >
                      <LayoutList className="h-4 w-4" />
                      <span className="font-medium">Semaine</span>
                    </Button>
                    <Button
                      variant={viewMode === 'day' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('day')}
                      className="gap-2 h-9 px-4"
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span className="font-medium">Jour</span>
                    </Button>
                  </div>

                  {/* Sidebar Toggle */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="shrink-0 h-10 w-10"
                  >
                    {showSidebar ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>Filtres:</span>
                  </div>

                  {/* Type Filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[220px] h-11 px-4 bg-background/50">
                      <SelectValue placeholder="Type d'événement" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      <SelectItem value="all" className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">Tous les types</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="rendez_vous" className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span className="text-sm">Rendez-vous client</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="suivi_projet" className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span className="text-sm">Suivi projet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="appel_reunion" className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <span className="text-sm">Appel ou réunion</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="urgent" className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="text-sm">Urgent / Critique</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* User Filter */}
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-[220px] h-11 px-4 bg-background/50">
                      <SelectValue placeholder="Utilisateur" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[240px]">
                      <SelectItem value="all" className="py-3">
                        <span className="font-medium text-sm">Tous les utilisateurs</span>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="py-3">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Calendar Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 glass rounded-xl border border-border/40 p-4 overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Chargement du calendrier...
                  </p>
                </div>
              </div>
            ) : (
              <CalendarView
                events={filteredEvents}
                viewMode={viewMode}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
          </motion.div>
        </div>
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

      <EventDetailModal
        event={selectedEvent}
        isOpen={showEventDetail}
        onClose={() => {
          setShowEventDetail(false);
          setSelectedEvent(null);
        }}
        onEventDeleted={handleEventDeleted}
        onEventEdit={handleEventEdit}
      />

      {/* Upcoming Events Sidebar */}
      <UpcomingEventsSidebar
        events={events}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        onEventClick={handleEventClick}
      />

      {/* Notification Permission Dialog */}
      <NotificationPermissionDialog
        isOpen={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        userId={currentUserId}
        userEmail={currentUserEmail}
      />
    </div>
  );
}

export default function CalendrierPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <CalendrierContent />
      </div>
    </AuthGuard>
  );
}
