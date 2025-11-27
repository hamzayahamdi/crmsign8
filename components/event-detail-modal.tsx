'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  Bell,
  Trash2,
  Edit,
  BellOff,
  X,
  Users,
  Eye,
  Shield,
  CheckSquare,
  AlertCircle,
  Mail,
  Phone
} from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
        toast.success('Rappel annulé avec succès');
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

  // Helper function to check if a string is an ID
  const isLikelyId = (str: string | undefined): boolean => {
    if (!str) return true;
    const hasSpaces = str.includes(' ');
    const isLong = str.length > 20;
    const startsWithLowercase = /^[a-z]/.test(str);
    const looksRandom = /^[a-z0-9]{15,}$/i.test(str);
    return !hasSpaces && (isLong || looksRandom) && startsWithLowercase;
  };

  const displayAssignedToName = event.assignedToName && !isLikelyId(event.assignedToName)
    ? event.assignedToName
    : 'Non assigné';
  const displayCreatedByName = event.createdByName && !isLikelyId(event.createdByName)
    ? event.createdByName
    : 'Utilisateur inconnu';

  // Determine if we should show participants section (Always for RDV, or if there are participants)
  const isRDV = event.eventType === 'rendez_vous' || event.eventType === 'appel_reunion';
  const hasParticipants = event.participantDetails && event.participantDetails.length > 0;
  const showParticipantsSection = isRDV || hasParticipants;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl rounded-xl sm:rounded-2xl">
          {/* Header with Color Strip */}
          <div className={`h-3 w-full ${eventConfig.color.replace('text-', 'bg-')}`} />

          <div className="p-6 sm:p-8 overflow-y-auto max-h-[85vh]">
            {/* Title and Actions Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl sm:text-3xl font-normal text-foreground leading-tight">
                  {event.title.replace('[TÂCHE] ', '')}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={`font-medium ${eventConfig.chipBg} ${eventConfig.chipText} border-0`}>
                    {eventConfig.label}
                  </Badge>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {event.visibility === 'private' && 'Privé'}
                    {event.visibility === 'team' && 'Équipe'}
                    {event.visibility === 'all' && 'Public'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEventEdit(event)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full"
                  title="Modifier"
                >
                  <Edit className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-full"
                  title="Supprimer"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full"
                  title="Fermer"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="mt-1 p-2 rounded-lg bg-muted/30">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-lg font-medium text-foreground">
                    {format(new Date(event.startDate), 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                  <div className="text-base text-muted-foreground mt-0.5">
                    {format(new Date(event.startDate), 'HH:mm', { locale: fr })} - {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
                  </div>
                  {event.reminderType !== 'none' && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground bg-muted/20 px-2 py-1 rounded w-fit">
                      <Bell className="h-3.5 w-3.5" />
                      <span>{reminderConfig.label}</span>
                      {hasReminder && (
                        <button
                          onClick={handleCancelReminder}
                          disabled={isCancelingReminder}
                          className="ml-2 text-xs hover:underline text-muted-foreground hover:text-foreground"
                        >
                          (Annuler)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-lg bg-muted/30">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-lg text-foreground">{event.location}</div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-0.5 block"
                    >
                      Voir sur la carte
                    </a>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </div>
                </div>
              )}

              <Separator />

              {/* People Section */}
              <div className="space-y-6">
                {/* Organizer / Assigned To */}
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded-lg bg-muted/30">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Organisateur</div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {displayAssignedToName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-foreground">{displayAssignedToName}</div>
                        <div className="text-xs text-muted-foreground">Responsable de l'événement</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                {showParticipantsSection && (
                  <div className="flex items-start gap-4">
                    <div className="mt-1 p-2 rounded-lg bg-muted/30">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Participants</div>
                        <Badge variant="outline" className="font-normal">
                          {event.participantDetails?.length || 0} invité{(event.participantDetails?.length || 0) > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {(!event.participantDetails || event.participantDetails.length === 0) ? (
                        <div className="text-sm text-muted-foreground italic py-2">
                          Aucun participant invité
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {event.participantDetails.map((participant) => {
                            const participantName = participant.name && !isLikelyId(participant.name)
                              ? participant.name
                              : 'Participant inconnu';

                            return (
                              <div key={participant.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card/50">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {participantName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{participantName}</div>
                                  <div className="text-xs text-muted-foreground truncate">{participant.email || participant.role}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Created By (Footer Info) */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 pl-[52px]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Créé par <span className="font-medium text-foreground/80">{displayCreatedByName}</span></span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'événement sera définitivement supprimé de votre calendrier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-lg">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
