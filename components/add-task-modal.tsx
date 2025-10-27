"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, Search, CheckCircle2, Clock, CircleDashed, User, Link2, Bell, BellOff } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Task, TaskStatus, LinkedType } from "@/types/task"
import type { Lead } from "@/types/lead"
import type { Client } from "@/types/client"
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

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">) => void
  editingTask: Task | null
}

export function AddTaskModal({ isOpen, onClose, onSave, editingTask }: AddTaskModalProps) {
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
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<string[]>([])

  // Load data sources
  useEffect(() => {
    // Leads via API (fallback to empty)
    const loadLeads = async () => {
      try {
        const apiLeads = await LeadsService.getAllLeads()
        setLeads(apiLeads || [])
      } catch {
        setLeads([])
      }
    }

    // Clients from localStorage for now
    const loadClients = () => {
      try {
        const storedClients = localStorage.getItem("signature8-clients")
        setClients(storedClients ? JSON.parse(storedClients) : [])
      } catch {
        setClients([])
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
    loadClients()
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
      setFormData({
        title: "",
        description: "",
        dueDate: "",
        assignedTo: user?.name || "",
        linkedType: "lead",
        linkedId: "",
        linkedName: "",
        status: "a_faire",
        reminderEnabled: false,
        reminderDays: 2,
      })
    }
  }, [editingTask, user, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Find the linked item name
    let linkedName = formData.linkedName
    if (formData.linkedId) {
      if (formData.linkedType === "lead") {
        const lead = leads.find(l => l.id === formData.linkedId)
        linkedName = lead?.nom || ""
      } else {
        const client = clients.find(c => c.id === formData.linkedId)
        linkedName = client?.nom || ""
      }
    }

    onSave({
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString(),
      linkedName,
    })
  }

  const getLinkedOptions = () => {
    if (formData.linkedType === "lead") {
      return leads.map(lead => ({
        id: lead.id,
        name: `${lead.nom} - ${lead.telephone} (${lead.ville})`,
      }))
    } else {
      return clients.map(client => ({
        id: client.id,
        name: `${client.nom} - ${client.telephone} (${client.ville})`,
      }))
    }
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
      <DialogContent className="glass border-border/40 w-[96vw] !max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white text-sm">
              Titre de la tâche <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Appeler le client pour validation"
              className="bg-slate-800/50 border-slate-600/50 text-white h-9 text-sm"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white text-sm">
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de la tâche..."
              className="bg-slate-800/50 border-slate-600/50 text-white min-h-[70px] text-sm"
              required
            />
          </div>

          {/* Due Date and Assigned To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2 text-sm">
                <CalendarIcon className="w-3.5 h-3.5" />
                Date d'échéance <span className="text-red-400">*</span>
              </Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 hover:text-white h-9 text-sm",
                      !selectedDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass border-border/40" align="start">
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
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5" />
                Assigné à <span className="text-red-400">*</span>
              </Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 hover:text-white h-8 text-sm",
                      !formData.assignedTo && "text-slate-400"
                    )}
                  >
                    {formData.assignedTo || "Sélectionner un utilisateur"}
                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 glass border-border/40">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Rechercher un utilisateur..." className="text-white" />
                    <CommandList>
                      <CommandEmpty className="text-slate-400 py-6 text-center text-sm">Aucun utilisateur trouvé.</CommandEmpty>
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
                              className="text-white hover:bg-slate-700/50 cursor-pointer"
                            >
                              <User className="mr-2 h-4 w-4" />
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
                            className="text-white hover:bg-slate-700/50 cursor-pointer"
                          >
                            <User className="mr-2 h-4 w-4" />
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
          <div className="space-y-2">
            <Label className="text-white text-sm font-medium">Statut de la tâche</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "a_faire" })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all",
                  formData.status === "a_faire"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-slate-800/30 border-slate-600/30 text-slate-400 hover:border-slate-500"
                )}
              >
                <CircleDashed className="w-5 h-5" />
                <span className="text-xs font-medium">À faire</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "en_cours" })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all",
                  formData.status === "en_cours"
                    ? "bg-blue-500/20 border-blue-500 text-blue-400"
                    : "bg-slate-800/30 border-slate-600/30 text-slate-400 hover:border-slate-500"
                )}
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs font-medium">En cours</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "termine" })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-all",
                  formData.status === "termine"
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : "bg-slate-800/30 border-slate-600/30 text-slate-400 hover:border-slate-500"
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-medium">Terminé</span>
              </button>
            </div>
          </div>

          {/* Linked Type and Item */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-600/40">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">Lier cette tâche à un Lead ou Client</h3>
            </div>
            <p className="text-xs text-slate-400">Associez cette tâche à un lead ou client existant pour un meilleur suivi.</p>
            
            <div className="space-y-3">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label className="text-white text-xs">Type de liaison <span className="text-red-400">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, linkedType: "lead", linkedId: "", linkedName: "" })}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all text-sm font-medium",
                      formData.linkedType === "lead"
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, linkedType: "client", linkedId: "", linkedName: "" })}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-all text-sm font-medium",
                      formData.linkedType === "client"
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    <User className="w-3.5 h-3.5" />
                    Client
                  </button>
                </div>
              </div>

              {/* Smart Search for Lead/Client */}
              <div className="space-y-2">
                <Label className="text-white text-xs">
                  Sélectionner {formData.linkedType === "lead" ? "le lead" : "le client"} <span className="text-red-400">*</span>
                </Label>
                <Popover open={linkedSearchOpen} onOpenChange={setLinkedSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-700/50 hover:text-white",
                        !formData.linkedId && "text-slate-400"
                      )}
                    >
                      {formData.linkedId 
                        ? getLinkedOptions().find(opt => opt.id === formData.linkedId)?.name 
                        : `Rechercher un ${formData.linkedType === "lead" ? "lead" : "client"}...`
                      }
                      <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] p-0 glass border-border/40">
                    <Command className="bg-transparent">
                      <CommandInput 
                        placeholder={`Rechercher par nom, téléphone, ville...`} 
                        className="text-white" 
                      />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-6 text-center text-sm">
                          Aucun {formData.linkedType === "lead" ? "lead" : "client"} trouvé.
                        </CommandEmpty>
                        <CommandGroup>
                          {getLinkedOptions().map((option) => (
                            <CommandItem
                              key={option.id}
                              value={option.name}
                              onSelect={() => {
                                setFormData({ ...formData, linkedId: option.id, linkedName: option.name })
                                setLinkedSearchOpen(false)
                              }}
                              className="text-white hover:bg-slate-700/50 cursor-pointer"
                            >
                              <User className="mr-2 h-4 w-4" />
                              <span className="flex-1">{option.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.linkedId && (
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {formData.linkedType === "lead" ? "Lead" : "Client"} sélectionné
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-600/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {formData.reminderEnabled ? (
                  <Bell className="w-4 h-4 text-primary" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">Rappel automatique</h3>
                  <p className="text-xs text-slate-400">Recevez une notification avant l'échéance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, reminderEnabled: !formData.reminderEnabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  formData.reminderEnabled ? "bg-primary" : "bg-slate-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    formData.reminderEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {formData.reminderEnabled && (
              <div className="space-y-2 pt-2 border-t border-slate-600/30">
                <Label className="text-white text-xs font-medium">
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
                    className="bg-slate-800/50 border-slate-600/50 text-white text-center text-sm font-semibold w-16 h-9"
                  />
                  <span className="text-xs text-slate-300">jour(s) avant l'échéance</span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Vous serez notifié {formData.reminderDays} jour(s) avant la date d'échéance
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-600/30">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600/50 text-white hover:bg-slate-700/50 h-9 text-sm"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white h-9 text-sm"
            >
              {editingTask ? "Mettre à jour" : "Créer la tâche"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
