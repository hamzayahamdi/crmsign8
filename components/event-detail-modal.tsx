'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEventWithDetails, EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG } from '@/types/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Users,
    Bell,
    Edit,
    Trash2,
    X,
    Building,
    UserCircle,
    Eye,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
    onEventEdit,
}: EventDetailModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!event) return null;

    const eventConfig = EVENT_TYPE_CONFIG[event.eventType];

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
            return;
        }

        try {
            setIsDeleting(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/calendar?id=${event.id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression');
            }

            toast.success('Événement supprimé avec succès');
            onEventDeleted();
            onClose();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Erreur lors de la suppression de l\'événement');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format(d, 'EEEE d MMMM yyyy', { locale: fr });
    };

    const formatTime = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return format(d, 'HH:mm', { locale: fr });
    };

    const getVisibilityLabel = (visibility: string) => {
        switch (visibility) {
            case 'private':
                return 'Privé';
            case 'team':
                return 'Équipe';
            case 'all':
                return 'Tous';
            default:
                return visibility;
        }
    };

    const getVisibilityIcon = (visibility: string) => {
        switch (visibility) {
            case 'private':
                return <Eye className="w-4 h-4" />;
            case 'team':
                return <Users className="w-4 h-4" />;
            case 'all':
                return <Building className="w-4 h-4" />;
            default:
                return <Eye className="w-4 h-4" />;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-semibold",
                                    eventConfig.badgeColor
                                )}>
                                    {eventConfig.badge}
                                </span>
                                <span className={cn(
                                    "px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1",
                                    "bg-slate-800 text-slate-300"
                                )}>
                                    {getVisibilityIcon(event.visibility)}
                                    {getVisibilityLabel(event.visibility)}
                                </span>
                            </div>
                            <DialogTitle className="text-2xl font-bold text-white">
                                {event.title}
                            </DialogTitle>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                    {/* Description */}
                    {event.description && (
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Date</p>
                                <p className="text-sm font-medium text-white capitalize">
                                    {formatDate(event.startDate)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Horaire</p>
                                <p className="text-sm font-medium text-white">
                                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Lieu</p>
                                <p className="text-sm font-medium text-white">{event.location}</p>
                            </div>
                        </div>
                    )}

                    {/* Assigned To */}
                    {event.assignedToName && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Assigné à</p>
                                <p className="text-sm font-medium text-white">{event.assignedToName}</p>
                            </div>
                        </div>
                    )}

                    {/* Participants */}
                    {event.participantDetails && event.participantDetails.length > 0 && (
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-5 h-5 text-slate-400" />
                                <p className="text-xs text-slate-500 uppercase tracking-wide">
                                    Participants ({event.participantDetails.length})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {event.participantDetails.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <UserCircle className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {participant.name}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{participant.email}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                                            {participant.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reminder */}
                    {event.reminderType && event.reminderType !== 'none' && (
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Rappel</p>
                                <p className="text-sm font-medium text-white">
                                    {REMINDER_TYPE_CONFIG[event.reminderType]?.label || event.reminderType}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Linked Entities */}
                    {(event.linkedClientName || event.linkedLeadName || event.linkedArchitectName) && (
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Liens</p>
                            <div className="space-y-2">
                                {event.linkedClientName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <Building className="w-4 h-4 text-blue-400" />
                                        <span className="text-slate-500">Client:</span>
                                        <span className="font-medium text-white">{event.linkedClientName}</span>
                                    </div>
                                )}
                                {event.linkedLeadName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <UserCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-slate-500">Lead:</span>
                                        <span className="font-medium text-white">{event.linkedLeadName}</span>
                                    </div>
                                )}
                                {event.linkedArchitectName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <User className="w-4 h-4 text-purple-400" />
                                        <span className="text-slate-500">Architecte:</span>
                                        <span className="font-medium text-white">{event.linkedArchitectName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Created By */}
                    {event.createdByName && (
                        <div className="text-xs text-slate-500 text-center">
                            Créé par {event.createdByName} le{' '}
                            {format(new Date(event.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-slate-700">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                    >
                        Fermer
                    </Button>
                    <Button
                        onClick={() => onEventEdit(event)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
