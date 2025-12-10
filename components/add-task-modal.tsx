"use client"

import React, { useState, useEffect } from "react"
import { CalendarIcon, Search, CheckCircle2, Clock, CircleDashed, User, Link2, Bell, BellOff, Phone, MapPin } from "lucide-react"
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

  // Load data sources
  useEffect(() => {
    if (!isOpen) return

    // Leads via API (fallback to empty)
    const loadLeads = async () => {
      try {
        const apiLeads = await LeadsService.getAllLeads()
        setLeads(apiLeads || [])
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
      }
    }

    // Contacts via API
    const loadContacts = async () => {
      try {
        setIsLoadingContacts(true)
        const response = await ContactService.getContacts({ limit: 1000 })
        const contactsData = response.data || []
        // Filter out test contacts if needed, or just use all contacts
        setContacts(contactsData)
      } catch (error) {
        console.error('Error loading contacts:', error)
        setContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }

    // Users from API
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

  // Populate form when editing
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        dueDate: editingTask.dueDate.split("T")[0], // Format for date input
        assignedTo: editingTask.assignedTo,
        linkedType: editingTask.linkedType,
        linkedId: editingTask.linkedId,
        linkedName: editingTask.linkedName || "",
        status: editingTask.status,
        reminderEnabled: editingTask.reminderEnabled || false,
        reminderDays: editingTask.reminderDays || 2,
      })
    } else {
      // If preSelectedClient is provided, auto-select it
      const linkedType: LinkedType = preSelectedClient ? "contact" : "lead"
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
    }
  }, [editingTask, user, isOpen, preSelectedClient])

  // Combined leads and contacts for unified search (deduplicated by ID and name+phone)
  const combinedItems = React.useMemo(() => {
    const itemsMap = new Map<string, { id: string; name: string; phone: string; city: string; type: 'lead' | 'contact'; displayName: string }>()
    const seenKeys = new Set<string>() // Track by name+phone to avoid duplicates
    
    // Helper to create a unique key
    const createKey = (name: string, phone: string) => 
      `${(name || '').toLowerCase().trim()}_${(phone || '').trim()}`
    
    // Add leads
    leads.forEach(lead => {
      if (!lead.id || !lead.nom) return
      const key = createKey(lead.nom, lead.telephone || '')
      
      // Only add if we haven't seen this name+phone combination
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
    
    // Add contacts (prefer contact over lead if same name+phone)
    contacts.forEach(contact => {
      if (!contact.id || !contact.nom) return
      const key = createKey(contact.nom, contact.telephone || '')
      
      // If we've seen this name+phone before, remove the lead and add the contact
      if (seenKeys.has(key)) {
        // Find and remove the existing item with this key
        const existingItem = Array.from(itemsMap.values()).find(item => 
          createKey(item.name, item.phone) === key
        )
        if (existingItem) {
          itemsMap.delete(existingItem.id)
        }
      }
      
      // Add the contact (or update if it was a lead)
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
  
  // Filter items based on search query
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
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

    // Find the linked item name and type
    let linkedName = formData.linkedName
    let linkedType: LinkedType = formData.linkedType
    if (formData.linkedId) {
      const item = combinedItems.find(i => i.id === formData.linkedId)
      if (item) {
        linkedName = item.name
        linkedType = item.type as LinkedType
      }
    }

    // Validate date is valid
    const dueDate = new Date(formData.dueDate)
    if (isNaN(dueDate.getTime())) {
      toast.error('Date d\'échéance invalide')
      return
    }

    onSave({
      ...formData,
      linkedType,
      dueDate: dueDate.toISOString(),
      linkedName,
    })
  }


  // State for popovers
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [linkedSearchOpen, setLinkedSearchOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Update selectedDate when formData.dueDate changes
  useEffect(() => {
    if (formData.dueDate) {
      setSelectedDate(new Date(formData.dueDate))
    }
  }, [formData.dueDate])

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "a_faire":
        return <CircleDashed className="w-4 h-4" />
      case "en_cours":
        return <Clock className="w-4 h-4" />
      case "termine":
        return <CheckCircle2 className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[600px] w-[95vw] max-h-[90vh] overflow-hidden p-0 border-border/60 shadow-2xl backdrop-blur-xl bg-background/95">
        <DialogHeader className="px-4 pt-3 pb-2.5 border-b border-border/40 relative">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2 relative z-10">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Readonly Client Card - Only show when preSelectedClient is provided */}
        {preSelectedClient && (
          <div className="mx-4 mt-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[9px] font-light text-blue-400 uppercase tracking-wider">Client assigné</p>
                  <div className="px-1 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                    <span className="text-[9px] font-light text-blue-300">Lecture seule</span>
                  </div>
                </div>
                <p className="text-xs font-light text-white mb-0.5">{preSelectedClient.nom}</p>
                <div className="flex items-center gap-2 text-[10px] font-light text-white/60">
                  {preSelectedClient.telephone && (
                    <span className="flex items-center gap-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {preSelectedClient.telephone}
                    </span>
                  )}
                  {preSelectedClient.ville && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {preSelectedClient.ville}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="space-y-3">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
                Titre de la tâche <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Appeler le client pour validation"
                className="h-9 px-3 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50 font-light"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Détails de la tâche..."
                className="min-h-[60px] px-3 py-2 text-sm border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50 font-light resize-none"
                required
              />
            </div>

            {/* Due Date and Assigned To */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Date d'échéance <span className="text-red-400">*</span>
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-9 px-3 justify-start text-left text-xs font-normal border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3 w-3 text-primary" />
                      {selectedDate ? format(selectedDate, "d MMM yyyy", { locale: fr }) : "Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Assigné à <span className="text-red-400">*</span>
                </Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full h-9 px-3 justify-between text-xs font-normal border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50",
                        !formData.assignedTo && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">{formData.assignedTo || "Utilisateur"}</span>
                      <Search className="ml-1.5 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Rechercher..." className="text-xs" />
                      <CommandList>
                        <CommandEmpty className="text-xs text-muted-foreground py-4 text-center">Aucun utilisateur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {users.length > 0 ? (
                            users.map((u) => (
                              <CommandItem
                                key={u}
                                value={u}
                                onSelect={() => {
                                  setFormData({ ...formData, assignedTo: u })
                                  setUserSearchOpen(false)
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <User className="mr-2 h-3 w-3" />
                                {u}
                              </CommandItem>
                            ))
                          ) : (
                            <CommandItem
                              value={user?.name || "Système"}
                              onSelect={() => {
                                setFormData({ ...formData, assignedTo: user?.name || "Système" })
                                setUserSearchOpen(false)
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <User className="mr-2 h-3 w-3" />
                              {user?.name || "Système"}
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Statut de la tâche</Label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "a_faire" })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                    formData.status === "a_faire"
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "bg-background/30 border-border/30 text-muted-foreground hover:border-border/50"
                  )}
                >
                  <CircleDashed className="w-4 h-4" />
                  <span className="text-[10px] font-light">À faire</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "en_cours" })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                    formData.status === "en_cours"
                      ? "bg-orange-500/20 border-orange-500 text-orange-400"
                      : "bg-background/30 border-border/30 text-muted-foreground hover:border-border/50"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-light">En cours</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: "termine" })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                    formData.status === "termine"
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "bg-background/30 border-border/30 text-muted-foreground hover:border-border/50"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-light">Terminé</span>
                </button>
              </div>
            </div>

            {/* Smart Unified Lead/Client Select - Only show when NO preSelectedClient */}
            {!preSelectedClient && (
              <div className="space-y-1.5 p-2.5 bg-muted/30 rounded-lg border border-border/40">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-primary" />
                  <Label className="text-xs font-medium text-muted-foreground">
                    Lier cette tâche à un Lead ou Contact
                  </Label>
                </div>
                <Popover 
                  open={linkedSearchOpen} 
                  onOpenChange={(open) => {
                    setLinkedSearchOpen(open)
                    if (!open) {
                      setSearchQuery("")
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "h-9 w-full justify-between px-3 text-xs font-normal border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50",
                        !formData.linkedId && "text-muted-foreground"
                      )}
                    >
                      {formData.linkedId ? (
                        <span className="flex items-center gap-1.5 truncate">
                          {combinedItems.find(item => item.id === formData.linkedId)?.type === 'lead' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-light bg-blue-500/10 text-blue-300 border border-blue-500/20">Lead</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-light bg-purple-500/10 text-purple-300 border border-purple-500/20">Contact</span>
                          )}
                          <span className="truncate">{combinedItems.find(item => item.id === formData.linkedId)?.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Rechercher un lead ou contact...</span>
                      )}
                      <Search className="ml-1.5 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] max-w-[90vw] p-0" align="start">
                    <Command className="bg-transparent" shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher par nom, téléphone, ville..."
                        className="text-xs"
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty className="text-xs text-muted-foreground py-4 text-center">
                          {isLoadingContacts ? 'Chargement...' : 'Aucun résultat trouvé.'}
                        </CommandEmpty>
                        <CommandGroup heading="Résultats">
                          {filteredItems.map((item) => {
                            return (
                              <CommandItem
                                key={`${item.type}-${item.id}`}
                                value={`${item.name}-${item.id}`}
                                onSelect={() => {
                                  setFormData({ 
                                    ...formData, 
                                    linkedId: item.id, 
                                    linkedName: item.name,
                                    linkedType: item.type as LinkedType
                                  })
                                  setLinkedSearchOpen(false)
                                  setSearchQuery("")
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  {item.type === 'lead' ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-light bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">Lead</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-light bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">Contact</span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-light text-foreground truncate">{item.name}</div>
                                    {(item.phone || item.city) && (
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {item.phone && <span>{item.phone}</span>}
                                        {item.phone && item.city && <span> • </span>}
                                        {item.city && <span>{item.city}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.linkedId && (
                  <p className="text-[10px] text-green-400 flex items-center gap-1 font-light">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {formData.linkedType === "lead" ? "Lead" : "Contact"} sélectionné
                  </p>
                )}
              </div>
            )}

            {/* Reminder */}
            <div className="space-y-2 p-2.5 bg-muted/30 rounded-lg border border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {formData.reminderEnabled ? (
                    <Bell className="w-3 h-3 text-primary" />
                  ) : (
                    <BellOff className="w-3 h-3 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="text-xs font-light text-foreground">Rappel automatique</h3>
                    <p className="text-[10px] font-light text-muted-foreground">
                      {formData.reminderEnabled 
                        ? `Email envoyé ${formData.reminderDays} jour(s) avant l'échéance`
                        : "Notification par email avant l'échéance"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    formData.reminderEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      formData.reminderEnabled ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {formData.reminderEnabled && (
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <Label className="text-[10px] font-light text-muted-foreground">
                    Délai du rappel
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reminderDays"
                      type="number"
                      min="1"
                      max="30"
                      value={formData.reminderDays}
                      onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 2 })}
                      className="text-center text-xs font-light w-14 h-8 px-2 border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg bg-background/50"
                    />
                    <span className="text-[10px] font-light text-muted-foreground">jour(s) avant</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-8 px-4 text-xs font-light hover:bg-muted/50 transition-all rounded-lg"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-8 px-4 text-xs font-light shadow-sm hover:shadow transition-all bg-primary hover:bg-primary/90 rounded-lg"
              >
                {isLoading ? (
                  <>
                    <CircleDashed className="mr-1.5 h-3 w-3 animate-spin" />
                    Création...
                  </>
                ) : (
                  editingTask ? "Mettre à jour" : "Créer la tâche"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
