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

  const response = await fetch(`/api/calendar?${queryParams.toString()}`, {
    credentials: 'include', // Include cookies for authentication
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch calendar events' }));
    throw new Error(error.error || 'Failed to fetch calendar events');
  }
  
  return response.json();
}

export async function createCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent' | 'createdBy'>
): Promise<CalendarEvent> {
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
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
  const response = await fetch('/api/calendar', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`/api/calendar?id=${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete event');
  }
}
