/**
 * Client-Side Notification Service
 * 
 * Handles browser push notifications and user preferences
 * This file is safe to import in client components
 */

// Service worker registration
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Initialize service worker for push notifications
 */
export async function initServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[Notification] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    serviceWorkerRegistration = registration;
    console.log('[Notification] Service worker registered:', registration.scope);
  } catch (error) {
    console.error('[Notification] Service worker registration failed:', error);
  }
}

/**
 * Get current browser notification permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request browser notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Get user notification preferences
 */
export async function getPreferences(userId: string): Promise<{
  pushEnabled: boolean;
  emailEnabled: boolean;
  email?: string;
} | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return null;
    }

    const response = await fetch(`/api/notifications/preferences?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Notification] Error getting preferences:', error);
    return null;
  }
}

/**
 * Update user notification preferences
 */
export async function updatePreferences(
  userId: string,
  preferences: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    email?: string;
  }
): Promise<boolean> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        ...preferences,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Failed to update preferences: ${response.statusText}`;
      const error = new Error(errorMessage) as any;
      error.response = { status: response.status };
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[Notification] Error updating preferences:', error);
    throw error;
  }
}

/**
 * Client-side notification service object
 */
export const notificationService = {
  initServiceWorker,
  getPermissionStatus,
  requestPermission,
  getPreferences,
  updatePreferences,
};

