"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2, Loader2, X, ArrowRight,
    User, ClipboardList, DollarSign, Puzzle, FileText,
    CheckCircle, XCircle, Banknote, Hammer, Receipt, Truck, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProjectStatus } from "@/types/client"

interface StageChangeConfirmationDialogProps {
    isOpen: boolean
    currentStage: ProjectStatus
    newStage: ProjectStatus
    isLoading: boolean
    onConfirm: () => void
    onCancel: () => void
}

// Stage configuration with icons and descriptions
const STAGE_CONFIG: Record<ProjectStatus, {
    icon: React.ComponentType<{ className?: string }>
    color: string
    gradient: string
    title: string
    confirmMessage: string
}> = {
    qualifie: {
        icon: User,
        color: "text-blue-400",
        gradient: "from-blue-500 to-blue-600",
        title: "Qualifié",
        confirmMessage: "Marquer ce client comme qualifié ?"
    },
    prise_de_besoin: {
        icon: ClipboardList,
        color: "text-sky-400",
        gradient: "from-sky-500 to-sky-600",
        title: "Prise de besoin",
        confirmMessage: "Démarrer la prise de besoin ?"
    },
    acompte_recu: {
        icon: DollarSign,
        color: "text-green-400",
        gradient: "from-green-500 to-green-600",
        title: "Acompte reçu",
        confirmMessage: "Confirmer la réception de l'acompte ?"
    },
    conception: {
        icon: Puzzle,
        color: "text-purple-400",
        gradient: "from-purple-500 to-purple-600",
        title: "Conception",
        confirmMessage: "Démarrer la phase de conception ?"
    },
    devis_negociation: {
        icon: FileText,
        color: "text-yellow-400",
        gradient: "from-yellow-500 to-yellow-600",
        title: "Devis/Négociation",
        confirmMessage: "Passer en phase de devis/négociation ?"
    },
    accepte: {
        icon: CheckCircle,
        color: "text-emerald-400",
        gradient: "from-emerald-500 to-emerald-600",
        title: "Accepté",
        confirmMessage: "Confirmer l'acceptation du devis ?"
    },
    refuse: {
        icon: XCircle,
        color: "text-red-400",
        gradient: "from-red-500 to-red-600",
        title: "Refusé",
        confirmMessage: "Marquer le devis comme refusé ?"
    },
    premier_depot: {
        icon: Banknote,
        color: "text-cyan-400",
        gradient: "from-cyan-500 to-cyan-600",
        title: "1er Dépôt",
        confirmMessage: "Confirmer la réception du 1er dépôt ?"
    },
    projet_en_cours: {
        icon: Hammer,
        color: "text-indigo-400",
        gradient: "from-indigo-500 to-indigo-600",
        title: "Projet en cours",
        confirmMessage: "Démarrer l'exécution du projet ?"
    },
    chantier: {
        icon: Hammer,
        color: "text-orange-400",
        gradient: "from-orange-500 to-orange-600",
        title: "Chantier",
        confirmMessage: "Démarrer le chantier ?"
    },
    facture_reglee: {
        icon: Receipt,
        color: "text-green-500",
        gradient: "from-green-600 to-green-700",
        title: "Facture réglée",
        confirmMessage: "Confirmer le règlement de la facture ?"
    },
    livraison_termine: {
        icon: Truck,
        color: "text-amber-400",
        gradient: "from-amber-500 to-amber-600",
        title: "Livraison & Terminé",
        confirmMessage: "Marquer le projet comme terminé ?"
    },
    // Legacy statuses
    nouveau: {
        icon: User,
        color: "text-slate-400",
        gradient: "from-slate-500 to-slate-600",
        title: "Nouveau",
        confirmMessage: "Marquer comme nouveau client ?"
    },
    acompte_verse: {
        icon: DollarSign,
        color: "text-green-400",
        gradient: "from-green-500 to-green-600",
        title: "Acompte versé",
        confirmMessage: "Confirmer le versement de l'acompte ?"
    },
    en_conception: {
        icon: Puzzle,
        color: "text-purple-400",
        gradient: "from-purple-500 to-purple-600",
        title: "En conception",
        confirmMessage: "Passer en conception ?"
    },
    en_validation: {
        icon: CheckCircle,
        color: "text-blue-400",
        gradient: "from-blue-500 to-blue-600",
        title: "En validation",
        confirmMessage: "Passer en validation ?"
    },
    en_chantier: {
        icon: Hammer,
        color: "text-orange-400",
        gradient: "from-orange-500 to-orange-600",
        title: "En chantier",
        confirmMessage: "Démarrer le chantier ?"
    },
    livraison: {
        icon: Truck,
        color: "text-amber-400",
        gradient: "from-amber-500 to-amber-600",
        title: "Livraison",
        confirmMessage: "Passer en livraison ?"
    },
    termine: {
        icon: CheckCircle,
        color: "text-green-400",
        gradient: "from-green-500 to-green-600",
        title: "Terminé",
        confirmMessage: "Marquer comme terminé ?"
    },
    annule: {
        icon: XCircle,
        color: "text-red-400",
        gradient: "from-red-500 to-red-600",
        title: "Annulé",
        confirmMessage: "Annuler ce projet ?"
    },
    suspendu: {
        icon: Clock,
        color: "text-yellow-400",
        gradient: "from-yellow-500 to-yellow-600",
        title: "Suspendu",
        confirmMessage: "Suspendre ce projet ?"
    },
    perdu: {
        icon: XCircle,
        color: "text-gray-400",
        gradient: "from-gray-500 to-gray-600",
        title: "Perdu",
        confirmMessage: "Marquer comme perdu ?"
    }
}

