'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './auth-context';
import { usePathname } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { Notification } from '@/types/notification';
import { 
  getNotificationIcon, 
  shouldShowToast, 
  getNotificationLink 
} from '@/lib/notification-utils';
import { useRouter } from 'next/navigation';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase client
  const supabase = React.useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[NotificationProvider] Supabase credentials not found');
      return null;
    }
    
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/notifications?userId=${user.id}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('[NotificationProvider] Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Show contextual toast notification
  const showToastNotification = useCallback((notification: Notification) => {
    console.log('[NotificationProvider] Showing toast for notification:', notification);
    
    const iconConfig = getNotificationIcon(notification.type);
    const Icon = iconConfig.icon;
    const link = getNotificationLink(notification);

    // Determine if we should show toast
    const shouldShow = shouldShowToast(notification.type, notification.priority, pathname, notification.linkedId);
    console.log('[NotificationProvider] Should show toast:', shouldShow, {
      type: notification.type,
      priority: notification.priority,
      pathname,
      linkedId: notification.linkedId
    });
    
    if (!shouldShow) {
      console.log('[NotificationProvider] Skipping toast due to shouldShowToast filter');
      return;
    }

    try {
      sonnerToast(notification.title, {
        description: notification.message,
        icon: <Icon className={`w-5 h-5 ${iconConfig.color}`} />,
        duration: notification.priority === 'high' ? 8000 : 5000,
        action: link ? {
          label: 'Voir',
          onClick: () => router.push(link)
        } : undefined,
        className: 'glass border-slate-700/40',
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(71, 85, 105, 0.4)',
        }
      });
      console.log('[NotificationProvider] Toast displayed successfully');
    } catch (error) {
      console.error('[NotificationProvider] Error showing toast:', error);
    }
  }, [pathname, router]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[NotificationProvider] Error marking as read:', error);
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('[NotificationProvider] Error marking all as read:', error);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => {
          const notification = notifications.find(n => n.id === notificationId);
          return notification && !notification.isRead ? Math.max(0, prev - 1) : prev;
        });
      }
    } catch (error) {
      console.error('[NotificationProvider] Error deleting notification:', error);
    }
  }, [user?.id, notifications]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Setup Supabase realtime subscription
  useEffect(() => {
    if (!supabase || !user?.id) {
      console.log('[NotificationProvider] Skipping realtime setup:', { 
        hasSupabase: !!supabase, 
        hasUser: !!user?.id 
      });
      return;
    }

    console.log('[NotificationProvider] Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[NotificationProvider] New notification received via realtime:', payload);
          const newNotification = payload.new as Notification;
          
          console.log('[NotificationProvider] Parsed notification:', {
            id: newNotification.id,
            type: newNotification.type,
            title: newNotification.title,
            userId: newNotification.userId,
            priority: newNotification.priority
          });
          
          // Add to state
          setNotifications(prev => {
            console.log('[NotificationProvider] Adding notification to state, current count:', prev.length);
            return [newNotification, ...prev];
          });
          setUnreadCount(prev => {
            const newCount = prev + 1;
            console.log('[NotificationProvider] Incrementing unread count:', prev, '->', newCount);
            return newCount;
          });
          
          // Show toast if appropriate
          console.log('[NotificationProvider] Attempting to show toast notification');
          showToastNotification(newNotification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[NotificationProvider] Notification updated:', payload);
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[NotificationProvider] Notification deleted:', payload);
          const deletedId = payload.old.id;
          
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log('[NotificationProvider] Subscription status:', status);
      });

    return () => {
      console.log('[NotificationProvider] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, showToastNotification]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
