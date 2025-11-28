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
          className="relative h-9 w-9 md:h-10 md:w-10 rounded-full hover:bg-slate-800/50 transition-colors"
        >
          <Bell className="h-4 w-4 md:h-5 md:w-5 text-slate-300" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 min-w-[18px] h-[18px] md:min-w-[20px] md:h-5 px-1 rounded-full bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] md:text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-[rgb(13,17,28)]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px] p-0 glass border-slate-700/40 shadow-2xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className="font-semibold text-white text-sm md:text-base">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-bold bg-primary/20 text-primary rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-7 md:h-8 text-[10px] md:text-xs text-slate-400 hover:text-white px-2 md:px-3"
            >
              <CheckCheck className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              <span className="hidden sm:inline">Tout marquer lu</span>
              <span className="sm:hidden">Lu</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[60vh] sm:h-[480px] max-h-[480px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-2 md:mb-3">
                <Bell className="w-6 h-6 md:w-8 md:h-8 text-slate-600" />
              </div>
              <p className="text-xs md:text-sm text-slate-400 text-center">
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
                        'group relative p-3 md:p-4 cursor-pointer transition-colors',
                        notification.isRead
                          ? 'bg-transparent hover:bg-slate-800/30'
                          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                      )}
                    >
                      <div className="flex gap-2 md:gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center',
                          iconConfig.bgColor
                        )}>
                          <Icon className={cn('w-4 h-4 md:w-5 md:h-5', iconConfig.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={cn(
                              'text-xs md:text-sm font-semibold truncate',
                              notification.isRead ? 'text-slate-300' : 'text-white'
                            )}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="shrink-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary shadow-lg shadow-primary/50" />
                            )}
                          </div>
                          <p className="text-[10px] md:text-xs text-slate-400 line-clamp-2 mb-1 md:mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] md:text-xs text-slate-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            {notification.linkedName && (
                              <span className="text-[10px] md:text-xs text-primary/70 truncate max-w-[100px] md:max-w-[150px]">
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