export function StageChangeConfirmationDialog({
    isOpen,
    currentStage,
    newStage,
    isLoading,
    onConfirm,
    onCancel
}: StageChangeConfirmationDialogProps) {
    console.log('[StageChangeConfirmationDialog] Rendering:', { isOpen, currentStage, newStage, isLoading })

    const currentConfig = STAGE_CONFIG[currentStage]
    const newConfig = STAGE_CONFIG[newStage]
    const CurrentIcon = currentConfig.icon
    const NewIcon = newConfig.icon

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
                        onClick={!isLoading ? onCancel : undefined}
                    />

                    {/* Dialog Container - Centered with proper spacing */}
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
                            className="relative bg-[#0D0D12] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
                        >
                            {/* Close button */}
                            {!isLoading && (
                                <button
                                    onClick={onCancel}
                                    className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors z-10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {/* Compact Header with gradient */}
                            <div className={cn(
                                "relative px-5 pt-5 pb-4 bg-gradient-to-br",
                                newConfig.gradient
                            )}>
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="relative z-10">
                                    <h2 className="text-lg font-bold text-white text-center">
                                        Changement de statut
                                    </h2>
                                    <p className="text-white/90 text-sm text-center mt-1.5">
                                        {newConfig.confirmMessage}
                                    </p>
                                </div>
                            </div>

                            {/* Compact Content */}
                            <div className="px-5 py-4">
                                {/* Stage transition visualization - Compact */}
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    {/* Current stage */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-1.5">
                                            <CurrentIcon className={cn("w-6 h-6", currentConfig.color)} />
                                        </div>
                                        <span className="text-[10px] text-white/40 text-center">Actuel</span>
                                        <span className="text-xs font-medium text-white/70 text-center mt-0.5 max-w-[70px] truncate">
                                            {currentConfig.title}
                                        </span>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex-shrink-0 mb-6">
                                        <motion.div
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <ArrowRight className="w-5 h-5 text-white/30" />
                                        </motion.div>
                                    </div>

                                    {/* New stage */}
                                    <div className="flex flex-col items-center">
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className={cn(
                                                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-1.5 shadow-lg",
                                                newConfig.gradient
                                            )}
                                        >
                                            <NewIcon className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <span className="text-[10px] text-white/40 text-center">Nouveau</span>
                                        <span className="text-xs font-medium text-white text-center mt-0.5 max-w-[70px] truncate">
                                            {newConfig.title}
                                        </span>
                                    </div>
                                </div>

                                {/* Action buttons - Compact */}
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={onCancel}
                                        disabled={isLoading}
                                        className={cn(
                                            "flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
                                            "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white",
                                            "border border-white/10 hover:border-white/20",
                                            isLoading && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={isLoading}
                                        className={cn(
                                            "flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
                                            "bg-gradient-to-r text-white shadow-lg",
                                            newConfig.gradient,
                                            !isLoading && "hover:shadow-xl hover:scale-[1.02]",
                                            isLoading && "opacity-80 cursor-wait"
                                        )}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs">Mise à jour...</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Confirmer
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Loading overlay - Only when loading */}
                            <AnimatePresence>
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                                    >
                                        <div className="bg-[#0D0D12] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2.5">
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            <span className="text-white text-sm font-medium">Mise à jour...</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
