'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, FileText, Bell, Trash2, Edit, BellOff, X } from 'lucide-react';
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
        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur border border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full ${eventConfig.color}`} />
              Détails de l'événement
            </DialogTitle>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mt-4"
          >
            {/* Event Type Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${eventConfig.chipBg} ${eventConfig.chipText} ring-1 ring-border/40`}>
                <span className={`w-2 h-2 rounded-full ${eventConfig.color}`} />
                {eventConfig.label}
              </span>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Date de début
                  </div>
                  <div className="font-semibold text-foreground">
                    {format(new Date(event.startDate), 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Horaire
                  </div>
                  <div className="font-semibold text-foreground">
                    {format(new Date(event.startDate), 'HH:mm', { locale: fr })} - {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned To */}
            {event.assignedToName && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Assigné à
                  </div>
                  <div className="font-semibold text-foreground">{event.assignedToName}</div>
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Localisation
                  </div>
                  <div className="font-semibold text-foreground">{event.location}</div>
                </div>
              </div>
            )}

            {/* Reminder */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Rappel
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{reminderConfig.label}</div>
                  {hasReminder && event.reminderType !== 'none' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReminder}
                      disabled={isCancelingReminder}
                      className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                    >
                      {isCancelingReminder ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Annulation...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Annuler le rappel
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {!hasReminder && event.reminderType !== 'none' && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Rappel annulé
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-background/60 border border-border/40 ring-1 ring-border/30">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </div>
                  <div className="text-foreground/90 whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                <Button onClick={() => onEventEdit(event)} className="gap-2">
                  <Edit className="h-4 w-4" />
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
