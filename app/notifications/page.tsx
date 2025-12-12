'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, MoreVertical } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-3xl mx-auto">
        {/* Compact Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-slate-800/50">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Tout marquer comme lu
              </Button>
            )}
          </div>

          {/* Compact Filters */}
          <div className="px-4 pb-2 flex items-center gap-1.5 border-b border-slate-800/30">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded transition-colors',
                filter === 'all'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              )}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded transition-colors relative',
                filter === 'unread'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              )}
            >
              Non lues
              {unreadCount > 0 && (
                <span className="ml-1 px-1 py-0.5 text-[9px] font-bold bg-blue-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="flex-1" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-6 w-auto px-2 text-[11px] border-0 bg-transparent hover:bg-slate-800/50 text-slate-400 focus:ring-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="min-w-[140px]">
                <SelectItem value="all" className="text-[11px]">Tous les types</SelectItem>
                <SelectItem value="rdv_created" className="text-[11px]">RDV créés</SelectItem>
                <SelectItem value="rdv_reminder" className="text-[11px]">Rappels RDV</SelectItem>
                <SelectItem value="devis_created" className="text-[11px]">Devis créés</SelectItem>
                <SelectItem value="stage_changed" className="text-[11px]">Changements d'étape</SelectItem>
                <SelectItem value="payment_received" className="text-[11px]">Paiements reçus</SelectItem>
                <SelectItem value="task_assigned" className="text-[11px]">Tâches assignées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              {filter === 'unread'
                ? 'Toutes vos notifications sont lues'
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </div>
        ) : (
          <div>
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedNotifications).map(([dateGroup, notifs], groupIdx) => (
                <motion.div 
                  key={dateGroup} 
                  className="py-1"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.05, duration: 0.2 }}
                >
                  {/* Date Header */}
                  <motion.div 
                    className="px-4 py-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{dateGroup}</h3>
                  </motion.div>

                  {/* Notifications in this group */}
                  <div>
                    {notifs.map((notification, idx) => {
                      const iconConfig = getNotificationIcon(notification.type);
                      const Icon = iconConfig.icon;

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                          }}
                          exit={{ opacity: 0, x: 100 }}
                          transition={{ 
                            duration: 0.2,
                            layout: { duration: 0.3 }
                          }}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            'group relative flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-all duration-300 overflow-hidden',
                            notification.isRead 
                              ? 'bg-blue-500/5 hover:bg-blue-500/10' 
                              : 'bg-blue-500/15 hover:bg-blue-500/20',
                            idx !== notifs.length - 1 && 'border-b border-slate-800/30'
                          )}
                        >
                          {/* Animated left border accent for unread */}
                          {!notification.isRead && (
                            <>
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"
                                initial={{ scaleY: 0 }}
                                animate={{ 
                                  scaleY: 1,
                                }}
                                transition={{ 
                                  scaleY: { duration: 0.3, ease: "easeOut" }
                                }}
                              />
                              {/* Glow effect for border */}
                              <motion.div
                                className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/40 blur-sm"
                                initial={{ scaleY: 0, opacity: 0 }}
                                animate={{ 
                                  scaleY: 1,
                                  opacity: [0.4, 0.6, 0.4],
                                }}
                                transition={{ 
                                  scaleY: { duration: 0.3, ease: "easeOut" },
                                  opacity: {
                                    duration: 2.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }
                                }}
                              />
                            </>
                          )}
                          {/* Unread background highlight */}
                          {!notification.isRead && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-blue-500/5 pointer-events-none"
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: [0.6, 0.8, 0.6],
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          )}

                          {/* Icon */}
                          <motion.div 
                            className={cn(
                              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center relative z-10 transition-colors duration-300',
                              notification.isRead 
                                ? 'bg-blue-500/15' 
                                : 'bg-blue-500/25 ring-2 ring-blue-500/30'
                            )}
                            animate={{
                              scale: notification.isRead ? 1 : [1, 1.08, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: notification.isRead ? 0 : Infinity,
                              repeatDelay: 3,
                              scale: { duration: 0.3 }
                            }}
                          >
                            <motion.div
                              animate={{
                                scale: notification.isRead ? [1, 1.1, 1] : 1,
                              }}
                              transition={{
                                duration: 0.4,
                                times: [0, 0.5, 1]
                              }}
                            >
                              <Icon className={cn(
                                'w-4 h-4 transition-colors duration-300',
                                notification.isRead ? 'text-blue-400' : 'text-blue-400'
                              )} />
                            </motion.div>
                          </motion.div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 relative z-10">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <motion.h4 
                                className={cn(
                                  'text-xs leading-snug transition-colors duration-300',
                                  notification.isRead 
                                    ? 'text-blue-200 font-medium' 
                                    : 'text-white font-bold'
                                )}
                                animate={{
                                  color: notification.isRead 
                                    ? 'rgb(191, 219, 254)' 
                                    : 'rgb(255, 255, 255)',
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                {notification.title}
                              </motion.h4>
                              <AnimatePresence>
                                {!notification.isRead && (
                                  <motion.span 
                                    className="shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shadow-lg shadow-blue-500/50"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                      scale: [1, 1.4, 1],
                                      opacity: [1, 0.8, 1],
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                      scale: {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      },
                                      opacity: {
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      },
                                      exit: { duration: 0.2 }
                                    }}
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                            <motion.p 
                              className={cn(
                                'text-[11px] leading-relaxed mb-1.5 line-clamp-2 transition-colors duration-300',
                                notification.isRead 
                                  ? 'text-blue-300/70' 
                                  : 'text-slate-200 font-medium'
                              )}
                              animate={{
                                color: notification.isRead 
                                  ? 'rgba(147, 197, 253, 0.7)' 
                                  : 'rgb(226, 232, 240)',
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              {notification.message}
                            </motion.p>
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-[10px]',
                                notification.isRead 
                                  ? 'text-blue-400/60' 
                                  : 'text-slate-300 font-medium'
                              )}>
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                              {notification.linkedName && (
                                <span className={cn(
                                  'text-[10px] font-medium truncate max-w-[120px]',
                                  notification.isRead 
                                    ? 'text-blue-300/80' 
                                    : 'text-blue-400 font-semibold'
                                )}>
                                  {notification.linkedName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity p-0 hover:bg-slate-700/50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {!notification.isRead && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-xs"
                                >
                                  <CheckCheck className="w-3.5 h-3.5 mr-2" />
                                  Marquer comme lu
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => handleDelete(e, notification.id)}
                                className="text-xs text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
