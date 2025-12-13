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

// Event Detail Modal Component
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f1117] border-slate-700/50 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border",
                                    eventConfig.badgeColor.replace('bg-', 'bg-opacity-10 border-').replace('text-', 'text-')
                                )}>
                                    {eventConfig.badge}
                                </span>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5",
                                    "bg-slate-800/50 border border-slate-700/50 text-slate-300"
                                )}>
                                    {getVisibilityIcon(event.visibility)}
                                    {getVisibilityLabel(event.visibility)}
                                </span>
                            </div>
                            <DialogTitle className="text-2xl font-light text-slate-100 leading-tight">
                                {event.title}
                            </DialogTitle>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                    {/* Description */}
                    {event.description && (
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <p className="text-sm font-light text-slate-200 whitespace-pre-wrap leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4.5 h-4.5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Date</p>
                                <p className="text-sm font-medium text-slate-200 capitalize">
                                    {formatDate(event.startDate)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4.5 h-4.5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Horaire</p>
                                <p className="text-sm font-medium text-slate-200">
                                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4.5 h-4.5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Lieu</p>
                                <p className="text-sm font-medium text-slate-200">{event.location}</p>
                            </div>
                        </div>
                    )}

                    {/* Assigned To */}
                    {event.assignedToName && (
                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-4.5 h-4.5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assigné à</p>
                                <p className="text-sm font-medium text-slate-200">{event.assignedToName}</p>
                            </div>
                        </div>
                    )}

                    {/* Participants */}
                    {event.participantDetails && event.participantDetails.length > 0 && (
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4.5 h-4.5 text-slate-400" />
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Participants ({event.participantDetails.length})
                                </p>
                            </div>
                            <div className="space-y-2">
                                {event.participantDetails.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/50"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <UserCircle className="w-4.5 h-4.5 text-blue-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-normal text-slate-200 truncate">
                                                {participant.name}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{participant.email}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded border border-slate-700/50 text-xs font-medium bg-slate-800/50 text-slate-400 capitalize">
                                            {participant.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reminder */}
                    {event.reminderType && event.reminderType !== 'none' && (
                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                                <Bell className="w-4.5 h-4.5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Rappel</p>
                                <p className="text-sm font-medium text-slate-200">
                                    {REMINDER_TYPE_CONFIG[event.reminderType]?.label || event.reminderType}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Linked Entities */}
                    {(event.linkedClientName || event.linkedLeadName || event.linkedArchitectName) && (
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Liens</p>
                            <div className="space-y-2">
                                {event.linkedClientName && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                        <Building className="w-4 h-4 text-blue-400" />
                                        <span className="text-slate-500 font-normal">Client:</span>
                                        <span className="font-normal text-slate-200">{event.linkedClientName}</span>
                                    </div>
                                )}
                                {event.linkedLeadName && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                        <UserCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-slate-500 font-normal">Lead:</span>
                                        <span className="font-normal text-slate-200">{event.linkedLeadName}</span>
                                    </div>
                                )}
                                {event.linkedArchitectName && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-300">
                                        <User className="w-4 h-4 text-purple-400" />
                                        <span className="text-slate-500 font-normal">Architecte:</span>
                                        <span className="font-normal text-slate-200">{event.linkedArchitectName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Created By */}
                    {event.createdByName && (
                        <div className="text-xs font-light text-slate-500 text-center uppercase tracking-wide">
                            Créé par {event.createdByName} le{' '}
                            {format(new Date(event.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-slate-700/50">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1 h-10 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-sm font-normal rounded-lg border border-slate-700/50"
                    >
                        Fermer
                    </Button>
                    <Button
                        onClick={() => onEventEdit(event)}
                        className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white text-sm font-normal rounded-lg shadow-sm shadow-blue-900/20"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        variant="ghost"
                        className="flex-1 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-normal rounded-lg border border-red-500/20"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? '...' : 'Supprimer'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
