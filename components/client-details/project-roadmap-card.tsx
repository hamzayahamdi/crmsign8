"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle2, Clock, Lock, MapPin, Plus, AlertCircle, FileText, DollarSign, Package, Hammer, Receipt, Truck, Sparkles, Coins } from "lucide-react"
import type { Client, ProjectStatus } from "@/types/client"
import type { Task } from "@/types/task"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { 
  formatDuration, 
  formatDurationDetailed,
  calculateDuration, 
  formatStageUpdateDate,
  formatDateRange,
  formatDateCompact,
  type StageHistoryEntry 
} from "@/lib/stage-duration-utils"
import { useStageHistory } from "@/hooks/use-stage-history"

interface ProjectRoadmapCardProps {
  client: Client
  onUpdate: (client: Client) => void
  onAddTask?: () => void
  onAddRdv?: () => void
}

interface RoadmapStage {
  id: ProjectStatus
  label: string
  icon: string
  order: number
}

const ROADMAP_STAGES: RoadmapStage[] = [
  { id: "qualifie", label: "Qualifié", icon: "✓", order: 1 },
  { id: "acompte_recu", label: "Acompte", icon: "💰", order: 2 },
  { id: "conception", label: "Conception", icon: "🧩", order: 3 },
  { id: "devis_negociation", label: "Devis", icon: "📄", order: 4 },
  { id: "accepte", label: "Accepté", icon: "✅", order: 5 },
  { id: "premier_depot", label: "1er Dépôt", icon: "💵", order: 6 },
  { id: "projet_en_cours", label: "En Cours", icon: "⚙️", order: 7 },
  { id: "chantier", label: "Chantier", icon: "🔨", order: 8 },
  { id: "facture_reglee", label: "Facturé", icon: "🧾", order: 9 },
  { id: "livraison_termine", label: "Livré", icon: "🚚", order: 10 },
]

