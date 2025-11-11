import { CalendarEvent, CalendarEventWithDetails } from '@/types/calendar';

export async function fetchCalendarEvents(params?: {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  assignedTo?: string;
}): Promise<CalendarEventWithDetails[]> {
  const queryParams = new URLSearchParams();
  
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.eventType) queryParams.append('eventType', params.eventType);
  if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  console.log('[Calendar Service] Fetching events with token:', token ? 'present' : 'missing');

  const response = await fetch(`/api/calendar?${queryParams.toString()}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!response.ok) {
    console.error('[Calendar Service] Fetch failed:', response.status, response.statusText);
    const error = await response.json().catch(() => ({ error: 'Failed to fetch calendar events' }));
    throw new Error(error.error || 'Failed to fetch calendar events');
  }
  
  const data = await response.json();
  console.log('[Calendar Service] Fetched events:', data.length);
  return data;
}

export async function createCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent' | 'createdBy'> & {
    participants?: string[];
    visibility?: 'private' | 'team' | 'all';
  }
): Promise<CalendarEvent> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      ...eventData,
      participants: eventData.participants || [],
      visibility: eventData.visibility || 'team'
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create event');
  }

  return response.json();
}

export async function updateCalendarEvent(
  id: string,
  eventData: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch('/api/calendar', {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ id, ...eventData }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update event');
  }

  return response.json();
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(`/api/calendar?id=${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete event');
  }
}
