"use client"

import { useState, useEffect, useRef } from "react"
import { X, Calendar as CalendarIcon, Clock, MapPin, FileText, Bell, Users, User, UserPlus, Search, Tag, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { format, addHours } from "date-fns"
import { fr } from "date-fns/locale"
import type { Client, Appointment } from "@/types/client"
import { EVENT_TYPE_CONFIG, REMINDER_TYPE_CONFIG, EventType, ReminderType, EventVisibility } from "@/types/calendar"
import { toast } from "sonner"

interface AddRdvModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onAddRdv: (rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt">, options?: { participants: string[], eventType: EventType, visibility: EventVisibility }) => Promise<void>
}

export function AddRdvModal({ isOpen, onClose, client, onAddRdv }: AddRdvModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [participantSearchQuery, setParticipantSearchQuery] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "09:00",
    endTime: "10:00",
    eventType: "rendez_vous" as EventType,
    location: "",
    locationUrl: "",
    reminderType: "day_1" as ReminderType,
    participants: [] as string[],
    visibility: "all" as EventVisibility, // Default to public
    status: "upcoming" as const
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchCurrentUser()

      // Smart defaults - next half-hour
      const now = new Date()
      const nextHalfHour = new Date(now)
      const minutes = now.getMinutes()
      const roundedMinutes = minutes < 30 ? 30 : 60
      nextHalfHour.setMinutes(roundedMinutes, 0, 0)
      if (roundedMinutes === 60) {
        nextHalfHour.setHours(nextHalfHour.getHours() + 1)
        nextHalfHour.setMinutes(0)
      }

      const endTime = addHours(nextHalfHour, 1)

      setStartDate(now)
      setEndDate(now)

      // Reset form data when modal opens, ensuring eventType is set correctly
      setFormData({
        title: "",
        description: "",
        startTime: format(nextHalfHour, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        eventType: "rendez_vous" as EventType,
        location: "",
        locationUrl: "",
        reminderType: "day_1" as ReminderType,
        participants: [],
        visibility: "all" as EventVisibility,
        status: "upcoming" as const
      })

      // Focus title input after modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const fetchUsers = async () => {
    try {
      setIsUsersLoading(true)
      const response = await fetch('/api/auth/users', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('[AddRdvModal] Error fetching users:', error)
    } finally {
      setIsUsersLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (response.ok) {
        const userData = await response.json()
        setCurrentUserId(userData.id)
      }
    } catch (error) {
      console.error('[AddRdvModal] Error fetching current user:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Le titre est requis')
      return
    }

    if (!startDate || !endDate) {
      toast.error('Les dates sont requises')
      return
    }

    setIsLoading(true)

    try {
      const [startHours, startMinutes] = formData.startTime.split(':').map(Number)
      const [endHours, endMinutes] = formData.endTime.split(':').map(Number)

      const startDateTime = new Date(startDate)
      startDateTime.setHours(startHours, startMinutes, 0, 0)

      const endDateTime = new Date(endDate)
      endDateTime.setHours(endHours, endMinutes, 0, 0)

      // Validate end time is after start time
      if (endDateTime <= startDateTime) {
        toast.error('La date/heure de fin doit être après la date/heure de début')
        setIsLoading(false)
        return
      }

      const rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt"> = {
        title: formData.title,
        dateStart: startDateTime.toISOString(),
        dateEnd: endDateTime.toISOString(),
        location: formData.location || undefined,
        locationUrl: formData.locationUrl || undefined,
        notes: formData.description || undefined,
        status: formData.status,
        clientId: client.id,
        clientName: client.nom,
        createdBy: user?.name || "Utilisateur"
      }

      await onAddRdv(rdv, {
        participants: formData.participants,
        eventType: formData.eventType,
        visibility: formData.visibility
      })

      // Success handling is done in parent or we can do it here if parent throws on error
      // But assuming parent handles success toast, we might duplicate.
      // Actually page.tsx handles toast. We should probably remove toast here or coordinate.
      // For now, let's keep it but await.

      handleClose()
    } catch (error) {
      console.error('Error creating RDV:', error)
      toast.error('Erreur lors de la création du RDV')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      startTime: "09:00",
      endTime: "10:00",
      eventType: "rendez_vous",
      location: "",
      locationUrl: "",
      reminderType: "day_1",
      participants: [],
      visibility: "all", // Default to public
      status: "upcoming"
    })
    setStartDate(undefined)
    setEndDate(undefined)
    setParticipantSearchQuery('')
    onClose()
  }

  const addParticipant = (userId: string) => {
    if (!formData.participants.includes(userId) && userId !== currentUserId) {
      setFormData({ ...formData, participants: [...formData.participants, userId] })
      setParticipantSearchQuery('')
    }
  }

  const removeParticipant = (userId: string) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter(p => p !== userId)
    })
  }

  const addAllParticipants = () => {
    const allUserIds = users.filter(u => u.id !== currentUserId).map(u => u.id)
    setFormData({ ...formData, participants: allUserIds })
    toast.success('Tous les utilisateurs ont été ajoutés')
  }

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'admin': 'Admin',
      'gestionnaire': 'Gestionnaire',
      'architecte': 'Architecte',
      'architect': 'Architecte',
      'commercial': 'Commercial'
    }
    return roleMap[role.toLowerCase()] || role
  }

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'admin': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'gestionnaire': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'architecte': 'bg-green-500/10 text-green-400 border-green-500/30',
      'architect': 'bg-green-500/10 text-green-400 border-green-500/30',
      'commercial': 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    }
    return colorMap[role.toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/30'
  }

  const availableParticipants = users.filter(
    u => u.id !== currentUserId && !formData.participants.includes(u.id)
  )

  const filteredParticipants = participantSearchQuery
    ? availableParticipants.filter(u =>
      u.name.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(participantSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(participantSearchQuery.toLowerCase())
    )
    : availableParticipants

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-[#0f1117] rounded-xl border border-slate-700/50 shadow-2xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/20 rounded border border-blue-500/30">
                    <CalendarIcon className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-light text-slate-200">Ajouter un RDV</h2>
                    <p className="text-[10px] font-light text-slate-400 mt-0.5">Créez un rendez-vous pour {client.nom}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-md bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Client Info Card - Readonly */}
            <div className="px-4 pt-2.5">
              <div className="p-2.5 rounded-md bg-slate-800/30 border border-slate-700/50">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[9px] font-light text-slate-400 uppercase tracking-wider">Client</p>
                      <div className="px-1 py-0.5 rounded bg-slate-700/50 border border-slate-600/50">
                        <span className="text-[9px] font-light text-slate-400">Lecture seule</span>
                      </div>
                    </div>
                    <p className="text-xs font-light text-slate-200 mb-1">{client.nom}</p>
                    <div className="flex items-center gap-2.5 text-[10px] font-light text-slate-400">
                      {client.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-slate-500" />
                          {client.telephone}
                        </span>
                      )}
                      {client.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-slate-500" />
                          {client.ville}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Title */}
                <div className="space-y-1">
                  <Label htmlFor="title" className="flex items-center gap-1.5 text-[10px] font-light text-slate-400 uppercase tracking-wider">
                    <FileText className="w-3 h-3 text-slate-500" />
                    Titre du RDV *
                  </Label>
                  <Input
                    ref={titleInputRef}
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Présentation du devis, Visite chantier..."
                    required
                    className="h-8 px-2.5 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-slate-600/50 focus:ring-0 rounded-md"
                  />
                </div>

                {/* Event Type - Rendez-vous client and Rendez-vous interne */}
                <div className="space-y-1">
                  <Label htmlFor="eventType" className="flex items-center gap-1.5 text-[10px] font-light text-slate-400 uppercase tracking-wider">
                    <Tag className="w-3 h-3 text-slate-500" />
                    Type de rendez-vous *
                  </Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
                  >
                    <SelectTrigger className="h-8 px-2.5 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 focus:border-slate-600/50 focus:ring-0 rounded-md">
                      <div className="flex items-center gap-2 w-full">
                        {formData.eventType === 'rendez_vous' && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        {formData.eventType === 'interne' && (
                          <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
                        )}
                        <SelectValue placeholder="Sélectionner un type" className="flex-1">
                          {formData.eventType === 'rendez_vous' ? 'Rendez-vous client' : formData.eventType === 'interne' ? 'Rendez-vous interne' : ''}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700/50 rounded-md">
                      <SelectItem value="rendez_vous" className="text-[11px] font-light text-slate-200 hover:bg-slate-800/50 cursor-pointer py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span>Rendez-vous client</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="interne" className="text-[11px] font-light text-slate-200 hover:bg-slate-800/50 cursor-pointer py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0" />
                          <span>Rendez-vous interne</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time Section - Simplified */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-light text-slate-400 uppercase tracking-wider">
                    <CalendarIcon className="h-3 w-3 text-slate-500" />
                    <span>Date et heure</span>
                  </div>

                  {/* Single Date Input */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-light text-slate-400">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-8 px-2.5 justify-start text-left text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 hover:bg-slate-800/30 hover:border-slate-600/50 rounded-md",
                            !startDate && "text-slate-500"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3 text-slate-400" />
                          {startDate ? format(startDate, "d MMM yyyy", { locale: fr }) : "Sélectionner une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700/50" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date)
                            if (date) setEndDate(date) // Auto-set end date to same date
                          }}
                          initialFocus
                          locale={fr}
                          className="text-slate-200"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start & End Time in one row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="startTime" className="text-[10px] font-light text-slate-400">
                        Heure de début *
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-8 px-2.5 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 focus:border-slate-600/50 focus:ring-0 rounded-md"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="endTime" className="text-[10px] font-light text-slate-400">
                        Heure de fin *
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-8 px-2.5 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 focus:border-slate-600/50 focus:ring-0 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <Label htmlFor="location" className="flex items-center gap-1.5 text-[10px] font-light text-slate-400 uppercase tracking-wider">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    Localisation
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Bureau Casablanca, Visio, Chantier..."
                    className="h-8 px-2.5 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-slate-600/50 focus:ring-0 rounded-md"
                  />
                </div>

                {/* Google Maps URL */}
                <div className="space-y-1">
                  <Label htmlFor="locationUrl" className="text-[10px] font-light text-slate-400">
                    Lien Google Maps (optionnel)
                  </Label>
                  <Input
                    id="locationUrl"
                    type="url"
                    value={formData.locationUrl}
                    onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="h-9 px-3 text-xs font-light bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description" className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                    Notes / Objectif du RDV
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Validation des plans, Discussion finitions..."
                    rows={3}
                    className="px-2.5 py-2 text-[11px] font-light bg-transparent border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-slate-600/50 focus:ring-0 rounded-md resize-none"
                  />
                </div>

                {/* Participants */}
                <div className="space-y-2.5 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-xs font-light text-slate-300">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>Participants</span>
                  </div>

                  {/* Organizer Display */}
                  {currentUserId && (
                    <div className="p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1 bg-blue-500/20 rounded border border-blue-500/30">
                          <User className="h-3 w-3 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-light text-slate-400 uppercase tracking-wide">Organisateur</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-light">
                          {users.find(u => u.id === currentUserId)?.name.charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-xs font-light text-slate-200">
                            {users.find(u => u.id === currentUserId)?.name || 'Vous'}
                          </span>
                          <span className="text-[10px] font-light text-slate-400 truncate">
                            {users.find(u => u.id === currentUserId)?.email || ''}
                          </span>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-light">
                          Créateur
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Invite Participants */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-light text-slate-300 flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5 text-slate-400" />
                        Inviter des participants
                      </Label>
                      {users.filter(u => u.id !== currentUserId && !formData.participants.includes(u.id)).length > 0 && (
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, participants: [] })}
                            className="h-6 text-[10px] font-light text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                            disabled={formData.participants.length === 0}
                          >
                            Effacer tout
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addAllParticipants}
                            className="h-6 text-[10px] font-light text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Tout sélectionner
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <Input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
                        value={participantSearchQuery}
                        onChange={(e) => setParticipantSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs font-light bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg"
                      />
                    </div>

                    {/* Participants List with Checkboxes */}
                    <div className="max-h-[180px] overflow-y-auto rounded-lg border border-slate-700/50 bg-slate-800/30">
                      {isUsersLoading ? (
                        <div className="flex items-center justify-center py-6 text-xs font-light text-slate-400">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Users className="h-3.5 w-3.5" />
                          </motion.div>
                          Chargement...
                        </div>
                      ) : filteredParticipants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-xs font-light text-slate-400">
                          <Users className="h-6 w-6 mb-1.5 opacity-50" />
                          <p>Aucun utilisateur trouvé</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700/50">
                          {filteredParticipants.map((user) => {
                            const isSelected = formData.participants.includes(user.id)
                            return (
                              <motion.div
                                key={user.id}
                                initial={false}
                                animate={{ backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                                className="group"
                              >
                                <label
                                  htmlFor={`participant-${user.id}`}
                                  className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-slate-700/30 transition-colors"
                                >
                                  {/* Checkbox */}
                                  <div className="relative flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`participant-${user.id}`}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          addParticipant(user.id)
                                        } else {
                                          removeParticipant(user.id)
                                        }
                                      }}
                                      className="peer h-3.5 w-3.5 rounded border border-slate-600 text-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:ring-offset-0 transition-all cursor-pointer bg-slate-700/50"
                                    />
                                  </div>

                                  {/* Avatar */}
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-light transition-all",
                                    isSelected
                                      ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                                      : "bg-slate-700/50 border border-slate-600/50 text-slate-400"
                                  )}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>

                                  {/* User Info */}
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className={cn(
                                      "text-xs font-light truncate transition-colors",
                                      isSelected ? "text-blue-400" : "text-slate-200"
                                    )}>
                                      {user.name}
                                    </span>
                                    <span className="text-[10px] font-light text-slate-400 truncate">{user.email}</span>
                                  </div>

                                  {/* Role Badge */}
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[10px] font-light shrink-0", getRoleColor(user.role))}
                                  >
                                    {getRoleLabel(user.role)}
                                  </Badge>
                                </label>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Participants Summary */}
                    {formData.participants.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/50"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="p-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                            <Users className="h-3 w-3 text-blue-400" />
                          </div>
                          <span className="text-xs font-light text-slate-300">
                            {formData.participants.length} participant{formData.participants.length > 1 ? 's' : ''} invité{formData.participants.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Compact Participant Tags */}
                        <div className="flex flex-wrap gap-1">
                          <AnimatePresence mode="popLayout">
                            {formData.participants.map((participantId) => {
                              const participant = users.find(u => u.id === participantId)
                              if (!participant) return null
                              return (
                                <motion.div
                                  key={participantId}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/50 border border-slate-600/50 rounded-full text-[10px] font-light hover:border-slate-500 transition-all group"
                                >
                                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[9px] font-light">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-slate-300 max-w-[100px] truncate">{participant.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeParticipant(participantId)}
                                    className="hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-full p-0.5 transition-colors"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>

                {/* Reminder */}
                <div className="space-y-1.5">
                  <Label htmlFor="reminderType" className="flex items-center gap-1.5 text-xs font-light text-slate-300">
                    <Bell className="h-3.5 w-3.5 text-slate-400" />
                    Rappel
                  </Label>
                  <Select
                    value={formData.reminderType}
                    onValueChange={(value: ReminderType) => setFormData({ ...formData, reminderType: value })}
                  >
                    <SelectTrigger className="h-9 px-3 text-xs font-light bg-slate-800/50 border border-slate-700/50 text-slate-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700/50 rounded-lg">
                      {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-xs font-light text-slate-200 hover:bg-slate-800/50 cursor-pointer">
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs font-light rounded-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Création...</span>
                      </div>
                    ) : (
                      'Créer le RDV'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClose}
                    variant="ghost"
                    className="h-9 px-4 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs font-light rounded-lg"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
