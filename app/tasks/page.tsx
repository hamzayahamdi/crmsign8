"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Filter, X, ChevronDown, Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react"
import type { Task, TaskStatus } from "@/types/task"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { TasksTable } from "@/components/tasks-table"
import { AddTaskModal } from "@/components/add-task-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Header } from "@/components/header"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { TasksService } from "@/lib/tasks-service"
import { toast } from "sonner"

export default function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    assignedTo: "all" as string,
    status: "all" as "all" | TaskStatus,
    linkedType: "all" as "all" | "lead" | "client",
  })

  // Load tasks from API
  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const fetchedTasks = await TasksService.getTasks()
      setTasks(fetchedTasks)
    } catch (error: any) {
      console.error('Error loading tasks:', error)
      toast.error(error.message || 'Erreur lors du chargement des tâches')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleAddTask = () => {
    setEditingTask(null)
    setIsAddModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsAddModalOpen(true)
  }

  const handleSaveTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      if (editingTask) {
        // Update existing task
        await TasksService.updateTask(editingTask.id, taskData)
        toast.success('Tâche mise à jour avec succès')
      } else {
        // Create new task
        await TasksService.createTask({
          ...taskData,
          createdBy: user?.name || "Système",
        })
        toast.success('Tâche créée avec succès')
      }

      // Reload tasks from database
      await loadTasks()
      setIsAddModalOpen(false)
      setEditingTask(null)
    } catch (error) {
      console.error('Error saving task:', error)
      toast.error('Erreur lors de l\'enregistrement de la tâche')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await TasksService.deleteTask(taskId)
      toast.success('Tâche supprimée avec succès')
      await loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Erreur lors de la suppression de la tâche')
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    console.log('[TasksPage] handleUpdateTaskStatus called:', { taskId, status, hasId: !!taskId })
    try {
      if (!taskId) {
        console.error('[TasksPage] Missing taskId!')
        toast.error("ID de la tâche manquant")
        return
      }
      await TasksService.updateTaskStatus(taskId, status)
      toast.success('Statut mis à jour')
      await loadTasks()
    } catch (error: any) {
      console.error('[TasksPage] Error updating task status:', error)
      toast.error(error?.message || 'Erreur lors de la mise à jour du statut')
    }
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status !== "all") count++
    if (filters.linkedType !== "all") count++
    if (filters.assignedTo !== "all") count++
    return count
  }

  const clearAllFilters = () => {
    setFilters({
      assignedTo: "all",
      status: "all",
      linkedType: "all",
    })
  }

  const removeFilter = (filterType: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: "all"
    }))
  }

  // Filter tasks based on user role
  const userRole = (user?.role || '').toLowerCase()
  // Guard against malformed items missing an id
  const validTasks = tasks.filter(t => !!t.id)
  const filteredTasksByRole = userRole === 'architect'
    ? validTasks.filter(t => {
      if (!user) return false
      return t.assignedTo === user.name || t.assignedTo === user.id
    })
    : validTasks

  // Calculate statistics
  const totalTasks = filteredTasksByRole.length
  const todoTasks = filteredTasksByRole.filter(t => t.status === "a_faire").length
  const inProgressTasks = filteredTasksByRole.filter(t => t.status === "en_cours").length
  const completedTasks = filteredTasksByRole.filter(t => t.status === "termine").length

  // Get unique values for filters
  const uniqueAssignees = Array.from(new Set(tasks.map(t => t.assignedTo)))

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
          <Header onCreateTask={handleAddTask} />

          {/* Removed page title and subtitle for a cleaner layout */}

          {/* Stats Cards */}
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-light text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-light text-white leading-tight">{totalTasks}</p>
                    <p className="text-[10px] font-light text-slate-500 mt-0.5">Tâches</p>
                  </div>
                  <div className="shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-red-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-light text-slate-400 mb-0.5 uppercase tracking-wider">À faire</p>
                    <p className="text-2xl font-light text-red-400 leading-tight">{todoTasks}</p>
                    <p className="text-[10px] font-light text-slate-500 mt-0.5">Tâches</p>
                  </div>
                  <div className="shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-red-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-light text-slate-400 mb-0.5 uppercase tracking-wider">En cours</p>
                    <p className="text-2xl font-light text-orange-400 leading-tight">{inProgressTasks}</p>
                    <p className="text-[10px] font-light text-slate-500 mt-0.5">Tâches</p>
                  </div>
                  <div className="shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-green-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-light text-slate-400 mb-0.5 uppercase tracking-wider">Terminées</p>
                    <p className="text-2xl font-light text-green-400 leading-tight">{completedTasks}</p>
                    <p className="text-[10px] font-light text-slate-500 mt-0.5">Tâches</p>
                  </div>
                  <div className="shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-3 md:px-4 pb-2 space-y-2">
            {/* Search Bar and Add Button */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 h-9 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-lg text-xs font-light"
                />
              </div>
              <Button
                onClick={handleAddTask}
                className="h-9 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-light text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nouvelle Tâche
              </Button>
            </div>

            {/* Filters */}
            <div className="glass rounded-lg border border-slate-600/30">
              {/* Filter Header */}
              <div className="flex items-center justify-between p-2.5 gap-2">
                <div
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <span className="font-light text-white text-xs">Filtres</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-light">
                      {getActiveFiltersCount()} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronDown className={cn(
                    "w-3 h-3 text-white transition-transform ml-auto",
                    isFiltersOpen && "rotate-180"
                  )} />
                </div>

                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearAllFilters()
                    }}
                    className="text-[9px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700/50 font-light"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Effacer</span>
                  </button>
                )}
              </div>

              {/* Active Filter Chips */}
              {getActiveFiltersCount() > 0 && (
                <div className="border-t border-slate-600/30 px-2.5 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {filters.status !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 font-light">
                        Statut: {filters.status === "a_faire" ? "À faire" : filters.status === "en_cours" ? "En cours" : "Terminé"}
                        <button onClick={() => removeFilter('status')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {filters.linkedType !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 font-light">
                        Type: {filters.linkedType === "lead" ? "Lead" : "Client"}
                        <button onClick={() => removeFilter('linkedType')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                    {filters.assignedTo !== "all" && (
                      <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1.5 font-light">
                        Assigné à: {filters.assignedTo}
                        <button onClick={() => removeFilter('assignedTo')} className="hover:text-primary/70">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Content */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-2.5 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {/* Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-light text-white">Statut</label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters(f => ({ ...f, status: value as any }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 font-light">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="a_faire">À faire</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="termine">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Linked Type Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-light text-white">Lié à</label>
                      <Select
                        value={filters.linkedType}
                        onValueChange={(value) => setFilters(f => ({ ...f, linkedType: value as any }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 font-light">
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assigned To Filter - Only show for Admin/Operator */}
                    {userRole !== 'architect' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-light text-white">Assigné à</label>
                        <Select
                          value={filters.assignedTo}
                          onValueChange={(value) => setFilters(f => ({ ...f, assignedTo: value }))}
                        >
                          <SelectTrigger className="h-8 text-xs w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 font-light">
                            <SelectValue placeholder="Tous" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 text-white">
                            <SelectItem value="all">Tous</SelectItem>
                            {uniqueAssignees.map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Table or Empty State */}
          <div className="flex-1 px-3 md:px-4 pb-4 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-lg border border-slate-600/30 p-6 max-w-xl w-full text-center">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                  <h2 className="text-sm font-light text-white mb-1.5">Chargement des tâches...</h2>
                  <p className="text-xs font-light text-slate-400">Veuillez patienter</p>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-lg border border-slate-600/30 p-6 max-w-xl w-full text-center">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <h2 className="text-sm font-light text-white mb-1.5">Aucune tâche pour le moment</h2>
                  <p className="text-xs font-light text-slate-400 mb-3">Ajoutez une nouvelle tâche pour commencer à organiser votre travail.</p>
                  <Button
                    onClick={handleAddTask}
                    className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs font-light"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Créer ma première tâche
                  </Button>
                </div>
              </div>
            ) : (
              <TasksTable
                tasks={filteredTasksByRole}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onUpdateStatus={handleUpdateTaskStatus}
                searchQuery={searchQuery}
                filters={filters}
              />
            )}
          </div>
        </main>

        {/* Add/Edit Task Modal */}
        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false)
            setEditingTask(null)
          }}
          onSave={handleSaveTask}
          editingTask={editingTask}
        />
      </div>
    </AuthGuard>
  )
}
