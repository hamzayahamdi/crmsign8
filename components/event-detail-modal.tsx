'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, FileText, Bell, Trash2, Edit, BellOff, X, Users, Eye, Shield } from 'lucide-react';
import { deleteCalendarEvent } from '@/lib/calendar-service';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventDetailModalProps {
  event: CalendarEventWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onEventDeleted: () => void;
  onEventEdit: (event: CalendarEventWithDetails) => void;
}

export function EventDetailModal({ 
  event, 
  isOpen, 
  onClose, 
  onEventDeleted,
  onEventEdit 
}: EventDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCancelingReminder, setIsCancelingReminder] = useState(false);
  const [hasReminder, setHasReminder] = useState(() => {
    return event?.reminderType !== 'none';
  });

  if (!event) return null;

  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
  const reminderConfig = REMINDER_TYPE_CONFIG[event.reminderType];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete reminder first if exists
      if (hasReminder) {
        try {
          await fetch(`/api/reminders?eventId=${event.id}&userId=${event.assignedTo}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch (reminderError) {
          console.error('Error deleting reminder:', reminderError);
          // Continue with event deletion even if reminder deletion fails
        }
      }
      
      await deleteCalendarEvent(event.id);
      toast.success('Événement supprimé avec succès');
      setShowDeleteDialog(false);
      onEventDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression de l\'événement');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelReminder = async () => {
    setIsCancelingReminder(true);
    try {
      const response = await fetch(`/api/reminders?eventId=${event.id}&userId=${event.assignedTo}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setHasReminder(false);
        toast.success('Rappel annulé avec succès', {
          description: 'Vous ne recevrez plus de notification pour cet événement',
          duration: 4000,
        });
      } else {
        throw new Error('Failed to cancel reminder');
      }
    } catch (error) {
      console.error('Error canceling reminder:', error);
      toast.error('Erreur lors de l\'annulation du rappel');
    } finally {
      setIsCancelingReminder(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[96vw] bg-background/95 backdrop-blur border border-border/60 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${eventConfig.chipBg} ${eventConfig.chipText} ring-1 ring-border/40`}>
                    <span className={`w-2 h-2 rounded-full ${eventConfig.color}`} />
                    {eventConfig.label}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2 bg-muted/50 text-muted-foreground ring-1 ring-border/40">
                    <Eye className="h-3.5 w-3.5" />
                    {event.visibility === 'private' && 'Privé'}
                    {event.visibility === 'team' && 'Équipe'}
                    {event.visibility === 'all' && 'Public'}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 mt-5"
          >
            {/* Key Info Grid - Compact 4 columns */}
            <div className="grid grid-cols-4 gap-3">
              {/* Date */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/20">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">Date</div>
                  <div className="font-semibold text-sm truncate">
                    {format(new Date(event.startDate), 'd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-500/20">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">Horaire</div>
                  <div className="font-semibold text-sm">
                    {format(new Date(event.startDate), 'HH:mm', { locale: fr })} - {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              {/* Assigned To */}
              {event.assignedToName && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/0 border border-green-500/20">
                  <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Assigné à</div>
                    <div className="font-semibold text-sm truncate">{event.assignedToName}</div>
                  </div>
                </div>
              )}

              {/* Creator */}
              {event.createdByName && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/0 border border-purple-500/20">
                  <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Créé par</div>
                    <div className="font-semibold text-sm truncate">{event.createdByName}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Participants - Team Meeting Display - Compact */}
            {event.participantDetails && event.participantDetails.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/0 border border-orange-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">Réunion d'équipe</div>
                      <div className="text-xs text-muted-foreground">{event.participantDetails.length + 1} participants</div>
                    </div>
                  </div>
                  
                  {/* Compact Avatars */}
                  <div className="flex items-center -space-x-2">
                    <div className="relative group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md z-20">
                        {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                      </div>
                    </div>
                    {event.participantDetails.slice(0, 4).map((participant, idx) => (
                      <div key={participant.id} className="relative group">
                        <div 
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md"
                          style={{ zIndex: 19 - idx }}
                        >
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    ))}
                    {event.participantDetails.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md">
                        +{event.participantDetails.length - 4}
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Participants Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Assigned user first */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-foreground truncate">{event.assignedToName}</div>
                      <div className="text-[10px] text-muted-foreground">Organisateur</div>
                    </div>
                  </div>
                  
                  {/* Other participants */}
                  {event.participantDetails.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/30">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-foreground truncate">{participant.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{participant.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Reminder - Same Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-amber-500/5 to-amber-500/0 border border-amber-500/20">
                  <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                    <MapPin className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">Localisation</div>
                    <div className="font-semibold text-sm truncate">{event.location}</div>
                  </div>
                </div>
              )}

              {/* Reminder */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-pink-500/5 to-pink-500/0 border border-pink-500/20">
                <div className="p-2 bg-pink-500/10 rounded-lg shrink-0">
                  <Bell className="h-4 w-4 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-0.5">Rappel</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm truncate">{reminderConfig.label}</div>
                    {hasReminder && event.reminderType !== 'none' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelReminder}
                        disabled={isCancelingReminder}
                        className="gap-1 h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        {isCancelingReminder ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {!hasReminder && event.reminderType !== 'none' && (
                    <p className="text-[10px] text-muted-foreground italic">Annulé</p>
                  )}
                </div>
              </div>
            </div>

            {/* Description - Full Width */}
            {event.description && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-slate-500/5 to-slate-500/0 border border-slate-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-500/10 rounded-lg shrink-0">
                    <FileText className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1.5">Notes</div>
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {event.description}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions - Compact Footer */}
            <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="px-6">
                  Fermer
                </Button>
                <Button size="sm" onClick={() => onEventEdit(event)} className="gap-2 px-6 bg-gradient-to-r from-primary to-primary/90">
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
