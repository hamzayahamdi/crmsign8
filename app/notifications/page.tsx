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
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Notifications</h1>
                <p className="text-sm text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl border border-slate-700/40 p-4 mb-6"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Filtres:</span>
            </div>
            
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="flex-1">
              <TabsList className="glass">
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="unread">
                  Non lues
                  {unreadCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px] glass">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="glass border-slate-700/40">
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="rdv_created">RDV créés</SelectItem>
                <SelectItem value="rdv_reminder">Rappels RDV</SelectItem>
                <SelectItem value="devis_created">Devis créés</SelectItem>
                <SelectItem value="stage_changed">Changements d'étape</SelectItem>
                <SelectItem value="payment_received">Paiements reçus</SelectItem>
                <SelectItem value="task_assigned">Tâches assignées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="glass rounded-2xl border border-slate-700/40 p-12 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Chargement des notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl border border-slate-700/40 p-12 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Aucune notification</h3>
            <p className="text-sm text-slate-400">
              {filter === 'unread' 
                ? 'Toutes vos notifications sont lues' 
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedNotifications).map(([dateGroup, notifs]) => (
                <motion.div
                  key={dateGroup}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-2"
                >
                  {/* Date Header */}
                  <div className="flex items-center gap-3 px-2">
                    <h3 className="text-sm font-semibold text-slate-400">{dateGroup}</h3>
                    <div className="flex-1 h-px bg-slate-700/40" />
                  </div>

                  {/* Notifications in this group */}
                  <div className="space-y-2">
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
                            'group glass rounded-xl border cursor-pointer transition-all hover:shadow-lg',
                            notification.isRead
                              ? 'border-slate-700/40 hover:border-slate-600/60'
                              : 'border-primary/30 bg-primary/5 hover:border-primary/50'
                          )}
                        >
                          <div className="flex gap-4 p-4">
                            {/* Icon */}
                            <div className={cn(
                              'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
                              iconConfig.bgColor
                            )}>
                              <Icon className={cn('w-6 h-6', iconConfig.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={cn(
                                  'text-base font-semibold',
                                  notification.isRead ? 'text-slate-300' : 'text-white'
                                )}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                                )}
                              </div>
                              <p className="text-sm text-slate-400 mb-3">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                  {formatNotificationTime(notification.createdAt)}
                                </span>
                                {notification.linkedName && (
                                  <span className="text-xs text-primary/70 font-medium">
                                    {notification.linkedName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 hover:bg-slate-700/50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="w-4 h-4 text-slate-400" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 hover:bg-red-500/20 hover:text-red-400"
                                onClick={(e) => handleDelete(e, notification.id)}
                              >
                                <Trash2 className="w-4 h-4" />
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
