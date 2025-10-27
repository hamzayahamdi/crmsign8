"use client"

import { useState, useEffect } from "react"
import { X, ListTodo, Calendar as CalendarIcon, User, Flag, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Client } from "@/types/client"

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onCreateTask: (task: TaskData) => void
}

export interface TaskData {
  title: string
  description: string
  dueDate: string
  priority: "low" | "medium" | "high"
  assignedTo: string
  status: "pending"
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export function CreateTaskModal({
  isOpen,
  onClose,
  client,
  onCreateTask
}: CreateTaskModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [formData, setFormData] = useState<TaskData>({
    title: "",
    description: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    priority: "medium",
    assignedTo: client.architecteAssigne,
    status: "pending"
  })

  // Fetch users on mount
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/users', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    
    onCreateTask(formData)
    
    // Reset form
    const today = new Date()
    setSelectedDate(today)
    setFormData({
      title: "",
      description: "",
      dueDate: format(today, "yyyy-MM-dd"),
      priority: "medium",
      assignedTo: client.architecteAssigne,
      status: "pending"
    })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFormData({ ...formData, dueDate: format(date, "yyyy-MM-dd") })
    }
  }

  const priorities = [
    { value: "low", label: "Basse", color: "text-blue-400 bg-blue-500/20 border-blue-500/50" },
    { value: "medium", label: "Moyenne", color: "text-orange-400 bg-orange-500/20 border-orange-500/50" },
    { value: "high", label: "Haute", color: "text-red-400 bg-red-500/20 border-red-500/50" },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <ListTodo className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">Créer une tâche</h2>
                  <p className="text-sm text-white/40">{client.nom}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-[#EAEAEA]" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Titre de la tâche *
                </Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Envoyer plans finaux au client"
                  required
                  className="h-12 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Description
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de la tâche..."
                  className="min-h-[100px] bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-purple-500/50 resize-none"
                />
              </div>

              {/* Due Date & Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                  <Label className="text-sm font-medium text-white/70 mb-2 block">
                    Date d'échéance
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 rounded-xl",
                          !selectedDate && "text-white/40"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
                        {selectedDate ? (
                          <span className="text-[#EAEAEA]">
                            {format(selectedDate, "PPP", { locale: fr })}
                          </span>
                        ) : (
                          <span className="text-white/40">Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#171B22] border-white/10" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={fr}
                        className="rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Assigned To */}
                <div>
                  <Label className="text-sm font-medium text-white/70 mb-2 block">
                    Assigné à
                  </Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                    disabled={isLoadingUsers}
                  >
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-purple-500/50">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white/40" />
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#171B22] border-white/10">
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-semibold text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{user.name}</div>
                              <div className="text-xs text-white/40">{user.role}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Priorité
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {priorities.map((priority) => (
                    <motion.button
                      key={priority.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, priority: priority.value as any })}
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.priority === priority.value
                          ? priority.color
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {priority.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!formData.title.trim()}
                  className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Créer la tâche
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
