'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, FileText, Bell, Trash2, Edit, BellOff, X, Users, Eye, Shield, CheckSquare, AlertCircle } from 'lucide-react';
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
            className="space-y-4 mt-5"
          >

            {/* Primary Info - Always visible and well structured */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Date - Left Column */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date</div>
                <div className="font-bold text-base text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  {format(new Date(event.startDate), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>

              {/* Time - Middle Column */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Horaire</div>
                <div className="font-bold text-base text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  {format(new Date(event.startDate), 'HH:mm', { locale: fr })} - {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
                </div>
              </div>

              {/* Assigned To - Right Column */}
              {event.assignedToName && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/5 to-green-500/0 border border-green-500/20 hover:border-green-500/40 transition-colors">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Assigné à</div>
                  <div className="font-bold text-base text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600 shrink-0" />
                    {event.assignedToName}
                  </div>
                </div>
              )}
            </div>

            {/* Creator Info - Secondary Row */}
            {event.createdByName && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{event.createdByName}</span> a créé cet événement
                </div>
              </div>
            )}


            {/* Participants Section - Streamlined for team events */}
            {event.eventType !== 'suivi_projet' && event.participantDetails && event.participantDetails.length > 0 && (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-semibold">Équipe</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-200">
                    {event.participantDetails.length + 1} participants
                  </span>
                </div>

                {/* Participants Grid - Clean and organized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Organizer first */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/0 border border-primary/30 hover:border-primary/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{event.assignedToName}</div>
                      <div className="text-xs text-muted-foreground">Organisateur</div>
                    </div>
                  </div>
                  
                  {/* Other participants */}
                  {event.participantDetails.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{participant.name}</div>
                        <div className="text-xs text-muted-foreground">{participant.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}



            {/* Task-Specific Section - Comprehensive and clear */}
            {event.eventType === 'suivi_projet' && (
              <div className="space-y-3">
                {/* Task Header with Details */}
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">Détails de la Tâche</h3>
                </div>

                {/* Task Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Due Date */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/0 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date d'échéance</div>
                    <div className="font-bold text-base text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                      {format(new Date(event.endDate), 'd MMM yyyy', { locale: fr })}
                    </div>
                  </div>

                  {/* Time Allocation */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-violet-500/5 to-violet-500/0 border border-violet-500/20 hover:border-violet-500/40 transition-colors">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Durée prévue</div>
                    <div className="font-bold text-base text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-600 shrink-0" />
                      {format(new Date(event.startDate), 'HH:mm', { locale: fr })} - {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
                    </div>
                  </div>
                </div>

                {/* Task Assignee Section */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-bold shadow-sm">
                      {event.assignedToName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground font-medium">Assigné à</div>
                      <div className="font-semibold text-foreground">{event.assignedToName}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location & Reminder - Clean two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Location */}
              {event.location && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/5 to-amber-500/0 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Localisation</div>
                  <div className="font-semibold text-base text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                    {event.location}
                  </div>
                </div>
              )}

              {/* Reminder */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/5 to-pink-500/0 border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Rappel</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-base text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-pink-600 shrink-0" />
                    {reminderConfig.label}
                  </div>
                  {hasReminder && event.reminderType !== 'none' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReminder}
                      disabled={isCancelingReminder}
                      className="gap-1 h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {isCancelingReminder ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Description/Notes - Clean full-width section */}
            {event.description && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-slate-500/5 to-slate-500/0 border border-slate-500/20">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-slate-600 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes & Description</div>
                    <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {event.description}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Footer - Aligned and organized */}
            <div className="flex justify-between items-center gap-3 pt-4 mt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onClose}
                  className="px-6 hover:bg-muted/50"
                >
                  Fermer
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => onEventEdit(event)} 
                  className="gap-2 px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                >
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
