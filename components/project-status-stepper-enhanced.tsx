"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  User, ClipboardList, DollarSign, Puzzle, FileText, CheckCircle, XCircle,
  Banknote, Hammer, Receipt, Truck, Circle, Check,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProjectStatusStepperEnhancedProps {
  currentStatus: ProjectStatus
  onStatusChange?: (status: ProjectStatus) => void
  interactive?: boolean
  lastUpdated?: string
  className?: string
}

// Define the 11 project status steps with icons and colors
const PROJECT_STEPS: {
  key: ProjectStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  gradient: string
  glowColor: string
  order: number
}[] = [
    {
      key: "qualifie",
      label: "Qualifié",
      icon: User,
      color: "text-blue-400",
      gradient: "from-blue-400 to-blue-500",
      glowColor: "shadow-blue-500/50",
      order: 0
    },
    {
      key: "prise_de_besoin",
      label: "Prise de besoin",
      icon: ClipboardList,
      color: "text-sky-400",
      gradient: "from-sky-400 to-sky-500",
      glowColor: "shadow-sky-500/50",
      order: 1
    },
    {
      key: "acompte_recu",
      label: "Acompte reçu",
      icon: DollarSign,
      color: "text-green-400",
      gradient: "from-green-400 to-green-500",
      glowColor: "shadow-green-500/50",
      order: 2
    },
    {
      key: "conception",
      label: "Conception",
      icon: Puzzle,
      color: "text-purple-400",
      gradient: "from-purple-400 to-purple-500",
      glowColor: "shadow-purple-500/50",
      order: 3
    },
    {
      key: "devis_negociation",
      label: "Devis/Négociation",
      icon: FileText,
      color: "text-yellow-400",
      gradient: "from-yellow-400 to-yellow-500",
      glowColor: "shadow-yellow-500/50",
      order: 4
    },
    {
      key: "accepte",
      label: "Accepté",
      icon: CheckCircle,
      color: "text-emerald-400",
      gradient: "from-emerald-400 to-emerald-500",
      glowColor: "shadow-emerald-500/50",
      order: 5
    },
    {
      key: "refuse",
      label: "Refusé",
      icon: XCircle,
      color: "text-red-400",
      gradient: "from-red-400 to-red-500",
      glowColor: "shadow-red-500/50",
      order: 6
    },
    {
      key: "premier_depot",
      label: "1er Dépôt",
      icon: Banknote,
      color: "text-cyan-400",
      gradient: "from-cyan-400 to-cyan-500",
      glowColor: "shadow-cyan-500/50",
      order: 7
    },
    {
      key: "projet_en_cours",
      label: "Projet en cours",
      icon: Hammer,
      color: "text-indigo-400",
      gradient: "from-indigo-400 to-indigo-500",
      glowColor: "shadow-indigo-500/50",
      order: 8
    },
    {
      key: "facture_reglee",
      label: "Facture réglée",
      icon: Receipt,
      color: "text-green-500",
      gradient: "from-green-500 to-green-600",
      glowColor: "shadow-green-600/50",
      order: 9
    },
    {
      key: "livraison_termine",
      label: "Livraison & Terminé",
      icon: Truck,
      color: "text-amber-400",
      gradient: "from-amber-400 to-amber-500",
      glowColor: "shadow-amber-500/50",
      order: 10
    },
  ]

