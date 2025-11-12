"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ArrowLeft, 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Sparkles,
  TrendingUp
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArchitectsService } from "@/lib/architects-service"
import { cn } from "@/lib/utils"
import type { Architect } from "@/types/architect"

interface ArchitectSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBack: () => void
  onArchitectSelected: (architectId: string) => void
  leadName: string
}

const specialtyLabels: Record<string, string> = {
  residentiel: "Résidentiel",
  commercial: "Commercial",
  industriel: "Industriel",
  renovation: "Rénovation",
  luxe: "Luxe",
  mixte: "Mixte",
}

const statusConfig = {
  actif: { label: "Actif", color: "bg-green-500/20 text-green-400 border-green-500/40" },
  inactif: { label: "Inactif", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
  conge: { label: "En congé", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
}

export function ArchitectSelectionDialog({
  open,
  onOpenChange,
  onBack,
  onArchitectSelected,
  leadName,
}: ArchitectSelectionDialogProps) {
  const [architects, setArchitects] = useState<Architect[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (open) {
      // Load architects from localStorage
      const loadedArchitects = ArchitectsService.getArchitects()
      setArchitects(loadedArchitects)
    }
  }, [open])

  // Filter architects based on search query
  const filteredArchitects = useMemo(() => {
    if (!searchQuery.trim()) return architects

    const query = searchQuery.toLowerCase()
    return architects.filter(
      (arch) =>
        arch.nom.toLowerCase().includes(query) ||
        arch.prenom.toLowerCase().includes(query) ||
        arch.ville.toLowerCase().includes(query) ||
        specialtyLabels[arch.specialite]?.toLowerCase().includes(query)
    )
  }, [architects, searchQuery])

  // Only show active architects
  const activeArchitects = filteredArchitects.filter((arch) => arch.statut === "actif")

  const handleSelectArchitect = (architect: Architect) => {
    setSelectedArchitect(architect)
    setShowConfirmation(true)
  }

  const handleConfirmConversion = () => {
    if (selectedArchitect) {
      setIsLoading(true)
      onArchitectSelected(selectedArchitect.id)
    }
  }

  const handleBackToSelection = () => {
    setShowConfirmation(false)
    setSelectedArchitect(null)
  }

  const handleClose = () => {
    setSearchQuery("")
    setSelectedArchitect(null)
    setShowConfirmation(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl rounded-2xl overflow-hidden p-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {!showConfirmation ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              {/* Header */}
              <DialogHeader className="p-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-9 w-9 p-0 hover:bg-white/10 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-semibold">
                      Sélectionnez un architecte
                    </DialogTitle>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Pour assigner le lead <span className="text-white font-medium">{leadName}</span>
                    </p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un architecte..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 focus:border-blue-500/50 rounded-xl h-11 text-white placeholder:text-gray-500"
                  />
                </div>
              </DialogHeader>

              {/* Architects List */}
              <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {activeArchitects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 font-medium">Aucun architecte trouvé</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchQuery ? "Essayez une autre recherche" : "Ajoutez des architectes pour continuer"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {activeArchitects.map((architect, index) => (
                      <motion.div
                        key={architect.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <button
                          onClick={() => handleSelectArchitect(architect)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all duration-300 group text-left"
                        >
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              {architect.photo ? (
                                <img
                                  src={architect.photo}
                                  alt={`${architect.prenom} ${architect.nom}`}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6 text-blue-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white truncate">
                                  {architect.prenom} {architect.nom}
                                </h3>
                                <Badge className={cn("text-xs", statusConfig[architect.statut].color)}>
                                  {statusConfig[architect.statut].label}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-2">
                                <div className="flex items-center gap-1">
                                  <Briefcase className="w-3.5 h-3.5" />
                                  <span>{specialtyLabels[architect.specialite]}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{architect.ville}</span>
                                </div>
                              </div>

                              {/* Stats */}
                              {(architect.dossiersEnCours !== undefined || architect.totalDossiers !== undefined) && (
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-gray-400">
                                      <span className="text-white font-medium">{architect.dossiersEnCours || 0}</span> en cours
                                    </span>
                                  </div>
                                  <div className="text-gray-500">•</div>
                                  <div className="text-gray-400">
                                    <span className="text-white font-medium">{architect.totalDossiers || 0}</span> total
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Arrow indicator */}
                            <CheckCircle2 className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative p-6"
            >
              {/* Confirmation Header */}
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  disabled={isLoading}
                  className="h-9 w-9 p-0 hover:bg-white/10 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Confirmer la conversion</DialogTitle>
                  <p className="text-sm text-gray-400 mt-0.5">Vérifiez les informations avant de continuer</p>
                </div>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-xs text-gray-400 mb-1">Lead à convertir</p>
                  <p className="text-white font-semibold">{leadName}</p>
                </div>

                {selectedArchitect && (
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                    <p className="text-xs text-gray-400 mb-2">Architecte assigné</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        {selectedArchitect.photo ? (
                          <img
                            src={selectedArchitect.photo}
                            alt={`${selectedArchitect.prenom} ${selectedArchitect.nom}`}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {selectedArchitect.prenom} {selectedArchitect.nom}
                        </p>
                        <p className="text-xs text-gray-400">
                          {specialtyLabels[selectedArchitect.specialite]} • {selectedArchitect.ville}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-200 font-medium">Action importante</p>
                      <p className="text-xs text-yellow-300/70 mt-1">
                        Le lead sera converti en client et déplacé vers la section Clients & Projets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackToSelection}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 rounded-xl h-11"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleConfirmConversion}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl h-11 shadow-lg shadow-green-600/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conversion...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmer et convertir
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
