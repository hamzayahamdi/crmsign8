'use client';

import { CalendarEventWithDetails } from '@/types/calendar';
import { EVENT_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  X,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface CalendarEventDetailSidebarProps {
  event: CalendarEventWithDetails | null;
  onClose: () => void;
  onEdit?: (event: CalendarEventWithDetails) => void;
  onDelete?: (event: CalendarEventWithDetails) => void;
  onMarkComplete?: (event: CalendarEventWithDetails) => void;
  isOpen: boolean;
}

export function CalendarEventDetailSidebar({
  event,
  onClose,
  onEdit,
  onDelete,
  onMarkComplete,
  isOpen,
}: CalendarEventDetailSidebarProps) {
  if (!event) return null;

  const config = EVENT_TYPE_CONFIG[event.eventType];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyEventDetails = () => {
    const details = `
${event.title}
${format(new Date(event.startDate), 'dd MMMM yyyy HH:mm', { locale: fr })}
${event.location ? `Lieu: ${event.location}` : ''}
${event.description ? `Détails: ${event.description}` : ''}
    `.trim();
    navigator.clipboard.writeText(details);
    toast.success('Détails copiés au presse-papiers');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 20 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`
        fixed right-0 top-0 h-screen w-96 max-w-[90vw]
        bg-background border-l border-border/40 shadow-lg
        overflow-y-auto flex flex-col
        ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h2 className="text-lg font-semibold">Détails de l'événement</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Event Type Badge & Title */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.badgeColor}`}>
              {config.badge}
            </span>
            <span className="text-xs text-muted-foreground">
              {config.category === 'RDV' && 'Rendez-vous'}
              {config.category === 'TASKS' && 'Tâche'}
              {config.category === 'PAYMENTS' && 'Paiement'}
              {config.category === 'DEVIS' && 'Devis'}
              {config.category === 'INTERNAL' && 'Événement interne'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
        </div>

        <Separator />

        {/* Date & Time */}
        <div className="flex items-start gap-3">
          <Clock className={`h-5 w-5 mt-1 flex-shrink-0 ${config.textColor}`} />
          <div>
            <p className="text-sm font-medium mb-1">Date et heure</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.startDate), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.startDate), 'HH:mm', { locale: fr })} —{' '}
              {format(new Date(event.endDate), 'HH:mm', { locale: fr })}
            </p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium mb-1">Lieu</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>
        )}

        {/* Assigned To */}
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium mb-2">Assigné à</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${event.assignedToName}`}
                />
                <AvatarFallback>
                  {getInitials(event.assignedToName || 'Unknown')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{event.assignedToName || 'Non assigné'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        {event.participantDetails && event.participantDetails.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Participants ({event.participantDetails.length})</p>
              <div className="space-y-2">
                {event.participantDetails.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.email}`}
                      />
                      <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{participant.name}</p>
                      <p className="text-xs text-muted-foreground">{participant.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        )}

        {/* Linked Lead/Client */}
        {(event.linkedClientName || event.linkedLeadName) && (
          <>
            <Separator />
            <div className="flex items-start gap-3">
              <ExternalLink className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Lié à</p>
                {event.linkedClientName && (
                  <Button variant="link" className="h-auto p-0 text-blue-600 dark:text-blue-400">
                    Client: {event.linkedClientName}
                  </Button>
                )}
                {event.linkedLeadName && (
                  <Button variant="link" className="h-auto p-0 text-blue-600 dark:text-blue-400">
                    Lead: {event.linkedLeadName}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Created Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
          Créé par {event.createdByName || 'Inconnu'} le{' '}
          {format(new Date(event.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/40 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopyEventDetails}
        >
          <Copy className="h-4 w-4 mr-1" />
          Copier
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(event)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
            )}
            {onMarkComplete && (
              <DropdownMenuItem onClick={() => onMarkComplete(event)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marquer comme fait
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(event)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
