'use client';

import { NotificationPreferences } from '@/types/calendar';

// VAPID keys - these should be generated and stored securely
// For production, use environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export class NotificationService {
  private static instance: NotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize service worker
   */
  async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[NotificationService] Service Worker registered:', registration);
      this.swRegistration = registration;

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('[NotificationService] Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      await this.initServiceWorker();
    }

    if (!this.swRegistration) {
      console.error('[NotificationService] No service worker registration');
      return null;
    }

    try {
      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe to push notifications
        const applicationServerKey = this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource
        });

        console.log('[NotificationService] Push subscription created:', subscription);
      }

      // Save subscription to backend
      await this.savePushSubscription(userId, subscription);

      return subscription;
    } catch (error) {
      console.error('[NotificationService] Failed to subscribe to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await this.removePushSubscription(userId);
        console.log('[NotificationService] Unsubscribed from push');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NotificationService] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Save push subscription to backend
   */
  private async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save push subscription');
      }
    } catch (error) {
      console.error('[NotificationService] Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Remove push subscription from backend
   */
  private async removePushSubscription(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove push subscription');
      }
    } catch (error) {
      console.error('[NotificationService] Error removing subscription:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get preferences');
      }

      return response.json();
    } catch (error) {
      console.error('[NotificationService] Error getting preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId: string, preferences: NotificationPreferences): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, ...preferences })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      // If push is enabled, subscribe
      if (preferences.pushEnabled) {
        await this.subscribeToPush(userId);
      } else {
        await this.unsubscribeFromPush(userId);
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Error updating preferences:', error);
      return false;
    }
  }

  /**
   * Show a local notification (for testing or immediate notifications)
   */
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      if (this.swRegistration) {
        // Use service worker to show notification
        await this.swRegistration.showNotification(title, {
          icon: '/favicon-32x32.png',
          badge: '/favicon-32x32.png',
          ...options
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          icon: '/favicon-32x32.png',
          ...options
        });
      }
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String) {
      return new Uint8Array(0);
    }
    
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           'serviceWorker' in navigator &&
           'PushManager' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

export const notificationService = NotificationService.getInstance();