export function ProjectStatusStepperEnhanced({
  currentStatus,
  onStatusChange,
  interactive = false,
  lastUpdated,
  className
}: ProjectStatusStepperEnhancedProps) {
  console.log('[ProjectStatusStepper] Rendering with status:', currentStatus)
  const currentStep = PROJECT_STEPS.find(s => s.key === currentStatus)
  const currentOrder = currentStep?.order ?? 0
  console.log('[ProjectStatusStepper] Current step:', currentStep?.label, 'Order:', currentOrder)

  const handleStepClick = (status: ProjectStatus) => {
    if (interactive && onStatusChange && status !== currentStatus) {
      onStatusChange(status)
    }
  }

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const progressPercentage = ((currentOrder + 1) / PROJECT_STEPS.length) * 100

  return (
    <TooltipProvider>
      <div className={cn("w-full max-w-full overflow-hidden", className)}>
        {/* Progress Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-3 mb-5 md:mb-6 w-full">
          <div className="flex items-center gap-3 md:gap-3 shrink-0">
            <div className="text-sm md:text-sm font-medium text-white/70">
              Progression du projet
            </div>
            <div className={cn(
              "px-3 md:px-3 py-1 md:py-1 rounded-full text-xs md:text-xs font-bold bg-gradient-to-r text-white shrink-0",
              currentStep?.gradient
            )}>
              {Math.round(progressPercentage)}%
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-2 md:gap-2 text-xs md:text-xs text-white/40 shrink-0">
              <Clock className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-none">Dernière MAJ: {formatLastUpdated(lastUpdated)}</span>
            </div>
          )}
        </div>

        {/* Horizontal Scrollable Stepper */}
        <div className="relative w-full max-w-full">
          <div className="overflow-x-auto pb-4 md:pb-4 hide-scrollbar w-full max-w-full touch-pan-x">
            <div className="flex items-center gap-3 md:gap-3 min-w-max px-1 md:px-1">
              {PROJECT_STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = step.order < currentOrder
                const isCurrent = step.order === currentOrder
                const isUpcoming = step.order > currentOrder
                const isClickable = interactive && !isUpcoming

                return (
                  <div key={step.key} className="flex items-center">
                    {/* Step */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => isClickable && handleStepClick(step.key)}
                          disabled={!isClickable}
                          whileHover={isClickable ? { scale: 1.05, y: -2 } : {}}
                          whileTap={isClickable ? { scale: 0.95 } : {}}
                          className={cn(
                            "relative flex flex-col items-center gap-2 group transition-all",
                            isClickable && "cursor-pointer",
                            !isClickable && "cursor-default"
                          )}
                        >
                          {/* Icon Circle */}
                          <div className={cn(
                            "relative w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 border md:border-2",
                            isCompleted && cn(
                              "bg-gradient-to-br from-emerald-500/30 to-green-500/30 border-emerald-400/40 shadow-md md:shadow-lg shadow-emerald-500/20",
                              "group-hover:shadow-emerald-500/40 group-hover:border-emerald-400/60"
                            ),
                            isCurrent && cn(
                              "bg-gradient-to-br shadow-md md:shadow-lg border-transparent",
                              step.gradient,
                              step.glowColor
                            ),
                            isUpcoming && "bg-[#0D0D12] border-white/10",
                            isClickable && "hover:scale-105"
                          )}>
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="relative"
                              >
                                <Check className="w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" strokeWidth={3} />
                              </motion.div>
                            ) : (
                              <Icon className={cn(
                                "w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 transition-colors",
                                isCurrent ? "text-white" : "text-white/40"
                              )} />
                            )}

                            {/* Active pulse animation */}
                            {isCurrent && (
                              <motion.div
                                animate={{
                                  scale: [1, 1.4, 1],
                                  opacity: [0.5, 0, 0.5]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                className={cn(
                                  "absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br",
                                  step.gradient
                                )}
                              />
                            )}

                            {/* Completed glow effect */}
                            {isCompleted && (
                              <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400/10 to-green-400/10 animate-pulse" />
                            )}
                          </div>

                          {/* Label */}
                          <span className={cn(
                            "text-[10px] md:text-xs font-medium text-center max-w-[70px] md:max-w-[90px] leading-tight transition-colors mt-1",
                            isCurrent && "text-white font-semibold",
                            isCompleted && "text-emerald-300/80 font-medium",
                            isUpcoming && "text-white/30"
                          )}>
                            {step.label}
                          </span>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-[#171B22] border-white/10">
                        <p className="text-xs">
                          {isCurrent && "Étape actuelle"}
                          {isCompleted && "Étape complétée"}
                          {isUpcoming && "Étape à venir"}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Connector Line */}
                    {index < PROJECT_STEPS.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={cn(
                          "h-0.5 md:h-1 w-5 md:w-8 mx-0.5 md:mx-1 rounded-full transition-all duration-500 origin-left",
                          isCompleted
                            ? "bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                            : "bg-white/10"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 md:mt-4 w-full h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "h-full bg-gradient-to-r rounded-full",
              currentStep?.gradient || "from-blue-400 to-blue-500"
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
