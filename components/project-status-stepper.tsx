"use client"

import { motion } from "framer-motion"
import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/client"

interface ProjectStatusStepperProps {
  currentStatus: ProjectStatus
  onStatusChange?: (status: ProjectStatus) => void
  interactive?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

// Define the project status steps with new stages
const PROJECT_STEPS: { 
  key: ProjectStatus
  label: string
  shortLabel?: string
  color: string
  darkColor: string
  bgColor: string
  order: number
}[] = [
  { key: "nouveau", label: "Nouveau", color: "text-slate-400", darkColor: "text-slate-300", bgColor: "bg-slate-400", order: 0 },
  { key: "acompte_verse", label: "Acompte versé", shortLabel: "Acompte", color: "text-orange-600", darkColor: "text-orange-400", bgColor: "bg-orange-500", order: 1 },
  { key: "en_conception", label: "En conception", shortLabel: "Conception", color: "text-blue-600", darkColor: "text-blue-400", bgColor: "bg-blue-500", order: 2 },
  { key: "en_chantier", label: "En chantier", shortLabel: "Chantier", color: "text-purple-600", darkColor: "text-purple-400", bgColor: "bg-purple-500", order: 3 },
  { key: "livraison", label: "Livraison", color: "text-teal-600", darkColor: "text-teal-400", bgColor: "bg-teal-500", order: 4 },
  { key: "termine", label: "Terminé", color: "text-green-600", darkColor: "text-green-400", bgColor: "bg-green-500", order: 5 },
]

export function ProjectStatusStepper({
  currentStatus,
  onStatusChange,
  interactive = false,
  size = "md",
  className
}: ProjectStatusStepperProps) {
  const currentStep = PROJECT_STEPS.find(s => s.key === currentStatus)
  const currentOrder = currentStep?.order ?? 0

  const handleStepClick = (status: ProjectStatus) => {
    if (interactive && onStatusChange) {
      onStatusChange(status)
    }
  }

  const sizeClasses = {
    sm: {
      circle: "w-7 h-7",
      icon: "w-3.5 h-3.5",
      text: "text-[10px]",
      label: "text-xs",
      connector: "h-0.5"
    },
    md: {
      circle: "w-9 h-9",
      icon: "w-4 h-4",
      text: "text-xs",
      label: "text-sm",
      connector: "h-1"
    },
    lg: {
      circle: "w-11 h-11",
      icon: "w-5 h-5",
      text: "text-sm",
      label: "text-base",
      connector: "h-1"
    }
  }

  const sizes = sizeClasses[size]

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: Horizontal Stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {PROJECT_STEPS.map((step, index) => {
            const isCompleted = step.order < currentOrder
            const isCurrent = step.order === currentOrder
            const isUpcoming = step.order > currentOrder
            const isClickable = interactive && (isCompleted || isCurrent)

            return (
              <div key={step.key} className="flex-1 flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center flex-1">
                  <motion.button
                    onClick={() => isClickable && handleStepClick(step.key)}
                    disabled={!isClickable}
                    whileHover={isClickable ? { scale: 1.05 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    className={cn(
                      sizes.circle,
                      "rounded-full flex items-center justify-center transition-all duration-300 relative",
                      isCompleted && `${step.bgColor} shadow-md`,
                      isCurrent && `${step.bgColor} shadow-lg ring-4 ring-offset-2 ring-offset-slate-900`,
                      isUpcoming && "bg-slate-700 border-2 border-slate-600",
                      isClickable && "cursor-pointer hover:shadow-lg",
                      !isClickable && "cursor-default"
                    )}
                  >
                    {isCompleted ? (
                      <Check className={cn(sizes.icon, "text-white")} />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Circle className={cn(sizes.icon, "text-white fill-white")} />
                      </motion.div>
                    ) : (
                      <Circle className={cn(sizes.icon, "text-slate-500")} />
                    )}
                  </motion.button>
                  
                  {/* Label */}
                  <span className={cn(
                    sizes.label,
                    "mt-2 font-medium text-center transition-colors",
                    isCompleted && step.darkColor,
                    isCurrent && `${step.darkColor} font-semibold`,
                    isUpcoming && "text-slate-500"
                  )}>
                    {size === "sm" && step.shortLabel ? step.shortLabel : step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < PROJECT_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 mx-2",
                    sizes.connector,
                    "rounded-full transition-all duration-500",
                    isCompleted ? step.bgColor : "bg-slate-700"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {PROJECT_STEPS.map((step, index) => {
            const isCompleted = step.order < currentOrder
            const isCurrent = step.order === currentOrder
            const isUpcoming = step.order > currentOrder
            const isClickable = interactive && (isCompleted || isCurrent)

            return (
              <div key={step.key} className="flex items-start gap-3">
                {/* Step Circle with Connector */}
                <div className="flex flex-col items-center">
                  <motion.button
                    onClick={() => isClickable && handleStepClick(step.key)}
                    disabled={!isClickable}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                      isCompleted && `${step.bgColor}`,
                      isCurrent && `${step.bgColor} ring-3 ring-offset-1 ring-offset-slate-900`,
                      isUpcoming && "bg-slate-700 border-2 border-slate-600",
                      isClickable && "cursor-pointer active:scale-95",
                      !isClickable && "cursor-default"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <Circle className="w-4 h-4 text-white fill-white" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </motion.button>
                  
                  {/* Vertical Connector */}
                  {index < PROJECT_STEPS.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-8 my-1 rounded-full transition-all duration-500",
                      isCompleted ? step.bgColor : "bg-slate-700"
                    )} />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 pt-1">
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted && step.darkColor,
                    isCurrent && `${step.darkColor} font-semibold`,
                    isUpcoming && "text-slate-500"
                  )}>
                    {step.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
