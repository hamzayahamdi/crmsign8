import { create } from 'zustand';
import { CalendarEventWithDetails } from '@/types/calendar';

interface CalendarFilter {
  searchQuery: string;
  eventType: string;
  assignedTo: string;
  viewMode: 'month' | 'week' | 'day';
}

interface CalendarStore {
  // State
  events: CalendarEventWithDetails[];
  filteredEvents: CalendarEventWithDetails[];
  isLoading: boolean;
  filter: CalendarFilter;
  currentUserId: string | null;
  currentUserRole: string | null;
  
  // Actions
  setEvents: (events: CalendarEventWithDetails[]) => void;
  addEvent: (event: CalendarEventWithDetails) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEventWithDetails>) => void;
  removeEvent: (eventId: string) => void;
  setFilter: (filter: Partial<CalendarFilter>) => void;
  setCurrentUser: (userId: string, role: string) => void;
  applyFilters: () => void;
  setLoading: (loading: boolean) => void;
  
  // Helpers
  canViewEvent: (event: CalendarEventWithDetails) => boolean;
  canEditEvent: (event: CalendarEventWithDetails) => boolean;
  getMyEvents: () => CalendarEventWithDetails[];
  getEventsForUser: (userId: string) => CalendarEventWithDetails[];
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  events: [],
  filteredEvents: [],
  isLoading: false,
  filter: {
    searchQuery: '',
    eventType: 'all',
    assignedTo: 'all',
    viewMode: 'month',
  },
  currentUserId: null,
  currentUserRole: null,

  // Actions
  setEvents: (events) => {
    set({ events });
    get().applyFilters();
  },

  addEvent: (event) => {
    set((state) => ({ events: [event, ...state.events] }));
    get().applyFilters();
  },

  updateEvent: (eventId, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event
      ),
    }));
    get().applyFilters();
  },

  removeEvent: (eventId) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
    }));
    get().applyFilters();
  },

  setFilter: (filter) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
    get().applyFilters();
  },

  setCurrentUser: (userId, role) => {
    set({ currentUserId: userId, currentUserRole: role });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  applyFilters: () => {
    const { events, filter, canViewEvent } = get();
    let filtered = [...events];

    // Filter by visibility and permissions
    filtered = filtered.filter(canViewEvent);

    // Search filter
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filter.eventType !== 'all') {
      filtered = filtered.filter((event) => event.eventType === filter.eventType);
    }

    // User filter
    if (filter.assignedTo !== 'all') {
      filtered = filtered.filter(
        (event) =>
          event.assignedTo === filter.assignedTo ||
          event.participants.includes(filter.assignedTo)
      );
    }

    set({ filteredEvents: filtered });
  },

  // Permission helpers
  canViewEvent: (event) => {
    const { currentUserId, currentUserRole } = get();
    if (!currentUserId) return false;

    // Admins and gestionnaires can see all events
    const isAdmin = currentUserRole === 'admin' || 
                    currentUserRole === 'gestionnaire' || 
                    currentUserRole === 'Gestionnaire';
    
    if (isAdmin) {
      return true;
    }

    // Check visibility
    if (event.visibility === 'all') return true;
    
    if (event.visibility === 'private') {
      return event.createdBy === currentUserId;
    }

    // For 'team' visibility, check if user is creator, assignee, or participant
    return (
      event.createdBy === currentUserId ||
      event.assignedTo === currentUserId ||
      event.participants.includes(currentUserId)
    );
  },

  canEditEvent: (event) => {
    const { currentUserId, currentUserRole } = get();
    if (!currentUserId) return false;

    // Admins can edit all events
    if (currentUserRole === 'admin') return true;

    // Gestionnaires can edit team events
    if (currentUserRole === 'gestionnaire' && event.visibility !== 'private') {
      return true;
    }

    // Creator can always edit their own events
    return event.createdBy === currentUserId;
  },

  getMyEvents: () => {
    const { events, currentUserId } = get();
    if (!currentUserId) return [];

    return events.filter(
      (event) =>
        event.createdBy === currentUserId ||
        event.assignedTo === currentUserId ||
        event.participants.includes(currentUserId)
    );
  },

  getEventsForUser: (userId) => {
    const { events } = get();
    return events.filter(
      (event) =>
        event.assignedTo === userId ||
        event.participants.includes(userId) ||
        event.createdBy === userId
    );
  },
}));
