/**
 * Notification Service
 * 
 * Handles both in-app notifications and SMS notifications for architects
 * when contacts are assigned to them.
 * Also handles browser push notifications and user preferences.
 */

import { PrismaClient } from '@prisma/client';
import { sendNotificationSMS, isMoceanConfigured } from './mocean-service';

const prisma = new PrismaClient();

// Service worker registration
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

export type NotificationOptions = {
  userId: string;
  type: 'client_assigned' | 'task_assigned' | 'rdv_created' | 'rdv_reminder';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  linkedType?: string;
  linkedId?: string;
  linkedName?: string;
  metadata?: any;
  createdBy?: string;
  sendSMS?: boolean; // Enable SMS notification
};

/**
 * Send a notification to a user
 * Creates an in-app notification and optionally sends SMS
 */
export async function sendNotification(options: NotificationOptions) {
  const {
    userId,
    type,
    priority,
    title,
    message,
    linkedType,
    linkedId,
    linkedName,
    metadata,
    createdBy,
    sendSMS = false,
  } = options;

  try {
    // 1. Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        priority: priority as any,
        title,
        message,
        linkedType,
        linkedId,
        linkedName,
        metadata,
        createdBy,
      },
    });

    // 2. Send SMS if enabled
    if (sendSMS) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, name: true },
      });

      if (user?.phone) {
        await sendSMSNotification(user.phone, title, message);
      } else {
        console.warn(`[Notification] SMS requested for user ${userId} but no phone number found`);
      }
    }

    return { success: true, notification };
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
    return { success: false, error };
  }
}

/**
 * Send SMS notification using MoceanAPI
 * 
 * Uses the MoceanAPI service configured in lib/mocean-service.ts
 * If MoceanAPI is not configured, only logs the intent
 */
async function sendSMSNotification(phoneNumber: string, title: string, message: string) {
  try {
    // Check if MoceanAPI is configured
    if (!isMoceanConfigured()) {
      console.log(`[SMS] MoceanAPI not configured. Would send to ${phoneNumber}: ${title} - ${message}`);
      console.log(`[SMS] Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env to enable SMS`);
      return { success: true, note: 'SMS sending not yet configured' };
    }

    // Send SMS via MoceanAPI
    const result = await sendNotificationSMS(phoneNumber, title, message);
    
    if (result.success) {
      console.log(`[SMS] Sent to ${phoneNumber}: ${result.messageId}`);
    } else {
      console.error(`[SMS] Failed to send to ${phoneNumber}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`[SMS] Error sending SMS to ${phoneNumber}:`, error);
    return { success: false, error };
  }
}

/**
 * Notify architect when a contact is assigned to them
 */
export async function notifyArchitectContactAssigned(
  architectId: string,
  contact: {
    id: string;
    nom: string;
    telephone: string;
    ville?: string | null;
  },
  options: {
    isReassignment?: boolean;
    previousArchitect?: string | null;
    createdBy?: string;
    sendSMS?: boolean;
  } = {}
) {
  const { isReassignment = false, previousArchitect, createdBy, sendSMS = true } = options;

  const title = isReassignment ? 'Contact Réassigné' : 'Nouveau Contact Assigné';
  const message = isReassignment && previousArchitect
    ? `Le contact "${contact.nom}" vous a été réassigné (précédemment: ${previousArchitect}). Téléphone: ${contact.telephone}`
    : `Le contact "${contact.nom}" vous a été assigné. Téléphone: ${contact.telephone}`;

  return sendNotification({
    userId: architectId,
    type: 'client_assigned',
    priority: 'high',
    title,
    message,
    linkedType: 'contact',
    linkedId: contact.id,
    linkedName: contact.nom,
    metadata: {
      contactPhone: contact.telephone,
      contactVille: contact.ville,
      previousArchitect,
      assignmentType: isReassignment ? 'reassigned' : 'new_assignment',
    },
    createdBy,
    sendSMS,
  });
}

/**
 * Browser Notification Service (Client-side)
 * Handles service worker registration and browser push notifications
 */

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
      return false;
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

    return response.ok;
  } catch (error) {
    console.error('[Notification] Error updating preferences:', error);
    return false;
  }
}

/**
 * Notification Service Object
 * Exports all notification methods as a service object
 */
export const notificationService = {
  // Server-side notification methods
  sendNotification,
  notifyArchitectContactAssigned,
  
  // Browser notification methods
  initServiceWorker,
  getPermissionStatus,
  requestPermission,
  getPreferences,
  updatePreferences,
};
