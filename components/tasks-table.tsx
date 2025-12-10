"use client"

import { useState, useEffect } from "react"
import { Edit2, Trash2, ExternalLink, CheckCircle2, Clock, CircleDashed, Loader2, User, Calendar, Bell } from "lucide-react"
import type { Task, TaskStatus } from "@/types/task"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface TasksTableProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onUpdateStatus: (taskId: string, status: TaskStatus) => void
  searchQuery: string
  filters: {
    assignedTo: string
    status: "all" | TaskStatus
    linkedType: "all" | "lead" | "client"
  }
}

export function TasksTable({
  tasks,
  onEditTask,
  onDeleteTask,
  onUpdateStatus,
  searchQuery,
  filters,
}: TasksTableProps) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [userNameById, setUserNameById] = useState<Record<string, string>>({})

  // Load users once to resolve assignedTo ids into human-readable names
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/users")
        if (!res.ok) return
        const users = (await res.json()) as Array<{ id?: string; name?: string }>
        const map: Record<string, string> = {}
        for (const u of users) {
          if (u.id && u.name) {
            map[u.id] = u.name
          }
        }
        setUserNameById(map)
      } catch (error) {
        console.error("[TasksTable] Failed to load users for assignedTo mapping", error)
      }
    }

    loadUsers()
  }, [])

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.createdBy && task.createdBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.linkedName && task.linkedName.toLowerCase().includes(searchQuery.toLowerCase()))

    // Status filter
    const matchesStatus = filters.status === "all" || task.status === filters.status

    // Linked type filter
    const matchesLinkedType = filters.linkedType === "all" || task.linkedType === filters.linkedType

    // Assigned to filter (supports both raw id and resolved name)
    const assignedDisplayName = userNameById[task.assignedTo] || task.assignedTo
    const matchesAssignedTo =
      filters.assignedTo === "all" ||
      task.assignedTo === filters.assignedTo ||
      assignedDisplayName === filters.assignedTo

    return matchesSearch && matchesStatus && matchesLinkedType && matchesAssignedTo
  })

  // Sort by creation date (newest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "a_faire":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-light bg-red-500/20 text-red-400 border border-red-500/30">
            À faire
          </span>
        )
      case "en_cours":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-light bg-blue-500/20 text-blue-400 border border-blue-500/30">
            En cours
          </span>
        )
      case "termine":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-light bg-green-500/20 text-green-400 border border-green-500/30">
            Terminé
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const formatted = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)

    if (diffDays < 0) {
      return <span className="text-red-400">{formatted} (En retard)</span>
    } else if (diffDays === 0) {
      return <span className="text-orange-400">{formatted} (Aujourd'hui)</span>
    } else if (diffDays === 1) {
      return <span className="text-yellow-400">{formatted} (Demain)</span>
    } else if (diffDays <= 3) {
      return <span className="text-yellow-400">{formatted} ({diffDays}j)</span>
    }

    return <span className="text-slate-300">{formatted}</span>
  }

  const renderStatusPill = (status: TaskStatus) => {
    const base = "inline-flex items-center gap-1.5 px-2 h-7 rounded-full text-xs font-light border whitespace-nowrap select-none"
    if (status === "a_faire") {
      return (
        <span className={cn(base, "bg-red-500/15 text-red-300 border-red-500/30")}>
          <CircleDashed className="w-3.5 h-3.5" /> À faire
        </span>
      )
    }
    if (status === "en_cours") {
      return (
        <span className={cn(base, "bg-blue-500/15 text-blue-300 border-blue-500/30")}>
          <Clock className="w-3.5 h-3.5" /> En cours
        </span>
      )
    }
    return (
      <span className={cn(base, "bg-green-500/15 text-green-300 border-green-500/30")}>
        <CheckCircle2 className="w-3.5 h-3.5" /> Terminé
      </span>
    )
  }

  const handleLinkedClick = (task: Task) => {
    if (task.linkedType === "lead") {
      router.push("/")
    } else {
      // For CRM v2, tasks linked to a dossier should open the Contact workspace
      if (task.linkedId) {
        router.push(`/contacts/${task.linkedId}`)
      } else {
        router.push("/contacts")
      }
    }
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="glass rounded-xl md:rounded-2xl border border-slate-600/30 p-8 md:p-12 text-center">
        <Calendar className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3 md:mb-4" />
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Aucune tâche trouvée</h2>
        <p className="text-sm md:text-base text-slate-400">Essayez de modifier vos filtres ou ajoutez une nouvelle tâche.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-2.5">
        {sortedTasks.map((task, index) => {
          const isOverdue = new Date(task.dueDate) < new Date()
          const hasReminder = task.reminderEnabled && task.reminderDays
          
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.2 }}
              className={cn(
                "relative overflow-hidden rounded-lg border transition-all duration-200",
                task.status === "a_faire" && "bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-slate-700/50 hover:border-red-500/30",
                task.status === "en_cours" && "bg-gradient-to-br from-blue-900/20 to-slate-900/40 border-blue-700/50 hover:border-blue-500/30",
                task.status === "termine" && "bg-gradient-to-br from-green-900/20 to-slate-900/40 border-green-700/50 hover:border-green-500/30",
                isOverdue && task.status !== "termine" && "border-red-500/50 bg-gradient-to-br from-red-900/20 to-slate-900/40"
              )}
            >
              {/* Status indicator bar */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-0.5",
                task.status === "a_faire" && "bg-red-500",
                task.status === "en_cours" && "bg-blue-500",
                task.status === "termine" && "bg-green-500"
              )} />
              
              <div className="p-3.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-light text-white leading-tight truncate">{task.title}</h3>
                      {hasReminder && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30">
                          <Bell className="w-2.5 h-2.5 text-primary" />
                          <span className="text-[9px] font-light text-primary">{task.reminderDays}j</span>
                        </div>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs font-light text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Select
                      value={task.status}
                      onValueChange={async (value) => {
                        if (value === task.status) return
                        if (!task.id) return
                        try {
                          setUpdatingId(task.id)
                          await onUpdateStatus(task.id, value as TaskStatus)
                        } finally {
                          setUpdatingId(null)
                        }
                      }}
                      disabled={updatingId === task.id || !task.id}
                    >
                      <SelectTrigger className="h-7 w-[100px] bg-slate-800/50 border-slate-600/50 text-white text-[10px] font-light px-2">
                        <div className="flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
                          {task.status === "a_faire" && <CircleDashed className="w-3 h-3 text-red-400" />}
                          {task.status === "en_cours" && <Clock className="w-3 h-3 text-blue-400" />}
                          {task.status === "termine" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                          <span className="truncate text-[10px]">
                            {task.status === "a_faire" ? "À faire" : task.status === "en_cours" ? "En cours" : "Terminé"}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="glass border-border/40">
                        <SelectItem value="a_faire" className="text-xs font-light">À faire</SelectItem>
                        <SelectItem value="en_cours" className="text-xs font-light">En cours</SelectItem>
                        <SelectItem value="termine" className="text-xs font-light">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Details Grid - Compact */}
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-light text-slate-500 uppercase tracking-wide mb-0.5">Assigné</p>
                      <p className="text-xs font-light text-white truncate">
                        {userNameById[task.assignedTo] || task.assignedTo || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-light text-slate-500 uppercase tracking-wide mb-0.5">Échéance</p>
                      <div className="text-xs font-light">{formatDate(task.dueDate)}</div>
                    </div>
                  </div>
                </div>

                {/* Linked To */}
                {task.linkedName && (
                  <div className="mb-2.5">
                    <button
                      onClick={() => handleLinkedClick(task)}
                      className="flex items-center gap-1.5 text-xs font-light text-primary hover:text-primary/80 transition-colors w-full"
                    >
                      <span className="capitalize">{task.linkedType}</span>
                      <span className="text-slate-400 truncate">: {task.linkedName}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-700/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditTask(task)}
                    className="h-7 px-2.5 text-slate-400 hover:text-white hover:bg-slate-700/50 text-[10px] font-light"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-[10px] font-light"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass border-border/40 max-w-[90vw]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-light">Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription className="font-light">
                          Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="hover:bg-accent font-light">Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteTask(task.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-light"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block glass rounded-2xl border border-slate-600/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/60 border-b border-slate-600/30">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Tâche</th>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Assigné à</th>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Créée par</th>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Échéance</th>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Statut</th>
                <th className="text-left px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Lié à</th>
                <th className="text-right px-6 py-3.5 text-xs tracking-wide uppercase font-light text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-600/30">
              {sortedTasks.map((task, idx) => (
                <tr
                  key={task.id}
                  className={cn(
                    "transition-colors group border-l-4",
                    task.status === "a_faire" && "border-l-red-500/50",
                    task.status === "en_cours" && "border-l-blue-500/50",
                    task.status === "termine" && "border-l-green-500/50",
                    idx % 2 === 1 ? "bg-slate-800/20" : "bg-slate-800/10",
                    "hover:bg-slate-800/40"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-light text-white leading-tight">{task.title}</p>
                        {task.reminderEnabled && task.reminderDays && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30">
                            <Bell className="w-2.5 h-2.5 text-primary" />
                            <span className="text-[9px] font-light text-primary">{task.reminderDays}j</span>
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs font-light text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-light text-white">
                      {userNameById[task.assignedTo] || task.assignedTo || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-light text-slate-300 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {task.createdBy || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-light">{formatDate(task.dueDate)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status}
                        onValueChange={async (value) => {
                          if (value === task.status) return
                          console.log('[TasksTable] Updating task:', { id: task.id, status: value, hasId: !!task.id })
                          if (!task.id) {
                            console.error('[TasksTable] No task.id found!', task)
                            return
                          }
                          try {
                            setUpdatingId(task.id)
                            await onUpdateStatus(task.id, value as TaskStatus)
                          } finally {
                            setUpdatingId(null)
                          }
                        }}
                        disabled={updatingId === task.id || !task.id}
                      >
                        <SelectTrigger className="h-9 w-[160px] bg-slate-800/50 border-slate-600/50 text-white justify-start pr-8 overflow-visible">
                          <div className="flex items-center gap-2 pointer-events-none whitespace-nowrap">
                            {renderStatusPill(task.status)}
                          </div>
                          <SelectValue className="sr-only" />
                        </SelectTrigger>
                        <SelectContent className="glass border-border/40">
                          <SelectItem value="a_faire">
                            <span className="inline-flex items-center gap-2 text-red-400">
                              <CircleDashed className="w-4 h-4" /> À faire
                            </span>
                          </SelectItem>
                          <SelectItem value="en_cours">
                            <span className="inline-flex items-center gap-2 text-blue-400">
                              <Clock className="w-4 h-4" /> En cours
                            </span>
                          </SelectItem>
                          <SelectItem value="termine">
                            <span className="inline-flex items-center gap-2 text-green-400">
                              <CheckCircle2 className="w-4 h-4" /> Terminé
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {updatingId === task.id && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleLinkedClick(task)}
                      className="flex items-center gap-2 text-sm font-light text-primary hover:text-primary/80 transition-colors"
                    >
                      <span className="capitalize">{task.linkedType}</span>
                      {task.linkedName && (
                        <span className="text-slate-400">: {task.linkedName}</span>
                      )}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700/50 font-light"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-light"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass border-border/40">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-light">Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription className="font-light">
                              Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="hover:bg-accent font-light">Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteTask(task.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-light"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
