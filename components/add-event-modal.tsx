'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, User, Tag, CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG, EventType, ReminderType } from '@/types/calendar';
import { createCalendarEvent } from '@/lib/calendar-service';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
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
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    eventType: 'rendez_vous' as EventType,
    assignedTo: '',
    location: '',
    reminderType: 'none' as ReminderType,
    linkedClientId: '',
    linkedLeadId: '',
    linkedArchitectId: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (selectedDate) {
        setStartDate(selectedDate);
        setEndDate(selectedDate);
        setFormData(prev => ({
          ...prev,
          startTime: '09:00',
          endTime: '10:00'
        }));
      } else {
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
      }
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
    
    if (!formData.assignedTo) {
      toast.error('Veuillez sélectionner un utilisateur');
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
        assignedTo: formData.assignedTo,
        location: formData.location || undefined,
        reminderType: formData.reminderType,
        linkedClientId: formData.linkedClientId || undefined,
        linkedLeadId: formData.linkedLeadId || undefined,
        linkedArchitectId: formData.linkedArchitectId || undefined
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
              userId: formData.assignedTo,
              reminderType: formData.reminderType
            })
          });
          
          const reminderLabel = REMINDER_TYPE_CONFIG[formData.reminderType].label;
          toast.success(`Événement créé avec succès! 🎉\nRappel activé: ${reminderLabel}`, {
            duration: 5000
          });
        } catch (reminderError) {
          console.error('Error creating reminder:', reminderError);
          toast.success('Événement créé avec succès');
          toast.warning('Le rappel n\'a pas pu être créé');
        }
      } else {
        toast.success('Événement créé avec succès');
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
      assignedTo: '',
      location: '',
      reminderType: 'none',
      linkedClientId: '',
      linkedLeadId: '',
      linkedArchitectId: ''
    });
    setStartDate(undefined);
    setEndDate(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-primary" />
            Nouvel événement
          </DialogTitle>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-5 mt-4"
        >
          {/* Title & Type Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Titre de l'événement *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Rendez-vous client"
                className="h-11 px-4"
              />
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="eventType" className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Type d'événement *
              </Label>
              <Select
                value={formData.eventType}
                onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger className="h-11 px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[280px]">
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${config.color}`} />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/40">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Date et heure</span>
            </div>

            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date de début *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 px-4 justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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

              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-sm font-medium">Heure de début *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="h-11 px-4"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date de fin *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 px-4 justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-sm font-medium">Heure de fin *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="h-11 px-4"
                />
              </div>
            </div>
          </div>

          {/* Assigned To & Location Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Assigné à *
              </Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger className="h-12 px-4">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent className="min-w-[350px]">
                  {users.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      <User className="h-5 w-5 mx-auto mb-2 animate-pulse" />
                      Chargement des utilisateurs...
                    </div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted ml-auto">{user.role}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Localisation
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Bureau Casablanca"
                className="h-12 px-4"
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminderType" className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Rappel
            </Label>
            <Select
              value={formData.reminderType}
              onValueChange={(value: ReminderType) => setFormData({ ...formData, reminderType: value })}
            >
              <SelectTrigger className="h-11 px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[280px]">
                {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="py-3">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Notes ou description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ajouter des notes supplémentaires..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading} className="h-11 px-8">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="h-11 px-8">
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Création...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Créer l'événement
                </>
              )}
            </Button>
          </div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
