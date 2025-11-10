'use client';

import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/notification-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getNotificationIcon,
  formatNotificationTime,
  getNotificationLink,
} from '@/lib/notification-utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
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

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  // Get recent notifications (last 10)
  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-slate-800/50 transition-colors"
        >
          <Bell className="h-5 w-5 text-slate-300" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[420px] p-0 glass border-slate-700/40 shadow-2xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs text-slate-400 hover:text-white"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[480px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 text-center">
                Aucune notification pour le moment
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              <AnimatePresence mode="popLayout">
                {recentNotifications.map((notification) => {
                  const iconConfig = getNotificationIcon(notification.type);
                  const Icon = iconConfig.icon;

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'group relative p-4 cursor-pointer transition-colors',
                        notification.isRead
                          ? 'bg-transparent hover:bg-slate-800/30'
                          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                          iconConfig.bgColor
                        )}>
                          <Icon className={cn('w-5 h-5', iconConfig.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'text-sm font-semibold truncate',
                              notification.isRead ? 'text-slate-300' : 'text-white'
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.linkedName && (
                              <span className="text-xs text-primary/70 truncate max-w-[150px]">
                                {notification.linkedName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-slate-700/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-500/20 hover:text-red-400"
                            onClick={(e) => handleDelete(e, notification.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 10 && (
          <div className="p-3 border-t border-slate-700/40">
            <Button
              variant="ghost"
              className="w-full text-sm text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
              }}
            >
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
