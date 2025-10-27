"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Clock, CircleDashed, Calendar, ChevronRight, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { TasksService } from "@/lib/tasks-service"
import type { Task, TaskStatus } from "@/types/task"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function MyTasksWidget() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMyTasks = async () => {
      if (!user?.name) return
      
      try {
        setIsLoading(true)
        const myTasks = await TasksService.getMyTasks(user.name)
        // Show only pending and in-progress tasks
        const activeTasks = myTasks.filter(t => t.status !== 'termine')
        setTasks(activeTasks.slice(0, 5)) // Show max 5 tasks
      } catch (error) {
        console.error('Error loading my tasks:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMyTasks()
  }, [user?.name])

  const handleMarkComplete = async (taskId: string) => {
    try {
      await TasksService.updateTaskStatus(taskId, 'termine')
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (error) {
      console.error('Error marking task complete:', error)
    }
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'a_faire':
        return <CircleDashed className="w-4 h-4 text-red-400" />
      case 'en_cours':
        return <Clock className="w-4 h-4 text-orange-400" />
      case 'termine':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
    }
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'a_faire':
        return 'bg-red-500/20 text-red-400 border-red-500/40'
      case 'en_cours':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
      case 'termine':
        return 'bg-green-500/20 text-green-400 border-green-500/40'
    }
  }

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'a_faire':
        return 'À faire'
      case 'en_cours':
        return 'En cours'
      case 'termine':
        return 'Terminé'
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6 border border-slate-600/30">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-6 border border-slate-600/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Mes Tâches</h3>
            <p className="text-sm text-slate-400">
              {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} active{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            Voir tout
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucune tâche active</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative p-4 rounded-xl bg-slate-800/40 border border-slate-600/30 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate mb-1">
                    {task.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
                      getStatusColor(task.status)
                    )}>
                      {getStatusLabel(task.status)}
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue(task.dueDate) ? "text-red-400" : "text-slate-400"
                    )}>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(task.dueDate), "d MMM", { locale: fr })}
                      {isOverdue(task.dueDate) && " (En retard)"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status !== 'termine' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkComplete(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Terminer
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <Link href="/tasks">
          <Button 
            variant="outline" 
            className="w-full mt-4 border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
          >
            Voir toutes mes tâches
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  )
}
