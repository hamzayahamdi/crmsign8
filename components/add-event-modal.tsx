'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, User, Tag, CalendarDays, Users, Eye, X, Search, UserPlus } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG, EventType, ReminderType, EventVisibility } from '@/types/calendar';
import { createCalendarEvent } from '@/lib/calendar-service';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  selectedDate?: Date;
}

export function AddEventModal({ isOpen, onClose, onEventCreated, selectedDate }: AddEventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    eventType: 'rendez_vous' as EventType,
    location: '',
    reminderType: 'none' as ReminderType,
    linkedClientId: '',
    linkedLeadId: '',
    linkedArchitectId: '',
    participants: [] as string[],
    visibility: 'team' as EventVisibility
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchCurrentUser();

      // Smart defaults - next half-hour
      const now = new Date();
      const nextHalfHour = new Date(now);
      const minutes = now.getMinutes();
      const roundedMinutes = minutes < 30 ? 30 : 60;
      nextHalfHour.setMinutes(roundedMinutes, 0, 0);
      if (roundedMinutes === 60) {
        nextHalfHour.setHours(nextHalfHour.getHours() + 1);
        nextHalfHour.setMinutes(0);
      }

      const endTime = addHours(nextHalfHour, 1);

      if (selectedDate) {
        setStartDate(selectedDate);
        setEndDate(selectedDate);
      } else {
        setStartDate(now);
        setEndDate(now);
      }

      setFormData(prev => ({
        ...prev,
        startTime: format(nextHalfHour, 'HH:mm'),
        endTime: format(endTime, 'HH:mm')
      }));

      // Focus title input after modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, selectedDate]);

  const fetchUsers = async () => {
    try {
      setIsUsersLoading(true);
      console.log('[AddEventModal] Fetching users...');
      const response = await fetch('/api/auth/users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[AddEventModal] Users fetched:', data.length);
        setUsers(data);
      } else {
        const err = await response.json().catch(() => ({}));
        console.error('[AddEventModal] Users fetch failed:', response.status, err);
        toast.error(`Erreur: ${err?.error || response.statusText}`);
      }
    } catch (error) {
      console.error('[AddEventModal] Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('[AddEventModal] Error fetching current user:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    if (!startDate) {
      toast.error('La date de début est requise');
      return;
    }

    if (!endDate) {
      toast.error('La date de fin est requise');
      return;
    }

    if (!currentUserId) {
      toast.error('Utilisateur non identifié');
      return;
    }

    setIsLoading(true);

    try {
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number);

      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        toast.error('La date/heure de fin doit être après la date/heure de début');
        setIsLoading(false);
        return;
      }

      const event = await createCalendarEvent({
        title: formData.title,
        description: formData.description || undefined,
        startDate: startDateTime,
        endDate: endDateTime,
        eventType: formData.eventType,
        assignedTo: currentUserId,
        location: formData.location || undefined,
        reminderType: formData.reminderType,
        linkedClientId: formData.linkedClientId || undefined,
        linkedLeadId: formData.linkedLeadId || undefined,
        linkedArchitectId: formData.linkedArchitectId || undefined,
        participants: formData.participants,
        visibility: formData.visibility
      });

      // Create reminder if one was selected
      if (formData.reminderType !== 'none') {
        try {
          await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              eventId: event.id,
              userId: currentUserId,
              reminderType: formData.reminderType
            })
          });

          const participantCount = formData.participants.length;
          const successMessage = participantCount > 0
            ? `✅ Rendez-vous créé avec succès et partagé avec ${participantCount} participant${participantCount > 1 ? 's' : ''}.`
            : '✅ Rendez-vous créé avec succès!';
          toast.success(successMessage, {
            duration: 5000
          });
        } catch (reminderError) {
          console.error('Error creating reminder:', reminderError);
          const participantCount = formData.participants.length;
          const successMessage = participantCount > 0
            ? `✅ Rendez-vous créé avec succès et partagé avec ${participantCount} participant${participantCount > 1 ? 's' : ''}.`
            : '✅ Rendez-vous créé avec succès!';
          toast.success(successMessage);
        }
      } else {
        const participantCount = formData.participants.length;
        const successMessage = participantCount > 0
          ? `✅ Rendez-vous créé avec succès et partagé avec ${participantCount} participant${participantCount > 1 ? 's' : ''}.`
          : '✅ Rendez-vous créé avec succès!';
        toast.success(successMessage);
      }

      onEventCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erreur lors de la création de l\'événement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      eventType: 'rendez_vous',
      location: '',
      reminderType: 'none',
      linkedClientId: '',
      linkedLeadId: '',
      linkedArchitectId: '',
      participants: [],
      visibility: 'team'
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setParticipantSearchQuery('');
    setShowParticipantSearch(false);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape' && !showParticipantSearch) {
        handleClose();
      }

      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showParticipantSearch]);

  // Filter available participants
  const availableParticipants = users.filter(
    u => u.id !== currentUserId && !formData.participants.includes(u.id)
  );

  const filteredParticipants = participantSearchQuery
    ? availableParticipants.filter(u =>
      u.name.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(participantSearchQuery.toLowerCase())
    )
    : availableParticipants;

  const addParticipant = (userId: string) => {
    if (!formData.participants.includes(userId) && userId !== currentUserId) {
      setFormData({ ...formData, participants: [...formData.participants, userId] });
      setParticipantSearchQuery('');
    }
  };

  const removeParticipant = (userId: string) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter(p => p !== userId)
    });
  };

  const addAllParticipants = () => {
    const allUserIds = users.filter(u => u.id !== currentUserId).map(u => u.id);
    setFormData({ ...formData, participants: allUserIds });
    toast.success('Tous les utilisateurs ont été ajoutés');
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Admin',
      'gestionnaire': 'Gestionnaire',
      'architecte': 'Architecte',
      'architect': 'Architecte',
      'commercial': 'Commercial'
    };
    return roleMap[role.toLowerCase()] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'admin': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'gestionnaire': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'architecte': 'bg-green-500/10 text-green-600 border-green-500/20',
      'architect': 'bg-green-500/10 text-green-600 border-green-500/20',
      'commercial': 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    };
    return colorMap[role.toLowerCase()] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] w-[95vw] max-h-[90vh] overflow-hidden p-0 border-border/60 shadow-2xl backdrop-blur-xl bg-background/95">
        <DialogHeader className="px-4 pt-3 pb-2.5 border-b border-border/40 relative">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 relative z-10">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>Nouvel Événement</span>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Essential Information Section */}
            <div className="space-y-2.5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                  Titre de l'événement *
                </Label>
                <Input
                  ref={titleInputRef}
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Rendez-vous client, Réunion d'équipe..."
                  className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
                />
              </div>

              {/* Event Type */}
              <div className="space-y-1.5">
                <Label htmlFor="eventType" className="text-xs font-medium text-muted-foreground">
                  Type d'événement *
                </Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
                >
                  <SelectTrigger className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px] rounded-lg border-border/60 shadow-xl">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="py-2 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time Section */}
            <div className="space-y-2 p-2.5 bg-muted/30 rounded-lg border border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <CalendarDays className="h-3 w-3 text-primary" />
                <span>Date et heure</span>
              </div>

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Date de début *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-8 px-2.5 justify-start text-left text-xs font-normal border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-lg",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3 w-3 text-primary" />
                        {startDate ? format(startDate, "d MMM yyyy", { locale: fr }) : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="startTime" className="text-xs font-medium text-muted-foreground">Heure de début *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="h-8 px-2.5 text-xs border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Date de fin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-8 px-2.5 justify-start text-left text-xs font-normal border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-lg",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3 w-3 text-primary" />
                        {endDate ? format(endDate, "d MMM yyyy", { locale: fr }) : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="endTime" className="text-xs font-medium text-muted-foreground">Heure de fin *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="h-8 px-2.5 text-xs border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-medium text-muted-foreground">
                Localisation
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Bureau Casablanca, Visio, Chantier..."
                className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
              />
            </div>

            {/* Participants & Visibility */}
            <div className="space-y-2 p-2.5 bg-muted/30 rounded-lg border border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Users className="h-3 w-3 text-primary" />
                <span>Participants et visibilité</span>
              </div>

              {/* Organizer Display */}
              {currentUserId && (
                <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                      {users.find(u => u.id === currentUserId)?.name.charAt(0).toUpperCase() || 'M'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-primary block truncate">
                        {users.find(u => u.id === currentUserId)?.name || 'Vous'}
                      </span>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-5">
                      Organisateur
                    </Badge>
                  </div>
                </div>
              )}

              {/* Invite Participants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Inviter des participants
                  </Label>
                  {users.filter(u => u.id !== currentUserId && !formData.participants.includes(u.id)).length > 0 && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, participants: [] })}
                        className="h-6 text-[10px] px-2 font-normal text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        disabled={formData.participants.length === 0}
                      >
                        Effacer
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addAllParticipants}
                        className="h-6 text-[10px] px-2 font-normal text-primary hover:text-primary hover:bg-primary/10"
                      >
                        Tout
                      </Button>
                    </div>
                  )}
                </div>

                {/* Multi-select Participant List */}
                <div className="space-y-1.5">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Rechercher..."
                      value={participantSearchQuery}
                      onChange={(e) => setParticipantSearchQuery(e.target.value)}
                      className="h-8 pl-7 pr-2 text-xs border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
                    />
                  </div>

                  {/* Participants List with Checkboxes */}
                  <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border/40 bg-background/30">
                    {isUsersLoading ? (
                      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-1.5"
                        >
                          <Users className="h-3 w-3" />
                        </motion.div>
                        Chargement...
                      </div>
                    ) : filteredParticipants.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-xs text-muted-foreground">
                        <Users className="h-6 w-6 mb-1 opacity-50" />
                        <p>Aucun utilisateur</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {filteredParticipants.map((user) => {
                          const isSelected = formData.participants.includes(user.id);
                          return (
                            <motion.div
                              key={user.id}
                              initial={false}
                              animate={{ backgroundColor: isSelected ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent' }}
                              className="group"
                            >
                              <label
                                htmlFor={`participant-${user.id}`}
                                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors"
                              >
                                {/* Checkbox */}
                                <input
                                  type="checkbox"
                                  id={`participant-${user.id}`}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      addParticipant(user.id);
                                    } else {
                                      removeParticipant(user.id);
                                    }
                                  }}
                                  className="h-3.5 w-3.5 rounded border border-border text-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                                />

                                {/* Avatar */}
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold transition-all",
                                  isSelected
                                    ? "bg-primary ring-1 ring-primary/20"
                                    : "bg-blue-500"
                                )}>
                                  {user.name.charAt(0).toUpperCase()}
                                </div>

                                {/* User Info */}
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className={cn(
                                    "text-xs font-medium truncate transition-colors",
                                    isSelected ? "text-primary" : "text-foreground"
                                  )}>
                                    {user.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                                </div>

                                {/* Role Badge */}
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] font-normal shrink-0 px-1.5 py-0 h-4", getRoleColor(user.role))}
                                >
                                  {getRoleLabel(user.role)}
                                </Badge>
                              </label>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Participants Summary */}
                {formData.participants.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-blue-500/5 rounded-lg border border-blue-500/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-foreground">
                        {formData.participants.length} participant{formData.participants.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Compact Participant Tags */}
                    <div className="flex flex-wrap gap-1">
                      <AnimatePresence mode="popLayout">
                        {formData.participants.map((participantId) => {
                          const participant = users.find(u => u.id === participantId);
                          if (!participant) return null;
                          return (
                            <motion.div
                              key={participantId}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-background/60 border border-border/40 rounded-full text-[10px] font-medium transition-all group"
                            >
                              <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold">
                                {participant.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-foreground max-w-[80px] truncate">{participant.name}</span>
                              <button
                                type="button"
                                onClick={() => removeParticipant(participantId)}
                                className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Visibility */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <Label className="text-xs font-medium text-muted-foreground">Visibilité</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: EventVisibility) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-border/60 shadow-xl">
                    <SelectItem value="private" className="py-2 cursor-pointer">
                      <span className="text-sm">Privé</span>
                    </SelectItem>
                    <SelectItem value="team" className="py-2 cursor-pointer">
                      <span className="text-sm">Équipe</span>
                    </SelectItem>
                    <SelectItem value="all" className="py-2 cursor-pointer">
                      <span className="text-sm">Public</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reminder */}
            <div className="space-y-1.5">
              <Label htmlFor="reminderType" className="text-xs font-medium text-muted-foreground">
                Rappel
              </Label>
              <Select
                value={formData.reminderType}
                onValueChange={(value: ReminderType) => setFormData({ ...formData, reminderType: value })}
              >
                <SelectTrigger className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[280px] rounded-lg border-border/60 shadow-xl">
                  {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="py-2 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3 w-3 text-primary" />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">Notes ou description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ajouter des notes supplémentaires..."
                rows={2}
                className="resize-none text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
              />
            </div>

          </form>
        </motion.div>

        {/* Actions - Sticky Footer */}
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-8 px-4 text-xs font-medium hover:bg-muted/50 transition-all rounded-lg"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              className="h-8 px-4 text-xs font-medium shadow-sm hover:shadow transition-all bg-primary hover:bg-primary/90 rounded-lg"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-1.5"
                  >
                    <CalendarIcon className="h-3 w-3" />
                  </motion.div>
                  Création...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-3 w-3 mr-1.5" />
                  Créer l'événement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}
