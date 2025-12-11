"use client"

import React, { useState, useEffect } from "react"
import { CalendarIcon, Search, CheckCircle2, Clock, CircleDashed, User, Link2, Bell, BellOff, Phone, MapPin, X } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Task, TaskStatus, LinkedType } from "@/types/task"
import type { Lead } from "@/types/lead"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { LeadsService } from "@/lib/leads-service"
import { ContactService } from "@/lib/contact-service"
import { toast } from "sonner"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">) => void
  editingTask: Task | null
  preSelectedClient?: { id: string; nom: string; telephone?: string; ville?: string } | null
  isLoading?: boolean
}

export function AddTaskModal({ isOpen, onClose, onSave, editingTask, preSelectedClient, isLoading = false }: AddTaskModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: user?.name || "",
    linkedType: "lead" as LinkedType,
    linkedId: "",
    linkedName: "",
    status: "a_faire" as TaskStatus,
    reminderEnabled: false,
    reminderDays: 2,
  })

  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const loadLeads = async () => {
      try {
        const apiLeads = await LeadsService.getAllLeads()
        setLeads(apiLeads || [])
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
      }
    }

    const loadContacts = async () => {
      try {
        setIsLoadingContacts(true)
        const response = await ContactService.getContacts({ limit: 1000 })
        const contactsData = response.data || []
        setContacts(contactsData)
      } catch (error) {
        console.error('Error loading contacts:', error)
        setContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }

    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const names = (Array.isArray(data) ? data : []).map((u: any) => (u?.name || '').trim()).filter((n: string) => n)
          setUsers(names.length ? names : [user?.name || 'Admin'])
        } else {
          setUsers([user?.name || 'Admin'])
        }
      } catch {
        setUsers([user?.name || 'Admin'])
      }
    }

    loadLeads()
    loadContacts()
    loadUsers()
  }, [isOpen, user?.name])

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        dueDate: editingTask.dueDate.split("T")[0],
        assignedTo: editingTask.assignedTo,
        linkedType: editingTask.linkedType,
        linkedId: editingTask.linkedId,
        linkedName: editingTask.linkedName || "",
        status: editingTask.status,
        reminderEnabled: editingTask.reminderEnabled || false,
        reminderDays: editingTask.reminderDays || 2,
      })
      setIsSubmitting(false) // Reset submitting state when editing
    } else {
      const linkedType: LinkedType = preSelectedClient ? "client" : "lead"
      const linkedId = preSelectedClient ? preSelectedClient.id : ""
      const linkedName = preSelectedClient ? preSelectedClient.nom : ""

      setFormData({
        title: "",
        description: "",
        dueDate: format(new Date(), "yyyy-MM-dd"),
        assignedTo: user?.name || "",
        linkedType,
        linkedId,
        linkedName,
        status: "a_faire",
        reminderEnabled: false,
        reminderDays: 2,
      })
      setIsSubmitting(false) // Reset submitting state when creating new
    }
  }, [editingTask, user, isOpen, preSelectedClient])

  const combinedItems = React.useMemo(() => {
    const itemsMap = new Map<string, { id: string; name: string; phone: string; city: string; type: 'lead' | 'contact'; displayName: string }>()
    const seenKeys = new Set<string>()
    
    const createKey = (name: string, phone: string) => 
      `${(name || '').toLowerCase().trim()}_${(phone || '').trim()}`
    
    leads.forEach(lead => {
      if (!lead.id || !lead.nom) return
      const key = createKey(lead.nom, lead.telephone || '')
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        itemsMap.set(lead.id, {
          id: lead.id,
          name: lead.nom,
          phone: lead.telephone || '',
          city: lead.ville || '',
          type: 'lead' as const,
          displayName: `${lead.nom}${lead.telephone ? ` - ${lead.telephone}` : ''}${lead.ville ? ` (${lead.ville})` : ''}`
        })
      }
    })
    
    contacts.forEach(contact => {
      if (!contact.id || !contact.nom) return
      const key = createKey(contact.nom, contact.telephone || '')
      if (seenKeys.has(key)) {
        const existingItem = Array.from(itemsMap.values()).find(item => 
          createKey(item.name, item.phone) === key
        )
        if (existingItem) {
          itemsMap.delete(existingItem.id)
        }
      }
      seenKeys.add(key)
      itemsMap.set(contact.id, {
        id: contact.id,
        name: contact.nom,
        phone: contact.telephone || '',
        city: contact.ville || '',
        type: 'contact' as const,
        displayName: `${contact.nom}${contact.telephone ? ` - ${contact.telephone}` : ''}${contact.ville ? ` (${contact.ville})` : ''}`
      })
    })
    
    return Array.from(itemsMap.values())
  }, [leads, contacts])
  
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return combinedItems
    }
    const query = searchQuery.toLowerCase().trim()
    return combinedItems.filter(item => {
      const searchableText = `${item.name} ${item.phone} ${item.city} ${item.type}`.toLowerCase()
      return searchableText.includes(query)
    })
  }, [combinedItems, searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting || isLoading) {
      console.log('[AddTaskModal] Submission already in progress, ignoring duplicate click')
      return
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Le titre est requis')
      return
    }

    if (!formData.dueDate) {
      toast.error('La date d\'échéance est requise')
      return
    }

    if (!formData.assignedTo) {
      toast.error('L\'assignation est requise')
      return
    }

    let linkedName = formData.linkedName
    let linkedType: LinkedType = formData.linkedType
    if (formData.linkedId) {
      const item = combinedItems.find(i => i.id === formData.linkedId)
      if (item) {
        linkedName = item.name
        linkedType = (item.type === 'contact' ? 'client' : item.type) as LinkedType
      }
    }

    if (linkedType === 'contact') {
      linkedType = 'client'
    }

    const dueDate = new Date(formData.dueDate)
    if (isNaN(dueDate.getTime())) {
      toast.error('Date d\'échéance invalide')
      return
    }

    // Set submitting state to prevent duplicate submissions
    setIsSubmitting(true)

    try {
      // Call onSave and wait for it to complete
      await onSave({
        ...formData,
        linkedType,
        dueDate: dueDate.toISOString(),
        linkedName,
      })
    } catch (error) {
      console.error('[AddTaskModal] Error saving task:', error)
      // Error is already handled by parent component, just reset submitting state
    } finally {
      // Reset submitting state after completion (success or error)
      setIsSubmitting(false)
    }
  }

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [linkedSearchOpen, setLinkedSearchOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (formData.dueDate) {
      setSelectedDate(new Date(formData.dueDate))
    }
  }, [formData.dueDate])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] w-[95vw] max-h-[95vh] overflow-hidden p-0 border border-slate-700/60 shadow-xl [&>button]:hidden">
        <div className="absolute inset-0 bg-slate-900/98" />
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Compact Header */}
          <DialogHeader className="px-3 py-2 border-b border-slate-700/60 bg-slate-800/50 relative">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xs font-semibold flex items-center gap-1.5 text-white">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 rounded bg-red-500/80 hover:bg-red-500 text-white border border-red-600/50 hover:border-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </DialogHeader>

          {/* Compact Client Card */}
          {preSelectedClient && (
            <div className="mx-3 mt-2 p-2 rounded border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-blue-300 mb-0.5">{preSelectedClient.nom}</p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    {preSelectedClient.telephone && (
                      <span className="flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" />
                        {preSelectedClient.telephone}
                      </span>
                    )}
                    {preSelectedClient.ville && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {preSelectedClient.ville}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" noValidate>
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-[10px] font-medium text-slate-300">
                Titre <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Appeler le client"
                disabled={isLoading || isSubmitting}
                className="h-8 px-2 text-xs border border-slate-600/70 bg-slate-800/60 text-white placeholder:text-slate-300 placeholder:opacity-70 focus:border-primary/60 focus:ring-1 focus:ring-primary/20 rounded font-light disabled:opacity-50"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-[10px] font-medium text-slate-300">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails..."
                disabled={isLoading || isSubmitting}
                className="min-h-[60px] px-2 py-1.5 text-xs border border-slate-600/80 bg-slate-800/60 text-white placeholder:text-slate-300 placeholder:opacity-70 focus:border-primary/80 focus:ring-1 focus:ring-primary/20 rounded font-light resize-none disabled:opacity-50 border-solid"
                required
              />
            </div>

            {/* Date and Assigned - Compact Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-300">
                  Date <span className="text-red-400">*</span>
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild> 
                    <Button
                      variant="outline"
                      disabled={isLoading || isSubmitting}
                      style={{ border: '1px solid rgb(71 85 105 / 0.8)' }}
                      className={cn(
                        "w-full h-8 px-2 justify-start text-left text-xs font-light bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-500/80 focus-visible:border-primary/80 focus-visible:ring-1 focus-visible:ring-primary/20 rounded disabled:opacity-50 transition-colors border-solid",
                        selectedDate ? "text-white" : "text-slate-300"
                      )}
                    >
                      <CalendarIcon className={cn("mr-1 h-3 w-3 shrink-0", selectedDate ? "text-primary" : "text-slate-400")} />
                      <span className={cn("truncate font-normal", selectedDate ? "text-white" : "text-slate-300")}>
                        {selectedDate ? format(selectedDate, "d MMM", { locale: fr }) : "Sélectionner une date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border border-slate-700 bg-slate-800" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        if (date) {
                          setFormData({ ...formData, dueDate: format(date, "yyyy-MM-dd") })
                        }
                        setDatePickerOpen(false)
                      }}
                      initialFocus
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-300">
                  Assigné <span className="text-red-400">*</span>
                </Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isLoading || isSubmitting}
                      style={{ border: '1px solid rgb(71 85 105 / 0.8)' }}
                      className={cn(
                        "w-full h-8 px-2 justify-between text-xs font-light bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-500/80 focus-visible:border-primary/80 focus-visible:ring-1 focus-visible:ring-primary/20 rounded disabled:opacity-50 transition-colors border-solid",
                        formData.assignedTo ? "text-white" : "text-slate-300"
                      )}
                    >
                      <span className={cn("truncate flex items-center gap-1 font-normal", formData.assignedTo ? "text-white" : "text-slate-300")}>
                        <User className={cn("h-3 w-3 shrink-0", formData.assignedTo ? "text-primary" : "text-slate-400")} />
                        {formData.assignedTo || "Sélectionner un utilisateur"}
                      </span>
                      <Search className="h-3 w-3 text-slate-400 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0 border border-slate-700 bg-slate-800" align="start">
                    <Command className="bg-slate-800">
                      <CommandInput placeholder="Rechercher..." className="text-xs border-b border-slate-700 h-8" />
                      <CommandList>
                        <CommandEmpty className="text-xs text-slate-400 py-2 text-center">Aucun utilisateur.</CommandEmpty>
                        <CommandGroup>
                          {users.map((u) => (
                            <CommandItem
                              key={u}
                              value={u}
                              onSelect={() => {
                                setFormData({ ...formData, assignedTo: u })
                                setUserSearchOpen(false)
                              }}
                              className="text-xs cursor-pointer hover:bg-slate-700 py-1.5"
                            >
                              <User className="mr-1.5 h-3 w-3" />
                              {u}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status - Compact */}
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-slate-300">Statut</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "a_faire" })}
                  disabled={isLoading}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-1.5 rounded border transition-all",
                    formData.status === "a_faire"
                      ? "bg-red-500/20 border-red-500/60 text-red-400"
                      : "bg-slate-800/60 border-slate-600/70 text-slate-400 hover:border-slate-500/70 hover:bg-slate-700/60",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <CircleDashed className="w-3 h-3" />
                  <span className="text-[9px] font-light">À faire</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "en_cours" })}
                  disabled={isLoading}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-1.5 rounded border transition-all",
                    formData.status === "en_cours"
                      ? "bg-orange-500/20 border-orange-500/60 text-orange-400"
                      : "bg-slate-800/60 border-slate-600/70 text-slate-400 hover:border-slate-500/70 hover:bg-slate-700/60",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-light">En cours</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "termine" })}
                  disabled={isLoading}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-1.5 rounded border transition-all",
                    formData.status === "termine"
                      ? "bg-green-500/20 border-green-500/60 text-green-400"
                      : "bg-slate-800/60 border-slate-600/70 text-slate-400 hover:border-slate-500/70 hover:bg-slate-700/60",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[9px] font-light">Terminé</span>
                </button>
              </div>
            </div>

            {/* Link Section - Compact */}
            {!preSelectedClient && (
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-slate-300 flex items-center gap-1">
                  <Link2 className="h-3 w-3 text-primary" />
                  Lier à un Lead/Contact
                </Label>
                <Popover 
                  open={linkedSearchOpen} 
                  onOpenChange={(open) => {
                    setLinkedSearchOpen(open)
                    if (!open) setSearchQuery("")
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isLoading || isSubmitting}
                      style={{ border: '1px solid rgb(71 85 105 / 0.8)' }}
                      className={cn(
                        "w-full h-8 px-2 justify-between text-xs font-light bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-500/80 focus-visible:border-primary/80 focus-visible:ring-1 focus-visible:ring-primary/20 rounded disabled:opacity-50 transition-colors border-solid",
                        formData.linkedId ? "text-white" : "text-slate-300"
                      )}
                    >
                      {formData.linkedId ? (
                        <span className="flex items-center gap-1 truncate text-white font-normal">
                          {combinedItems.find(item => item.id === formData.linkedId)?.type === 'lead' ? (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30">Lead</span>
                          ) : (
                            <span className="px-1 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30">Contact</span>
                          )}
                          <span className="truncate text-white">{combinedItems.find(item => item.id === formData.linkedId)?.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">Rechercher un lead ou contact...</span>
                      )}
                      <Search className="h-3 w-3 text-slate-400 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] max-w-[90vw] p-0 border border-slate-700 bg-slate-800" align="start">
                    <Command className="bg-slate-800" shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher..."
                        className="text-xs border-b border-slate-700 h-8"
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty className="text-xs text-slate-400 py-2 text-center">
                          {isLoadingContacts ? 'Chargement...' : 'Aucun résultat.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredItems.map((item) => (
                            <CommandItem
                              key={`${item.type}-${item.id}`}
                              value={`${item.name}-${item.id}`}
                              onSelect={() => {
                                const apiLinkedType = (item.type === 'contact' ? 'client' : item.type) as LinkedType
                                setFormData({ 
                                  ...formData, 
                                  linkedId: item.id, 
                                  linkedName: item.name,
                                  linkedType: apiLinkedType
                                })
                                setLinkedSearchOpen(false)
                                setSearchQuery("")
                              }}
                              className="text-xs cursor-pointer hover:bg-slate-700 py-1.5"
                            >
                              <div className="flex items-center gap-2 w-full">
                                {item.type === 'lead' ? (
                                  <span className="px-1 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30">Lead</span>
                                ) : (
                                  <span className="px-1 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30">Contact</span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-light text-white truncate">{item.name}</div>
                                  {(item.phone || item.city) && (
                                    <div className="text-[9px] text-slate-400 truncate">
                                      {item.phone && <span>{item.phone}</span>}
                                      {item.phone && item.city && <span> • </span>}
                                      {item.city && <span>{item.city}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Reminder - Compact */}
            <div className="space-y-1 p-2 rounded border border-slate-700/60 bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {formData.reminderEnabled ? (
                    <Bell className="w-3 h-3 text-primary" />
                  ) : (
                    <BellOff className="w-3 h-3 text-slate-400" />
                  )}
                  <div>
                    <Label className="text-[10px] font-medium text-white">Rappel automatique</Label>
                    <p className="text-[9px] text-slate-400">
                      {formData.reminderEnabled 
                        ? `${formData.reminderDays} jour(s) avant`
                        : "Email avant échéance"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                  disabled={isLoading}
                  className={cn(
                    "relative inline-flex h-4 w-7 items-center rounded-full transition-colors border",
                    formData.reminderEnabled ? "bg-primary border-primary" : "bg-slate-700 border-slate-600",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                      formData.reminderEnabled ? "translate-x-3.5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {formData.reminderEnabled && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-700/60 mt-1.5">
                  <Input
                    id="reminderDays"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 2 })}
                    disabled={isLoading}
                    className="text-center text-xs font-light w-12 h-7 px-1 border border-slate-600/70 bg-slate-900/60 text-white focus:border-primary/60 focus:ring-1 focus:ring-primary/20 rounded disabled:opacity-50"
                  />
                  <span className="text-[9px] text-slate-400">jour(s) avant</span>
                </div>
              )}
            </div>
          </form>

          {/* Compact Footer */}
          <div className="px-3 py-2 border-t border-slate-700/60 bg-slate-800/50">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading || isSubmitting}
                className="h-7 px-3 text-xs font-light border border-slate-600/70 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white hover:border-slate-500/70 rounded disabled:opacity-50"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
                onClick={handleSubmit}
                className={cn(
                  "h-7 px-4 text-xs font-medium rounded transition-all relative overflow-hidden border border-primary/50",
                  "bg-primary hover:bg-primary/90 text-white",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                  (isLoading || isSubmitting) && "cursor-wait"
                )}
              >
                {(isLoading || isSubmitting) ? (
                  <span className="flex items-center gap-1.5 relative z-10">
                    <CircleDashed className="h-3 w-3 animate-spin" />
                    <span>{editingTask ? "Mise à jour..." : "Création..."}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {editingTask ? "Mettre à jour" : "Créer"}
                  </span>
                )}
                {(isLoading || isSubmitting) && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    style={{
                      animation: 'button-shimmer 2s infinite',
                      transform: 'translateX(-100%)'
                    }}
                  />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
