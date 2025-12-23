"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ClipboardList,
  DollarSign,
  Puzzle,
  FileText,
  CheckCircle,
  XCircle,
  Banknote,
  Hammer,
  Receipt,
  Truck,
  Circle,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StageChangeConfirmationDialog } from "@/components/stage-change-confirmation-dialog";

interface ProjectStatusStepperEnhancedProps {
  currentStatus: ProjectStatus;
  onStatusChange?: (status: ProjectStatus) => void;
  interactive?: boolean;
  lastUpdated?: string;
  className?: string;
}

// Define the 11 project status steps with icons and colors
const PROJECT_STEPS: {
  key: ProjectStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  glowColor: string;
  order: number;
}[] = [
  {
    key: "qualifie",
    label: "Qualifié",
    icon: User,
    color: "text-blue-400",
    gradient: "from-blue-400 to-blue-500",
    glowColor: "shadow-blue-500/50",
    order: 0,
  },
  {
    key: "prise_de_besoin",
    label: "Prise de besoin",
    icon: ClipboardList,
    color: "text-sky-400",
    gradient: "from-sky-400 to-sky-500",
    glowColor: "shadow-sky-500/50",
    order: 1,
  },
  {
    key: "acompte_recu",
    label: "Acompte reçu",
    icon: DollarSign,
    color: "text-green-400",
    gradient: "from-green-400 to-green-500",
    glowColor: "shadow-green-500/50",
    order: 2,
  },
  {
    key: "conception",
    label: "Conception",
    icon: Puzzle,
    color: "text-purple-400",
    gradient: "from-purple-400 to-purple-500",
    glowColor: "shadow-purple-500/50",
    order: 3,
  },
  {
    key: "devis_negociation",
    label: "Devis/Négociation",
    icon: FileText,
    color: "text-yellow-400",
    gradient: "from-yellow-400 to-yellow-500",
    glowColor: "shadow-yellow-500/50",
    order: 4,
  },
  {
    key: "accepte",
    label: "Accepté",
    icon: CheckCircle,
    color: "text-emerald-400",
    gradient: "from-emerald-400 to-emerald-500",
    glowColor: "shadow-emerald-500/50",
    order: 5,
  },
  {
    key: "refuse",
    label: "Refusé",
    icon: XCircle,
    color: "text-red-400",
    gradient: "from-red-400 to-red-500",
    glowColor: "shadow-red-500/50",
    order: 6,
  },
  {
    key: "premier_depot",
    label: "1er Dépôt",
    icon: Banknote,
    color: "text-cyan-400",
    gradient: "from-cyan-400 to-cyan-500",
    glowColor: "shadow-cyan-500/50",
    order: 7,
  },
  {
    key: "projet_en_cours",
    label: "Projet en cours",
    icon: Hammer,
    color: "text-indigo-400",
    gradient: "from-indigo-400 to-indigo-500",
    glowColor: "shadow-indigo-500/50",
    order: 8,
  },
  {
    key: "facture_reglee",
    label: "Facture réglée",
    icon: Receipt,
    color: "text-green-500",
    gradient: "from-green-500 to-green-600",
    glowColor: "shadow-green-600/50",
    order: 9,
  },
  {
    key: "livraison_termine",
    label: "Livraison & Terminé",
    icon: Truck,
    color: "text-amber-400",
    gradient: "from-amber-400 to-amber-500",
    glowColor: "shadow-amber-500/50",
    order: 10,
  },
];

