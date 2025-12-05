"use client"

import { useState, useEffect, useRef } from "react"
import { X, Calendar as CalendarIcon, Clock, MapPin, FileText, Bell, Users, Eye, User, UserPlus, Search, Tag } from "lucide-react"
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
  onAddRdv: (rdv: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => Promise<void>
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
    visibility: "team" as EventVisibility,
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

      setFormData(prev => ({
        ...prev,
        startTime: format(nextHalfHour, 'HH:mm'),
        endTime: format(endTime, 'HH:mm')
      }))

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

      await onAddRdv(rdv)

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
      visibility: "team",
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
      'admin': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'gestionnaire': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'architecte': 'bg-green-500/10 text-green-600 border-green-500/20',
      'architect': 'bg-green-500/10 text-green-600 border-green-500/20',
      'commercial': 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    }
    return colorMap[role.toLowerCase()] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-md" />
                    <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                      <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ajouter un RDV</h2>
                    <p className="text-sm text-white/60 mt-0.5">Créez un rendez-vous pour {client.nom}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>

            {/* Client Info Card - Readonly */}
            <div className="px-6 pt-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Client</p>
                      <div className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                        <span className="text-xs font-semibold text-blue-300">Lecture seule</span>
                      </div>
                    </div>
                    <p className="text-base font-bold text-white mb-0.5">{client.nom}</p>
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      {client.telephone && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.telephone}
                        </span>
                      )}
                      {client.ville && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {client.ville}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Titre du RDV *
                  </Label>
                  <Input
                    ref={titleInputRef}
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Présentation du devis, Visite chantier..."
                    required
                    className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label htmlFor="eventType" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Tag className="w-4 h-4 text-blue-400" />
                    Type d'événement *
                  </Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
                  >
                    <SelectTrigger className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171B22] border-white/10 rounded-xl">
                      {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-white/10 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${config.color}`} />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time Section */}
                <div className="space-y-3 p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <CalendarIcon className="h-4 w-4 text-blue-400" />
                    <span>Date et heure</span>
                  </div>

                  {/* Start Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-white/90">Date de début *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-11 px-4 justify-start text-left font-medium bg-white/5 border-2 border-white/10 text-white hover:bg-white/10 hover:border-blue-500/50 rounded-xl",
                              !startDate && "text-white/40"
                            )}
                          >
                            <CalendarIcon className="mr-3 h-4 w-4 text-blue-400" />
                            {startDate ? format(startDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#171B22] border-white/10" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            locale={fr}
                            className="text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="startTime" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        Heure de début *
                      </Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-white/90">Date de fin *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-11 px-4 justify-start text-left font-medium bg-white/5 border-2 border-white/10 text-white hover:bg-white/10 hover:border-blue-500/50 rounded-xl",
                              !endDate && "text-white/40"
                            )}
                          >
                            <CalendarIcon className="mr-3 h-4 w-4 text-blue-400" />
                            {endDate ? format(endDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#171B22] border-white/10" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            locale={fr}
                            className="text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="endTime" className="text-sm font-medium text-white/90 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        Heure de fin *
                      </Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    Localisation
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Bureau Casablanca, Visio, Chantier..."
                    className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>

                {/* Google Maps URL */}
                <div className="space-y-2">
                  <Label htmlFor="locationUrl" className="text-sm font-medium text-white/70">
                    Lien Google Maps (optionnel)
                  </Label>
                  <Input
                    id="locationUrl"
                    type="url"
                    value={formData.locationUrl}
                    onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-white/90">
                    Notes / Objectif du RDV
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Validation des plans, Discussion finitions..."
                    rows={3}
                    className="px-4 py-3 bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl resize-none"
                  />
                </div>

                {/* Participants & Visibility */}
                <div className="space-y-3 p-4 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span>Participants et visibilité</span>
                  </div>

                  {/* Organizer Display */}
                  {currentUserId && (
                    <div className="p-3 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent rounded-xl border-2 border-blue-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-500/20 rounded-lg">
                          <User className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Organisateur</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-blue-500/20">
                          {users.find(u => u.id === currentUserId)?.name.charAt(0).toUpperCase() || 'M'}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-bold text-white">
                            {users.find(u => u.id === currentUserId)?.name || 'Vous'}
                          </span>
                          <span className="text-xs text-white/60 truncate">
                            {users.find(u => u.id === currentUserId)?.email || ''}
                          </span>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-semibold">
                          Créateur
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Invite Participants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-white flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-blue-400" />
                        Inviter des participants
                      </Label>
                      {users.filter(u => u.id !== currentUserId && !formData.participants.includes(u.id)).length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, participants: [] })}
                            className="h-7 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10"
                            disabled={formData.participants.length === 0}
                          >
                            Effacer tout
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addAllParticipants}
                            className="h-7 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Tout sélectionner
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        type="text"
                        placeholder="Rechercher un utilisateur..."
                        value={participantSearchQuery}
                        onChange={(e) => setParticipantSearchQuery(e.target.value)}
                        className="h-10 pl-10 pr-4 bg-white/5 border-2 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                    </div>

                    {/* Participants List with Checkboxes */}
                    <div className="max-h-[200px] overflow-y-auto rounded-xl border-2 border-white/10 bg-white/5">
                      {isUsersLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-white/60">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Users className="h-4 w-4" />
                          </motion.div>
                          Chargement...
                        </div>
                      ) : filteredParticipants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-sm text-white/60">
                          <Users className="h-8 w-8 mb-2 opacity-50" />
                          <p>Aucun utilisateur trouvé</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/10">
                          {filteredParticipants.map((user) => {
                            const isSelected = formData.participants.includes(user.id)
                            return (
                              <motion.div
                                key={user.id}
                                initial={false}
                                animate={{ backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}
                                className="group"
                              >
                                <label
                                  htmlFor={`participant-${user.id}`}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
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
                                      className="peer h-4 w-4 rounded border-2 border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 transition-all cursor-pointer bg-white/5"
                                    />
                                  </div>

                                  {/* Avatar */}
                                  <div className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm transition-all",
                                    isSelected
                                      ? "bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-500/20"
                                      : "bg-gradient-to-br from-blue-500/50 to-blue-600/50"
                                  )}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>

                                  {/* User Info */}
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className={cn(
                                      "text-sm font-semibold truncate transition-colors",
                                      isSelected ? "text-blue-400" : "text-white"
                                    )}>
                                      {user.name}
                                    </span>
                                    <span className="text-xs text-white/60 truncate">{user.email}</span>
                                  </div>

                                  {/* Role Badge */}
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs font-medium shrink-0", getRoleColor(user.role))}
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
                        className="p-3 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent rounded-xl border-2 border-blue-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-blue-500/10 rounded-lg">
                            <Users className="h-3.5 w-3.5 text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {formData.participants.length} participant{formData.participants.length > 1 ? 's' : ''} invité{formData.participants.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Compact Participant Tags */}
                        <div className="flex flex-wrap gap-1.5">
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
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-medium hover:shadow-sm transition-all group"
                                >
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-white max-w-[120px] truncate">{participant.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeParticipant(participantId)}
                                    className="hover:bg-red-500/10 text-white/60 hover:text-red-400 rounded-full p-0.5 transition-colors"
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

                  {/* Visibility */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Eye className="h-4 w-4 text-blue-400" />
                      Visibilité
                    </Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value: EventVisibility) => setFormData({ ...formData, visibility: value })}
                    >
                      <SelectTrigger className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#171B22] border-white/10 rounded-xl">
                        <SelectItem value="private" className="text-white hover:bg-white/10 cursor-pointer py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">Privé</span>
                            <span className="text-xs text-white/60">Visible uniquement par vous</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="team" className="text-white hover:bg-white/10 cursor-pointer py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">Équipe</span>
                            <span className="text-xs text-white/60">Visible par les participants et gestionnaires</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="all" className="text-white hover:bg-white/10 cursor-pointer py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold">Public</span>
                            <span className="text-xs text-white/60">Visible par tous les utilisateurs</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reminder */}
                <div className="space-y-2">
                  <Label htmlFor="reminderType" className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Bell className="h-4 w-4 text-blue-400" />
                    Rappel
                  </Label>
                  <Select
                    value={formData.reminderType}
                    onValueChange={(value: ReminderType) => setFormData({ ...formData, reminderType: value })}
                  >
                    <SelectTrigger className="h-11 px-4 bg-white/5 border-2 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171B22] border-white/10 rounded-xl">
                      {Object.entries(REMINDER_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-white/10 cursor-pointer">
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                    className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl"
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
