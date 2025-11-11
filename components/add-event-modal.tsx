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
      <DialogContent className="max-w-[900px] w-[90vw] max-h-[90vh] overflow-hidden p-0 border-border/60 shadow-2xl backdrop-blur-xl bg-background/95">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md" />
              <div className="relative p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
                <CalendarIcon className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                Nouvel Événement
              </div>
              <p className="text-sm font-normal text-muted-foreground mt-1">Créez un rendez-vous ou un événement dans votre calendrier</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-5"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Essential Information Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="title" className="flex items-center gap-2 text-sm font-semibold">
                  Titre de l'événement *
                </Label>
                <Input
                  ref={titleInputRef}
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Rendez-vous client, Réunion d'équipe..."
                  className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
                />
              </div>

              {/* Event Type */}
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="eventType" className="flex items-center gap-2 text-sm font-semibold">
                  Type d'événement *
                </Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
                >
                  <SelectTrigger className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[320px] rounded-2xl border-border/60 shadow-xl">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="py-3.5 cursor-pointer rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-3.5 h-3.5 rounded-full ${config.color} shadow-sm`} />
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-muted/40 to-muted/20 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>Date et heure</span>
            </div>
            
            {/* Start Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span>Date de début *</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 px-4 justify-start text-left font-medium border-2 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                      {startDate ? format(startDate, "PPP", { locale: fr }) : "Sélectionner une date"}
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

              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Heure de début *</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span>Date de fin *</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 px-4 justify-start text-left font-medium border-2 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                      {endDate ? format(endDate, "PPP", { locale: fr }) : "Sélectionner une date"}
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

              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Heure de fin *</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Localisation
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Bureau Casablanca, Visio, Chantier..."
              className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
            />
          </div>

          {/* Participants & Visibility */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-muted/40 to-muted/20 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Participants et visibilité</span>
            </div>

            {/* Invite Participants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Inviter des participants (optionnel)</Label>
                {users.filter(u => u.id !== currentUserId && !formData.participants.includes(u.id)).length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addAllParticipants}
                    className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Inviter tout le monde
                  </Button>
                )}
              </div>
              
              <Popover open={showParticipantSearch} onOpenChange={setShowParticipantSearch}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={showParticipantSearch}
                    className="w-full h-11 px-4 justify-start text-left font-normal border-2 hover:border-primary/50 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
                  >
                    <Search className="mr-3 h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Rechercher ou inviter un participant...</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command className="rounded-2xl border-border/60">
                    <CommandInput 
                      placeholder="Rechercher un utilisateur..." 
                      value={participantSearchQuery}
                      onValueChange={setParticipantSearchQuery}
                      className="h-11"
                    />
                    <CommandList>
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        Aucun utilisateur trouvé.
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredParticipants.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              addParticipant(user.id);
                              setShowParticipantSearch(false);
                            }}
                            className="py-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-semibold truncate">{user.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs font-medium shrink-0", getRoleColor(user.role))}
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Participants - Team Meeting Preview */}
              {formData.participants.length > 0 && (
                <div className="mt-3 p-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-lg border-2 border-primary/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Réunion d'équipe • {formData.participants.length + 1} participants
                    </div>
                  </div>
                  
                  {/* Merged Avatars Preview */}
                  <div className="flex items-center gap-3 mb-3 p-2 bg-background/60 rounded-lg">
                    <div className="flex items-center -space-x-2">
                      {/* Current user (creator) avatar */}
                      {currentUserId && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md z-10">
                          {users.find(u => u.id === currentUserId)?.name.charAt(0).toUpperCase() || 'M'}
                        </div>
                      )}
                      {/* Participant avatars */}
                      {formData.participants.slice(0, 4).map((participantId, idx) => {
                        const participant = users.find(u => u.id === participantId);
                        if (!participant) return null;
                        return (
                          <div 
                            key={participantId}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md"
                            style={{ zIndex: 9 - idx }}
                          >
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                      {formData.participants.length > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background shadow-md">
                          +{formData.participants.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="flex flex-wrap gap-2">
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-background/60 border border-border/40 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all group"
                          >
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {participant.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-foreground">{participant.name}</span>
                            <button
                              type="button"
                              onClick={() => removeParticipant(participantId)}
                              className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full p-1 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                Visibilité
              </Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: EventVisibility) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                  <SelectItem value="private" className="py-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">Privé</span>
                      <span className="text-xs text-muted-foreground">Visible uniquement par vous</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="team" className="py-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">Équipe</span>
                      <span className="text-xs text-muted-foreground">Visible par les participants et gestionnaires</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="all" className="py-3 cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">Public</span>
                      <span className="text-xs text-muted-foreground">Visible par tous les utilisateurs</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminderType" className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              Rappel
            </Label>
            <Select
              value={formData.reminderType}
              onValueChange={(value: ReminderType) => setFormData({ ...formData, reminderType: value })}
            >
              <SelectTrigger className="h-11 px-4 text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[320px] rounded-2xl border-border/60 shadow-xl">
                {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="py-3.5 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Notes ou description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ajouter des notes supplémentaires, détails importants, ordre du jour..."
              rows={3}
              className="resize-none text-base border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl bg-background/50 backdrop-blur-sm"
            />
          </div>

        </form>
        </motion.div>

        {/* Actions - Sticky Footer */}
        <div className="px-6 py-4 border-t border-border/40 bg-gradient-to-br from-muted/20 to-background">
          <div className="flex items-center justify-end">
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={isLoading} 
                className="h-11 px-6 text-base font-medium hover:bg-muted/50 transition-all rounded-2xl"
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
                className="h-11 px-6 text-base font-medium shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90 rounded-2xl"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </motion.div>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Créer l'événement
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
