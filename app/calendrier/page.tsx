'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarEventWithDetails, EventType } from '@/types/calendar';
import { fetchCalendarEvents } from '@/lib/calendar-service';
import { useCalendarStore } from '@/stores/calendar-store';
import { useRealtimeCalendar } from '@/hooks/use-realtime-calendar';
import { CalendarView } from '@/components/calendar-view';
import { AddEventModal } from '@/components/add-event-modal';
import { EventDetailModal } from '@/components/event-detail-modal';
import { UpcomingEventsSidebar } from '@/components/upcoming-events-sidebar';
import { NotificationPermissionDialog } from '@/components/notification-permission-dialog';
import { useEventReminders } from '@/hooks/useEventReminders';
import { notificationService } from '@/lib/notification-service-client';
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
  // Use Zustand store for state management
  const {
    events,
    filteredEvents,
    isLoading,
    setEvents,
    setFilter,
    setCurrentUser,
    setLoading,
    filter
  } = useCalendarStore();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [architectFilter, setArchitectFilter] = useState<string>('all'); // For gestionnaire/admin view
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetails | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Enable real-time sync
  useRealtimeCalendar(currentUserId || null);

  // Smart reminders
  useEventReminders(events);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch events for a wider range (3 months)
      const start = startOfMonth(addMonths(currentDate, -1));
      const end = endOfMonth(addMonths(currentDate, 1));

      console.log('[Calendar] Loading events from', start.toISOString(), 'to', end.toISOString());
      const data = await fetchCalendarEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });

      console.log('[Calendar] Events loaded:', data.length);
      console.log('[Calendar] Events data:', data);
      setEvents(data);

      // Log what's in the store after setting
      setTimeout(() => {
        const storeState = useCalendarStore.getState();
        console.log('[Calendar] Store events after set:', storeState.events.length);
        console.log('[Calendar] Store filteredEvents:', storeState.filteredEvents.length);
        console.log('[Calendar] Store filter:', storeState.filter);
      }, 100);

      if (data.length === 0) {
        console.warn('[Calendar] No events found in date range');
      }
    } catch (error) {
      console.error('[Calendar] Error loading events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors du chargement des événements: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [currentDate, setEvents, setLoading]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      await initializeNotifications(); // Wait for user to be set
      await loadUsers();
    };
    init();
  }, []);

  // Load events when currentUserId is available or currentDate changes
  useEffect(() => {
    if (currentUserId) {
      console.log('[Calendar] Loading events - currentUserId:', currentUserId);
      loadEvents();
    }
  }, [currentUserId, loadEvents]);

  // Debug: Log filteredEvents whenever it changes
  useEffect(() => {
    console.log('[Calendar] filteredEvents changed:', filteredEvents.length, filteredEvents);
  }, [filteredEvents]);

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
      console.log('[Calendar] Initializing notifications and user...');
      // Get current user info
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        console.error('[Calendar] No token found in localStorage');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('[Calendar] User data loaded:', userData);
        setCurrentUserId(userData.id);
        setCurrentUserEmail(userData.email);
        setCurrentUserRole(userData.role);

        // Set current user in store for permission checks
        setCurrentUser(userData.id, userData.role);
        console.log('[Calendar] User set in store:', userData.id, userData.role);

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
      } else {
        console.error('[Calendar] Failed to get user info:', response.status);
        toast.error('Erreur lors de la récupération des informations utilisateur');
      }
    } catch (error) {
      console.error('[Calendar] Error initializing notifications:', error);
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  // Handle architect filter for gestionnaire/admin
  useEffect(() => {
    if (architectFilter !== 'all') {
      setFilter({ assignedTo: architectFilter });
    } else {
      setFilter({ assignedTo: 'all' });
    }
  }, [architectFilter, setFilter]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleEventClick = async (event: CalendarEventWithDetails) => {
    console.log('[Calendar] Event clicked:', event);

    // Refetch the event to ensure we have all details including participant names
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/calendar?id=${event.id}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const enrichedEvent = await response.json();
        console.log('[Calendar] Enriched event data:', enrichedEvent);
        setSelectedEvent(enrichedEvent);
      } else {
        console.warn('[Calendar] Failed to fetch enriched event, using original');
        setSelectedEvent(event);
      }
    } catch (error) {
      console.error('[Calendar] Error fetching event details:', error);
      setSelectedEvent(event);
    }

    setShowEventDetail(true);
  };

  const handleEventCreated = async () => {
    // Small delay to ensure database has committed the transaction
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadEvents();
    console.log('[Calendar] Events reloaded after creation');
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
      <div className="shrink-0 border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-2xl blur-lg opacity-50"></div>
              <div className="relative p-2 md:p-3 bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-xl md:rounded-2xl shadow-2xl">
                <Calendar className="h-5 w-5 md:h-7 md:w-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Calendrier
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Gérez vos événements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 self-end md:self-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotificationDialog(true)}
              className="h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              title="Paramètres de notification"
            >
              <Bell className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(undefined);
                setShowAddModal(true);
              }}
              className="gap-2 px-3 md:px-6 h-9 md:h-11 rounded-lg md:rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 text-xs md:text-sm"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              <span className="font-semibold">Nouveau</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-2 md:p-3">
        <div className="h-full flex flex-col gap-2 md:gap-3">
          {/* Filters & Controls */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0"
          >
            <div className="relative overflow-hidden rounded-lg md:rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-xl shadow-xl p-2 md:p-5">
              <div className="flex flex-col gap-2 md:gap-3">
                {/* Top Row: Search and View Modes */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 md:gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 md:left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-5 md:w-5 text-muted-foreground/60" />
                    <Input
                      placeholder="Rechercher..."
                      value={filter.searchQuery}
                      onChange={(e) => setFilter({ searchQuery: e.target.value })}
                      className="pl-8 md:pl-12 h-9 md:h-12 bg-background/50 border-border/60 rounded-lg md:rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-xs md:text-base"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    {/* View Mode Toggles */}
                    <div className="flex items-center gap-0.5 md:gap-1 bg-muted/30 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-border/40 shrink-0">
                      <Button
                        variant={viewMode === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('month')}
                        className={`gap-1 md:gap-2 h-7 md:h-10 px-2 md:px-5 rounded-md md:rounded-lg transition-all duration-300 text-[10px] md:text-sm ${viewMode === 'month' ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : 'hover:bg-muted/50'}`}
                      >
                        <LayoutGrid className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="font-semibold">Mois</span>
                      </Button>
                      <Button
                        variant={viewMode === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('week')}
                        className={`gap-1 md:gap-2 h-7 md:h-10 px-2 md:px-5 rounded-md md:rounded-lg transition-all duration-300 text-[10px] md:text-sm ${viewMode === 'week' ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : 'hover:bg-muted/50'}`}
                      >
                        <LayoutList className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="font-semibold">Semaine</span>
                      </Button>
                      <Button
                        variant={viewMode === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('day')}
                        className={`gap-1 md:gap-2 h-7 md:h-10 px-2 md:px-5 rounded-md md:rounded-lg transition-all duration-300 text-[10px] md:text-sm ${viewMode === 'day' ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : 'hover:bg-muted/50'}`}
                      >
                        <CalendarDays className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="font-semibold">Jour</span>
                      </Button>
                    </div>

                    {/* Sidebar Toggle */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSidebar(!showSidebar)}
                      className="shrink-0 h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hidden lg:flex"
                    >
                      {showSidebar ? (
                        <PanelRightClose className="h-4 w-4 md:h-5 md:w-5" />
                      ) : (
                        <PanelRightOpen className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm font-semibold text-muted-foreground">
                    <div className="p-1 md:p-2 bg-primary/10 rounded-md md:rounded-lg">
                      <Filter className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                    </div>
                    <span>Filtres:</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
                    {/* Type Filter */}
                    <Select value={filter.eventType} onValueChange={(value) => setFilter({ eventType: value })}>
                      <SelectTrigger className="w-full md:w-[240px] h-9 md:h-12 px-2.5 md:px-4 bg-background/50 border-border/60 rounded-lg md:rounded-xl hover:border-primary/50 transition-all duration-300 text-xs md:text-sm">
                        <SelectValue placeholder="Type d'événement" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px] rounded-xl border-border/60">
                        <SelectItem value="all" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">Tous les types</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="rendez_vous" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                            <span className="text-sm font-medium">Rendez-vous client</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="suivi_projet" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                            <span className="text-sm font-medium">Suivi projet</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="appel_reunion" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                            <span className="text-sm font-medium">Appel ou réunion</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="urgent" className="py-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                            <span className="text-sm font-medium">Urgent / Critique</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* User Filter - Available for all roles to see all calendars */}
                    <Select value={architectFilter} onValueChange={setArchitectFilter}>
                      <SelectTrigger className="w-full md:w-[320px] h-9 md:h-12 px-2.5 md:px-4 bg-background/50 border-border/60 rounded-lg md:rounded-xl hover:border-primary/50 transition-all duration-300 text-xs md:text-sm">
                        <SelectValue placeholder="Filtrer par utilisateur" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[360px] max-h-[500px] rounded-xl border-border/60">
                        {/* All Users Option */}
                        <SelectItem value="all" className="py-3.5 rounded-lg font-semibold">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                              <LayoutGrid className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold text-sm">Tous les utilisateurs</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-auto">
                              {users.length}
                            </span>
                          </div>
                        </SelectItem>
                        
                        {/* My Events Only - Only show if currentUserId is set */}
                        {currentUserId && currentUserId.trim() !== '' && (
                          <SelectItem value={currentUserId} className="py-3.5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-semibold">Mes événements uniquement</span>
                            </div>
                          </SelectItem>
                        )}

                        {/* Separator */}
                        <div className="h-px bg-border/40 my-2 mx-2" />

                        {/* Group users by role */}
                        {(() => {
                          const roleGroups: Record<string, typeof users> = {};
                          const roleOrder = ['admin', 'operator', 'gestionnaire', 'architect', 'architecte', 'commercial', 'magasiner', 'chef_de_chantier'];
                          const roleLabels: Record<string, string> = {
                            'admin': 'Administrateurs',
                            'operator': 'Opérateurs',
                            'gestionnaire': 'Gestionnaires',
                            'architect': 'Architectes',
                            'architecte': 'Architectes',
                            'commercial': 'Commerciaux',
                            'magasiner': 'Magasiniers',
                            'chef_de_chantier': 'Chefs de chantier'
                          };
                          const roleColors: Record<string, string> = {
                            'admin': 'from-purple-500/20 to-purple-500/10 text-purple-600',
                            'operator': 'from-indigo-500/20 to-indigo-500/10 text-indigo-600',
                            'gestionnaire': 'from-green-500/20 to-green-500/10 text-green-600',
                            'architect': 'from-blue-500/20 to-blue-500/10 text-blue-600',
                            'architecte': 'from-blue-500/20 to-blue-500/10 text-blue-600',
                            'commercial': 'from-orange-500/20 to-orange-500/10 text-orange-600',
                            'magasiner': 'from-cyan-500/20 to-cyan-500/10 text-cyan-600',
                            'chef_de_chantier': 'from-red-500/20 to-red-500/10 text-red-600'
                          };

                          // Group users by role
                          users.forEach(user => {
                            // Normalize role: handle spaces, underscores, and case variations
                            let roleKey = user.role?.toLowerCase().trim() || 'other';
                            // Normalize "chef de chantier" variations
                            if (roleKey === 'chef de chantier' || roleKey === 'chef_de_chantier') {
                              roleKey = 'chef_de_chantier';
                            }
                            // Normalize "architecte" to "architect"
                            if (roleKey === 'architecte') {
                              roleKey = 'architect';
                            }
                            if (!roleGroups[roleKey]) {
                              roleGroups[roleKey] = [];
                            }
                            roleGroups[roleKey].push(user);
                          });

                          // Get all role keys (including those not in roleOrder)
                          const allRoleKeys = Array.from(new Set([
                            ...roleOrder,
                            ...Object.keys(roleGroups).filter(key => !roleOrder.includes(key))
                          ]));

                          // Render groups in order
                          return allRoleKeys.map(roleKey => {
                            const groupUsers = roleGroups[roleKey];
                            if (!groupUsers || groupUsers.length === 0) return null;

                            const normalizedRole = roleKey === 'architecte' ? 'architect' : roleKey;
                            const label = roleLabels[normalizedRole] || roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
                            const colorClass = roleColors[normalizedRole] || 'from-muted/20 to-muted/10 text-muted-foreground';
                            
                            // Get badge text - use full label for "Chefs de chantier", otherwise first word
                            const badgeText = normalizedRole === 'chef_de_chantier' ? 'Chef de chantier' : label.split(' ')[0];

                            return (
                              <div key={roleKey}>
                                {/* Role Header */}
                                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/20">
                                  {label} ({groupUsers.length})
                                </div>
                                {/* Users in this role */}
                                {groupUsers
                                  .filter(user => user.id && user.id.trim() !== '') // Filter out users without valid IDs
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((user) => (
                                    <SelectItem key={user.id} value={user.id} className="py-3 rounded-lg pl-6">
                                      <div className="flex items-center gap-3 w-full">
                                        <div className={`p-1.5 bg-gradient-to-br ${colorClass} rounded-lg shrink-0`}>
                                          <User className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">{user.name}</div>
                                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r ${colorClass} font-medium shrink-0`}>
                                          {badgeText}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                }
                              </div>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Calendar Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 relative overflow-hidden rounded-lg md:rounded-2xl border border-border/40 bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-xl shadow-2xl p-2 md:p-6"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                    <Calendar className="relative h-16 w-16 text-primary animate-pulse mx-auto mb-6" />
                  </div>
                  <p className="text-muted-foreground text-lg font-medium">
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
        events={filteredEvents}
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
