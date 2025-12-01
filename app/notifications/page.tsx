'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, Filter, X } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  getNotificationIcon,
  formatNotificationTime,
  groupNotificationsByDate,
  getNotificationLink,
} from '@/lib/notification-utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';

function NotificationsPageContent() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate to link if available
    const link = getNotificationLink(notification);
    if (link) {
      router.push(link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread' && notif.isRead) return false;
    if (typeFilter !== 'all' && notif.type !== typeFilter) return false;
    return true;
  });

  // Group by date
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 lg:mb-8"
        >
          <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Notifications</h1>
                <p className="text-sm sm:text-base text-slate-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="gap-2 h-10 sm:h-11 px-4 sm:px-5 text-sm sm:text-base"
              >
                <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Tout marquer comme lu</span>
                <span className="sm:hidden">Tout lire</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-slate-700/40 p-3 sm:p-4 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <span className="text-sm sm:text-base font-medium text-slate-300">Filtres:</span>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="w-full sm:flex-1">
              <TabsList className="glass w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-none text-sm sm:text-base px-4 sm:px-6">
                  Toutes
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 sm:flex-none text-sm sm:text-base px-4 sm:px-6">
                  Non lues
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs sm:text-sm font-bold bg-primary text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[220px] glass h-10 sm:h-11 text-sm sm:text-base">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="glass border-slate-700/40">
                <SelectItem value="all" className="text-sm sm:text-base">Tous les types</SelectItem>
                <SelectItem value="rdv_created" className="text-sm sm:text-base">RDV créés</SelectItem>
                <SelectItem value="rdv_reminder" className="text-sm sm:text-base">Rappels RDV</SelectItem>
                <SelectItem value="devis_created" className="text-sm sm:text-base">Devis créés</SelectItem>
                <SelectItem value="stage_changed" className="text-sm sm:text-base">Changements d'étape</SelectItem>
                <SelectItem value="payment_received" className="text-sm sm:text-base">Paiements reçus</SelectItem>
                <SelectItem value="task_assigned" className="text-sm sm:text-base">Tâches assignées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="glass rounded-2xl border border-slate-700/40 p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-400">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl border border-slate-700/40 p-8 sm:p-12 text-center"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Aucune notification</h3>
            <p className="text-sm sm:text-base text-slate-400">
              {filter === 'unread'
                ? 'Toutes vos notifications sont lues'
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                <motion.div
                  key={dateGroup}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2 sm:space-y-3"
                >
                  {/* Date Header */}
                  <div className="flex items-center gap-3 px-2">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-400">{dateGroup}</h3>
                    <div className="flex-1 h-px bg-slate-700/40" />
                  </div>

                  {/* Notifications in this group */}
                  <div className="space-y-2 sm:space-y-3">
                    {notifs.map((notification) => {
                      const iconConfig = getNotificationIcon(notification.type);
                      const Icon = iconConfig.icon;

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 100 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'group glass rounded-xl sm:rounded-2xl border cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]',
                            notification.isRead
                              ? 'border-slate-700/40 hover:border-slate-600/60'
                              : 'border-primary/30 bg-primary/5 hover:border-primary/50'
                          )}
                        >
                          <div className="flex gap-3 sm:gap-4 p-4 sm:p-5">
                            {/* Icon */}
                            <div className={cn(
                              'shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center',
                              iconConfig.bgColor
                            )}>
                              <Icon className={cn('w-7 h-7 sm:w-8 sm:h-8', iconConfig.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
                                <h4 className={cn(
                                  'text-base sm:text-lg font-semibold leading-tight',
                                  notification.isRead ? 'text-slate-300' : 'text-white'
                                )}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <span className="shrink-0 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-primary shadow-lg shadow-primary/50 mt-1" />
                                )}
                              </div>
                              <p className="text-sm sm:text-base text-slate-400 mb-3 sm:mb-4 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-xs sm:text-sm text-slate-500">
                                  {formatNotificationTime(notification.createdAt)}
                                </span>
                                {notification.linkedName && (
                                  <span className="text-xs sm:text-sm text-primary/70 font-medium">
                                    {notification.linkedName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-slate-700/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="w-5 h-5 sm:w-5 sm:h-5 text-slate-400" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-11 sm:w-11 hover:bg-red-500/20 hover:text-red-400"
                                onClick={(e) => handleDelete(e, notification.id)}
                              >
                                <Trash2 className="w-5 h-5 sm:w-5 sm:h-5" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <NotificationsPageContent />
      </div>
    </AuthGuard>
  );
}
