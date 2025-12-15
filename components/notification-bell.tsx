'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNotifications } from '@/contexts/notification-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getNotificationIcon,
  formatNotificationTime,
  getNotificationLink,
} from '@/lib/notification-utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read immediately on click
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to link if available
    const link = getNotificationLink(notification);
    if (link) {
      router.push(link);
      setIsOpen(false);
    }
  };

  const handleNotificationHover = (notification: any) => {
    // Auto-mark as read after 1 second of hover (Facebook-style)
    if (!notification.isRead) {
      setHoveredNotificationId(notification.id);
      hoverTimeoutRef.current[notification.id] = setTimeout(async () => {
        await markAsRead(notification.id);
        setHoveredNotificationId(null);
      }, 1000);
    }
  };

  const handleNotificationLeave = (notificationId: string) => {
    // Clear timeout if user leaves before 1 second
    if (hoverTimeoutRef.current[notificationId]) {
      clearTimeout(hoverTimeoutRef.current[notificationId]);
      delete hoverTimeoutRef.current[notificationId];
    }
    setHoveredNotificationId(null);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current[notificationId]) {
      clearTimeout(hoverTimeoutRef.current[notificationId]);
      delete hoverTimeoutRef.current[notificationId];
    }
    await deleteNotification(notificationId);
  };

  // Get recent notifications (last 10)
  const recentNotifications = notifications.slice(0, 10);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('[data-notification-dropdown]') && !target.closest('[data-notification-trigger]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative z-[10000]" data-notification-dropdown>
      <button
        data-notification-trigger
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-slate-800/50 transition-colors flex items-center justify-center"
      >
        <Bell className="h-4 w-4 md:h-5 md:w-5 text-slate-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 min-w-[18px] h-[18px] md:min-w-[20px] md:h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] md:text-xs font-medium flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-[rgb(13,17,28)]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.5,
            }}
            className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px] bg-[rgb(11,14,24)] border border-slate-700/50 shadow-2xl rounded-lg overflow-hidden z-[10000]"
            style={{ transformOrigin: 'top right' }}
          >
        {/* Header - Facebook style */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 bg-[rgb(11,14,24)]">
          <h3 className="text-[15px] font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[13px] font-normal text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800/30"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout marquer lu</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[60vh] sm:h-[500px] max-h-[500px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-800/30 flex items-center justify-center mb-3">
                <Bell className="w-7 h-7 text-slate-600" />
              </div>
              <p className="text-[13px] font-light text-slate-400 text-center">
                Aucune notification pour le moment
              </p>
            </div>
          ) : (
            <div>
              <AnimatePresence mode="popLayout">
                {recentNotifications.map((notification) => {
                  const iconConfig = getNotificationIcon(notification.type);
                  const Icon = iconConfig.icon;
                  const isHovered = hoveredNotificationId === notification.id;
                  const isUnread = !notification.isRead;

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{ 
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                        layout: { duration: 0.3 }
                      }}
                      onMouseEnter={() => handleNotificationHover(notification)}
                      onMouseLeave={() => handleNotificationLeave(notification.id)}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'group relative px-4 py-2.5 cursor-pointer transition-all duration-200',
                        isUnread
                          ? 'bg-blue-500/5 hover:bg-blue-500/10'
                          : 'bg-transparent hover:bg-slate-800/20'
                      )}
                    >
                      <div className="flex gap-3 items-start">
                        {/* Icon - Smaller, more subtle */}
                        <div className={cn(
                          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
                          iconConfig.bgColor,
                          isUnread && 'ring-1 ring-blue-500/20'
                        )}>
                          <Icon className={cn('w-4 h-4', iconConfig.color)} />
                        </div>

                        {/* Content - Thin fonts, clean layout */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h4 className={cn(
                              'text-[13px] font-normal leading-snug',
                              isUnread ? 'text-white' : 'text-slate-300'
                            )}>
                              {notification.title}
                            </h4>
                            {isUnread && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: isHovered ? 0 : 1 }}
                                className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5"
                              />
                            )}
                          </div>
                          <p className="text-[12px] font-light text-slate-400 leading-relaxed line-clamp-2 mb-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-light text-slate-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.linkedName && (
                              <span className="text-[11px] font-light text-blue-400 truncate max-w-[120px]">
                                {notification.linkedName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete button - Only on hover, subtle */}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all duration-200"
                        >
                          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer - Facebook style */}
        {notifications.length > 10 && (
          <div className="px-4 py-3 border-t border-slate-700/30 bg-[rgb(11,14,24)]">
            <button
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
              }}
              className="w-full text-[13px] font-normal text-blue-400 hover:text-blue-300 text-center py-2 rounded hover:bg-slate-800/30 transition-colors"
            >
              Voir toutes les notifications
            </button>
          </div>
        )}
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
