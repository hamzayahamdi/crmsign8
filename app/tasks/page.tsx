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
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Erreur lors du chargement des tâches')
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
      <div className="flex min-h-screen bg-[oklch(22%_0.03_260)]">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header />
          
          {/* Removed page title and subtitle for a cleaner layout */}

          {/* Stats Cards */}
          <div className="p-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Total Tâches</p>
                    <p className="text-3xl font-bold text-white">{totalTasks}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">À faire</p>
                    <p className="text-3xl font-bold text-white">{todoTasks}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">En cours</p>
                    <p className="text-3xl font-bold text-white">{inProgressTasks}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-5 border border-slate-600/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Terminées</p>
                    <p className="text-3xl font-bold text-white">{completedTasks}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4 space-y-3">
            {/* Search Bar and Add Button */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, description, assigné à..."
                  className="pl-12 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-xl"
                />
              </div>
              <Button
                onClick={handleAddTask}
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouvelle Tâche
              </Button>
            </div>

            {/* Filters */}
            <div className="glass rounded-xl border border-slate-600/30">
              {/* Filter Header */}
              <div className="flex items-center justify-between p-4 gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                >
                  <Filter className="w-5 h-5 text-primary" />
                  <span className="font-medium text-white">Filtres</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-medium">
                      {getActiveFiltersCount()} actif{getActiveFiltersCount() > 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronDown className={cn(
                    "w-4 h-4 text-white transition-transform ml-auto",
                    isFiltersOpen && "rotate-180"
                  )} />
                </div>

                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearAllFilters()
                    }}
                    className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Effacer filtres
                  </button>
                )}
              </div>

              {/* Active Filter Chips */}
              {getActiveFiltersCount() > 0 && (
                <div className="border-t border-slate-600/30 px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {filters.status !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Statut: {filters.status === "a_faire" ? "À faire" : filters.status === "en_cours" ? "En cours" : "Terminé"}
                        <button onClick={() => removeFilter('status')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.linkedType !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Type: {filters.linkedType === "lead" ? "Lead" : "Client"}
                        <button onClick={() => removeFilter('linkedType')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {filters.assignedTo !== "all" && (
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-2">
                        Assigné à: {filters.assignedTo}
                        <button onClick={() => removeFilter('assignedTo')} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Content */}
              {isFiltersOpen && (
                <div className="border-t border-slate-600/30 p-4 bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Statut</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                      </select>
                    </div>

                    {/* Linked Type Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Lié à</label>
                      <select
                        value={filters.linkedType}
                        onChange={(e) => setFilters(f => ({ ...f, linkedType: e.target.value as any }))}
                        className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      >
                        <option value="all">Tous</option>
                        <option value="lead">Lead</option>
                        <option value="client">Client</option>
                      </select>
                    </div>

                    {/* Assigned To Filter - Only show for Admin/Operator */}
                    {userRole !== 'architect' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Assigné à</label>
                        <select
                          value={filters.assignedTo}
                          onChange={(e) => setFilters(f => ({ ...f, assignedTo: e.target.value }))}
                          className="h-10 w-full rounded-lg bg-slate-700/80 border border-slate-500/60 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                        >
                          <option value="all">Tous</option>
                          {uniqueAssignees.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Table or Empty State */}
          <div className="flex-1 px-6 pb-6 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                  <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                  <h2 className="text-2xl font-bold text-white mb-2">Chargement des tâches...</h2>
                  <p className="text-slate-400">Veuillez patienter</p>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="glass rounded-2xl border border-slate-600/30 p-8 max-w-xl w-full text-center">
                  <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Aucune tâche pour le moment</h2>
                  <p className="text-slate-400 mb-4">Ajoutez une nouvelle tâche pour commencer à organiser votre travail.</p>
                  <Button
                    onClick={handleAddTask}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
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