export function ProjectRoadmapCard({ client, onUpdate, onAddTask, onAddRdv }: ProjectRoadmapCardProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [clientTasks, setClientTasks] = useState<Task[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [liveDurations, setLiveDurations] = useState<Record<string, number>>({})

  // Use realtime stage history hook
  const { stageHistory, isLoading: isLoadingHistory } = useStageHistory(client.id)

  // Debug: Log stage history
  useEffect(() => {
    console.log('[ProjectRoadmap] Stage history loaded:', {
      clientId: client.id,
      isLoading: isLoadingHistory,
      historyCount: stageHistory?.length || 0,
      history: stageHistory
    })
  }, [client.id, isLoadingHistory, stageHistory])

  // Ensure there is at least an active stage history entry for this client
  useEffect(() => {
    const ensureStageHistory = async () => {
      try {
        // Only run when loaded and history is empty
        if (!isLoadingHistory && (!stageHistory || stageHistory.length === 0)) {
          await fetch(`/api/clients/${client.id}/stage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              newStage: client.statutProjet,
              changedBy: user?.name || 'Système (auto)'
            })
          })
        }
      } catch (e) {
        console.error('Failed to initialize stage history:', e)
      }
    }
    ensureStageHistory()
    // We purposely exclude user from deps to avoid rerun on auth changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, client.statutProjet, isLoadingHistory, stageHistory?.length])

  // Fetch tasks for this client
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks', {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          const allTasks = result.data || result
          if (Array.isArray(allTasks)) {
            const filtered = allTasks.filter(
              (task: Task) => task.linkedType === 'client' && task.linkedId === client.id && task.status !== 'termine'
            )
            setClientTasks(filtered)
          } else {
            console.error('Tasks API returned non-array:', result)
            setClientTasks([])
          }
        } else {
          console.error('Failed to fetch tasks:', response.status)
          setClientTasks([])
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setClientTasks([])
      } finally {
        setIsLoadingTasks(false)
      }
    }
    fetchTasks()
  }, [client.id])

  // Update live durations every 30 seconds for active stage
  useEffect(() => {
    const updateLiveDurations = () => {
      const activeStage = stageHistory.find(h => !h.endedAt)
      if (activeStage) {
        const duration = calculateDuration(activeStage.startedAt)
        setLiveDurations({ [activeStage.stageName]: duration })
      }
    }

    updateLiveDurations()
    const interval = setInterval(updateLiveDurations, 30000) // Update every 30s

    return () => clearInterval(interval)
  }, [stageHistory])

  // Get current stage order
  const currentStageOrder = ROADMAP_STAGES.find(s => s.id === client.statutProjet)?.order || 1

  // Get stage status
  const getStageStatus = (stage: RoadmapStage): 'completed' | 'in_progress' | 'pending' => {
    if (stage.order < currentStageOrder) return 'completed'
    if (stage.order === currentStageOrder) return 'in_progress'
    return 'pending'
  }

  // Get stage duration from history
  const getStageDuration = (stageId: ProjectStatus): string | null => {
    console.log('[getStageDuration] Checking stage:', stageId, 'History count:', stageHistory.length)
    
    const stageEntry = stageHistory.find(h => h.stageName === stageId)
    console.log('[getStageDuration] Found entry for', stageId, ':', stageEntry ? 'YES' : 'NO')
    
    const status = getStageStatus(ROADMAP_STAGES.find(s => s.id === stageId)!)
    
    // If no history entry exists
    if (!stageEntry) {
      // For the current active stage, show duration since client creation/update
      if (status === 'in_progress' && stageId === client.statutProjet) {
        const referenceDate = client.updatedAt || client.createdAt
        const duration = calculateDuration(referenceDate)
        return formatDurationDetailed(duration)
      }
      return null
    }

    const isActive = stageEntry.stageName === client.statutProjet && !stageEntry.endedAt

    if (isActive) {
      // Use live duration if available, otherwise calculate
      const duration = liveDurations[stageEntry.stageName] || calculateDuration(stageEntry.startedAt)
      return formatDurationDetailed(duration)
    }

    // For completed stages, use stored duration
    if (stageEntry.durationSeconds) {
      const formatted = formatDurationDetailed(stageEntry.durationSeconds)
      console.log('[getStageDuration] Completed stage', stageId, 'duration:', formatted)
      return formatted
    }

    // Fallback: calculate from dates
    if (stageEntry.endedAt) {
      const duration = calculateDuration(stageEntry.startedAt, stageEntry.endedAt)
      return formatDurationDetailed(duration)
    }

    return 'Récent'
  }

  // Get stage update info for tooltip
  const getStageUpdateInfo = (stageId: ProjectStatus): string | null => {
    const stageEntry = stageHistory.find(h => h.stageName === stageId)
    if (!stageEntry) return null

    const date = stageEntry.endedAt || stageEntry.startedAt
    return formatStageUpdateDate(date, stageEntry.changedBy)
  }

  // Get stage date range for display
  const getStageDateRange = (stageId: ProjectStatus): string | null => {
    const stageEntry = stageHistory.find(h => h.stageName === stageId)
    const status = getStageStatus(ROADMAP_STAGES.find(s => s.id === stageId)!)
    
    // If no history entry exists but it's the current stage
    if (!stageEntry && status === 'in_progress' && stageId === client.statutProjet) {
      const referenceDate = client.updatedAt || client.createdAt
      return formatDateRange(referenceDate, null)
    }
    
    if (!stageEntry) return null

    return formatDateRange(stageEntry.startedAt, stageEntry.endedAt)
  }

  // Get icon component for stage
  const getStageIcon = (stage: RoadmapStage, status: 'completed' | 'in_progress' | 'pending') => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4" />
    if (status === 'in_progress') return <Clock className="w-4 h-4" />
    return <Lock className="w-4 h-4" />
  }

  // Get upcoming appointments
  const upcomingAppointments = (client.rendezVous || [])
    .filter(rdv => new Date(rdv.dateStart) >= new Date())
    .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
    .slice(0, 3)

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Demain"
    if (diffDays < 7) return `Dans ${diffDays}j`
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Check if date is urgent (within 2 days)
  const isUrgent = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays <= 2 && diffDays >= 0
  }

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-white mb-0.5">Feuille de Route & Prochaines Actions</h2>
        <p className="text-xs text-white/50">Visualisation du parcours projet et actions à venir</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column - Project Roadmap */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-1.5 uppercase tracking-wide">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Feuille de Route
            </h3>
          </div>

          {/* Roadmap Timeline - Scrollable */}
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {ROADMAP_STAGES.map((stage, index) => {
              const status = getStageStatus(stage)
              const isLast = index === ROADMAP_STAGES.length - 1

              return (
                <div key={stage.id} className="relative">
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-lg transition-all",
                      status === 'completed' && "bg-green-500/10 border border-green-500/20",
                      status === 'in_progress' && "bg-blue-500/10 border border-blue-500/30 ring-1 ring-blue-500/20",
                      status === 'pending' && "bg-white/5 border border-white/10"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all text-base",
                        status === 'completed' && "bg-green-500/20",
                        status === 'in_progress' && "bg-blue-500/20 animate-pulse",
                        status === 'pending' && "bg-white/10 opacity-50"
                      )}
                    >
                      {stage.icon}
                    </div>

                    {/* Label and Duration */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            status === 'completed' && "text-green-400",
                            status === 'in_progress' && "text-blue-400 font-semibold",
                            status === 'pending' && "text-white/40"
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                      
                      {/* Duration and Date Range */}
                      {getStageDuration(stage.id) && (
                        <div className="mt-0.5">
                          <span 
                            className={cn(
                              "text-[11px] font-semibold",
                              status === 'completed' && "text-emerald-300",
                              status === 'in_progress' && "text-sky-300",
                              status === 'pending' && "text-white/50"
                            )}
                          >
                            {status === 'in_progress' ? '⏱️ ' : ''}{getStageDuration(stage.id)}
                          </span>
                          {getStageDateRange(stage.id) && (
                            <span className="text-[10px] text-white/60 ml-1.5">
                              • {getStageDateRange(stage.id)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    {status === 'in_progress' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                        En cours
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="text-sm text-green-400/60">✓</span>
                    )}
                  </div>

                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "w-0.5 h-1.5 ml-3.5 transition-all",
                        status === 'completed' ? "bg-green-500/30" : "bg-white/10"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column - Upcoming Actions */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-white/80 flex items-center gap-1.5 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Actions & RDV
            </h3>
            <div className="flex gap-1.5">
              {onAddTask && (
                <Button
                  onClick={onAddTask}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  Tâche
                </Button>
              )}
              {onAddRdv && (
                <Button
                  onClick={onAddRdv}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  RDV
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="space-y-1.5">
                {upcomingAppointments.map(rdv => (
                  <div
                    key={rdv.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all",
                      isUrgent(rdv.dateStart)
                        ? "bg-orange-500/10 border-orange-500/30"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          isUrgent(rdv.dateStart)
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-purple-500/20 text-purple-400"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white mb-0.5 truncate">
                          {rdv.title}
                        </h4>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-[10px]",
                            isUrgent(rdv.dateStart) ? "text-orange-300" : "text-purple-300"
                          )}
                        >
                          <span>{formatDate(rdv.dateStart)}</span>
                          <span>•</span>
                          <span>{formatTime(rdv.dateStart)}</span>
                        </div>
                        {rdv.location && (
                          <p className="text-[10px] text-white/40 mt-0.5 truncate">
                            📍 {rdv.location}
                          </p>
                        )}
                      </div>
                      {isUrgent(rdv.dateStart) && (
                        <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Tasks */}
            {!isLoadingTasks && clientTasks.length > 0 && (
              <div className="space-y-1.5">
                {clientTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all",
                      isUrgent(task.dueDate)
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          task.status === 'en_cours'
                            ? "bg-blue-500/20 text-blue-400"
                            : isUrgent(task.dueDate)
                            ? "bg-red-500/20 text-red-400"
                            : "bg-white/10 text-white/60"
                        )}
                      >
                        {task.status === 'en_cours' ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white mb-0.5 truncate">
                          {task.title}
                        </h4>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-[10px]",
                            task.status === 'en_cours' ? "text-sky-300" : isUrgent(task.dueDate) ? "text-red-300" : "text-white/70"
                          )}
                        >
                          <span>Échéance: {formatDate(task.dueDate)}</span>
                          {task.assignedTo && (
                            <>
                              <span>•</span>
                              <span className="truncate">{task.assignedTo}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isUrgent(task.dueDate) && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {upcomingAppointments.length === 0 && clientTasks.length === 0 && !isLoadingTasks && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-xs text-white/50 mb-2">
                  Aucune action ou RDV planifié
                </p>
                <div className="flex gap-1.5 justify-center">
                  {onAddTask && (
                    <Button
                      onClick={onAddTask}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Créer une tâche
                    </Button>
                  )}
                  {onAddRdv && (
                    <Button
                      onClick={onAddRdv}
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Planifier RDV
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoadingTasks && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-center">
                <p className="text-xs text-white/50">Chargement...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