export function ProjectStatusStepperEnhanced({
  currentStatus,
  onStatusChange,
  interactive = false,
  lastUpdated,
  className,
}: ProjectStatusStepperEnhancedProps) {
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(
    null,
  );
  const [dialogCurrentStatus, setDialogCurrentStatus] =
    useState<ProjectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastKnownStatus, setLastKnownStatus] = useState<ProjectStatus>(currentStatus);

  // Force re-render when currentStatus changes
  useEffect(() => {
    if (lastKnownStatus !== currentStatus) {
      console.log("[ProjectStatusStepper] 🔄 Status changed:", {
        previous: lastKnownStatus,
        current: currentStatus,
        willUpdate: true
      });
      setLastKnownStatus(currentStatus);
    }
  }, [currentStatus, lastKnownStatus]);

  console.log(
    "[ProjectStatusStepper] 🎨 Rendering with status:",
    currentStatus,
  );
  console.log("[ProjectStatusStepper] 📊 Component props:", {
    currentStatus,
    hasOnStatusChange: !!onStatusChange,
    onStatusChangeType: typeof onStatusChange,
    lastUpdated,
  });
  console.log("[ProjectStatusStepper] 🔄 Component state:", {
    pendingStatus,
    dialogCurrentStatus,
    isLoading,
    showConfirmation,
  });

  // Use pendingStatus for immediate visual feedback during update
  // This ensures the UI shows the new status immediately, even before the API call completes
  const displayStatus = (isLoading && pendingStatus) ? pendingStatus : currentStatus;
  
  // CRITICAL: Always use currentStatus from props (most up-to-date)
  // Only use displayStatus (with pendingStatus) for visual feedback during manual changes
  // For automatic stage progression (like acompte), always use currentStatus
  const effectiveStatus = currentStatus; // Always use prop value for automatic updates
  const currentStep = PROJECT_STEPS.find((step) => step.key === effectiveStatus);
  const currentOrder = currentStep?.order || 0;
  
  console.log("[ProjectStatusStepper] 🎯 Status for rendering:", {
    effectiveStatus,
    currentStatus,
    displayStatus,
    pendingStatus,
    isLoading,
    currentStep: currentStep?.label,
    currentOrder,
    willUseEffectiveStatus: true
  });

  console.log("[ProjectStatusStepper] 🎯 Current step details:", {
    currentStep: currentStep?.label,
    currentOrder,
    allSteps: PROJECT_STEPS.length,
  });
  console.log(
    "[ProjectStatusStepper] Current step:",
    currentStep?.label,
    "Order:",
    currentOrder,
  );

  const handleStepClick = (status: ProjectStatus) => {
    console.log("[ProjectStatusStepper] handleStepClick called:", {
      status,
      interactive,
      hasOnStatusChange: !!onStatusChange,
      currentStatus,
      isSameStatus: status === currentStatus,
    });

    if (interactive && onStatusChange && status !== currentStatus) {
      console.log(
        "[ProjectStatusStepper] Opening confirmation dialog for:",
        status,
      );
      setPendingStatus(status);
      setDialogCurrentStatus(currentStatus);
      setShowConfirmation(true);
    } else {
      console.log("[ProjectStatusStepper] Click ignored:", {
        interactive,
        hasOnStatusChange: !!onStatusChange,
        isSameStatus: status === currentStatus,
      });
    }
  };

  const handleConfirmChange = async () => {
    if (!pendingStatus || !onStatusChange) {
      console.log(
        "[ProjectStatusStepper] Cannot confirm - missing pendingStatus or onStatusChange",
      );
      console.log("[ProjectStatusStepper] Debug values:", {
        pendingStatus,
        onStatusChange: typeof onStatusChange,
        currentStatus,
      });
      return;
    }

    // Prevent multiple simultaneous updates
    if (isLoading) {
      console.log("[ProjectStatusStepper] Update already in progress, ignoring duplicate click");
      return;
    }

    console.log(
      "[ProjectStatusStepper] Confirming stage change to:",
      pendingStatus,
    );
    console.log("[ProjectStatusStepper] Full context:", {
      from: currentStatus,
      to: pendingStatus,
      user: typeof onStatusChange,
      timestamp: new Date().toISOString(),
    });

    setIsLoading(true);

    try {
      console.log(
        "[ProjectStatusStepper] 🚀 Calling onStatusChange with:",
        pendingStatus,
      );

      // Call the onStatusChange handler (which updates the database)
      // The handler will update the UI optimistically before this completes
      await onStatusChange(pendingStatus);

      console.log("[ProjectStatusStepper] ✅ Stage change successful!");

      // Close dialog immediately after successful update
      console.log("[ProjectStatusStepper] 🚪 Closing dialog after success");
      setShowConfirmation(false);
      setPendingStatus(null);
      setDialogCurrentStatus(null);
      setIsLoading(false);
      
      // Force component to recognize the new status immediately
      // The parent component's key change will force a re-render
    } catch (error) {
      console.error("[ProjectStatusStepper] ❌ Error updating status:", error);
      console.error("[ProjectStatusStepper] 📋 Error details:", {
        message: error instanceof Error ? error.message : String(error),
        pendingStatus,
        currentStatus,
      });
      setIsLoading(false);
      // Keep dialog open on error so user can see what happened and retry
      // The error toast will be shown by the parent component
    }
  };

  const handleCancelChange = () => {
    if (!isLoading) {
      setShowConfirmation(false);
      setPendingStatus(null);
      setDialogCurrentStatus(null);
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const progressPercentage = ((currentOrder + 1) / PROJECT_STEPS.length) * 100;

  // Show loading overlay during update
  const showLoadingOverlay = isLoading;

  console.log(
    "[ProjectStatusStepper] Render - pendingStatus:",
    pendingStatus,
    "showConfirmation:",
    showConfirmation,
  );

  return (
    <TooltipProvider>
      <div className={cn("w-full max-w-full overflow-hidden relative", className)}>
        {/* Loading Overlay */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/70 font-light">Mise à jour...</span>
            </div>
          </div>
        )}
        {/* Confirmation Dialog */}
        {pendingStatus && (
          <StageChangeConfirmationDialog
            isOpen={showConfirmation}
            currentStage={dialogCurrentStatus || currentStatus}
            newStage={pendingStatus}
            isLoading={isLoading}
            onConfirm={handleConfirmChange}
            onCancel={handleCancelChange}
          />
        )}
        {/* Progress Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-3 mb-5 md:mb-6 w-full">
          <div className="flex items-center gap-3 md:gap-3 shrink-0">
            <div className="text-sm md:text-sm font-medium text-white/70">
              Progression du projet
            </div>
            <div
              className={cn(
                "px-3 md:px-3 py-1 md:py-1 rounded-full text-xs md:text-xs font-bold bg-gradient-to-r text-white shrink-0",
                currentStep?.gradient,
              )}
            >
              {Math.round(progressPercentage)}%
            </div>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-2 md:gap-2 text-xs md:text-xs text-white/40 shrink-0">
              <Clock className="w-4 h-4 md:w-3.5 md:h-3.5 shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-none">
                Dernière MAJ: {formatLastUpdated(lastUpdated)}
              </span>
            </div>
          )}
        </div>

        {/* Horizontal Scrollable Stepper */}
        <div className="relative w-full max-w-full">
          <div className="overflow-x-auto pb-4 md:pb-4 hide-scrollbar w-full max-w-full touch-pan-x">
            <div className="flex items-center gap-3 md:gap-3 min-w-max px-1 md:px-1">
              {PROJECT_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = step.order < currentOrder;
                const isCurrent = step.order === currentOrder;
                const isUpcoming = step.order > currentOrder;
                // Highlight the pending status during update
                const isPending = isLoading && pendingStatus === step.key;
                // Allow clicking on ANY stage (not just completed/current)
                const isClickable = interactive;

                return (
                  <div key={step.key} className="flex items-center">
                    {/* Step */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => {
                            console.log(
                              "[ProjectStatusStepper] Button clicked:",
                              step.key,
                              "isClickable:",
                              isClickable,
                            );
                            if (isClickable) {
                              handleStepClick(step.key);
                            }
                          }}
                          disabled={!isClickable}
                          whileHover={isClickable ? { scale: 1.05, y: -2 } : {}}
                          whileTap={isClickable ? { scale: 0.95 } : {}}
                          className={cn(
                            "relative flex flex-col items-center gap-2 group transition-all",
                            isClickable && "cursor-pointer",
                            !isClickable && "cursor-default",
                          )}
                        >
                          {/* Icon Circle */}
                          <div
                            className={cn(
                              "relative w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 border md:border-2",
                              isCompleted &&
                                cn(
                                  "bg-gradient-to-br from-emerald-500/30 to-green-500/30 border-emerald-400/40 shadow-md md:shadow-lg shadow-emerald-500/20",
                                  "group-hover:shadow-emerald-500/40 group-hover:border-emerald-400/60",
                                ),
                              isCurrent &&
                                cn(
                                  "bg-gradient-to-br shadow-md md:shadow-lg border-transparent",
                                  step.gradient,
                                  step.glowColor,
                                ),
                              isUpcoming && "bg-[#0D0D12] border-white/10",
                              isClickable && "hover:scale-105",
                            )}
                          >
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 15,
                                }}
                                className="relative"
                              >
                                <Check
                                  className="w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                  strokeWidth={3}
                                />
                              </motion.div>
                            ) : (
                              <>
                                <Icon
                                  className={cn(
                                    "w-4 h-4 md:w-6 md:h-6 lg:w-7 lg:h-7 transition-colors",
                                    isCurrent || isPending ? "text-white" : "text-white/40",
                                  )}
                                />
                                {isPending && (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 flex items-center justify-center"
                                  >
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                  </motion.div>
                                )}
                              </>
                            )}

                            {/* Active pulse animation */}
                            {isCurrent && (
                              <motion.div
                                animate={{
                                  scale: [1, 1.4, 1],
                                  opacity: [0.5, 0, 0.5],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className={cn(
                                  "absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br",
                                  step.gradient,
                                )}
                              />
                            )}

                            {/* Completed glow effect */}
                            {isCompleted && (
                              <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400/10 to-green-400/10 animate-pulse" />
                            )}
                          </div>

                          {/* Label */}
                          <span
                            className={cn(
                              "text-[10px] md:text-xs font-medium text-center max-w-[70px] md:max-w-[90px] leading-tight transition-colors mt-1",
                              isCurrent && "text-white font-semibold",
                              isCompleted && "text-emerald-300/80 font-medium",
                              isUpcoming && "text-white/30",
                            )}
                          >
                            {step.label}
                          </span>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-[#171B22] border-white/10"
                      >
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
                            : "bg-white/10",
                        )}
                      />
                    )}
                  </div>
                );
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
              currentStep?.gradient || "from-blue-400 to-blue-500",
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
