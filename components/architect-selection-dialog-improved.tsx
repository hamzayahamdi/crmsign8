"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
  TrendingUp,
  Check
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  const [isFetchingArchitects, setIsFetchingArchitects] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch architects from API
  useEffect(() => {
    if (open) {
      fetchArchitects()
    }
  }, [open])

  const fetchArchitects = async () => {
    setIsFetchingArchitects(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/architects', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Loaded architects:', data.data?.length || 0)
        setArchitects(data.data || [])
      } else {
        console.error('❌ Failed to fetch architects')
        setArchitects([])
      }
    } catch (error) {
      console.error('❌ Error fetching architects:', error)
      setArchitects([])
    } finally {
      setIsFetchingArchitects(false)
    }
  }

  // Filter architects based on search query with fast matching
  const filteredArchitects = useMemo(() => {
    if (!searchQuery.trim()) return architects

    const query = searchQuery.toLowerCase().trim()
    return architects.filter((arch) => {
      const fullName = `${arch.prenom} ${arch.nom}`.toLowerCase()
      const searchableText = [
        fullName,
        arch.nom.toLowerCase(),
        arch.prenom.toLowerCase(),
        arch.ville?.toLowerCase() || '',
        arch.email?.toLowerCase() || '',
        specialtyLabels[arch.specialite]?.toLowerCase() || '',
      ].join(' ')

      return searchableText.includes(query)
    })
  }, [architects, searchQuery])

  // Only show active architects
  const activeArchitects = filteredArchitects.filter((arch) => arch.statut === "actif")

  // Reset focused index when search changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [searchQuery])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || showConfirmation) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, activeArchitects.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && activeArchitects[focusedIndex]) {
        e.preventDefault()
        handleSelectArchitect(activeArchitects[focusedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showConfirmation, focusedIndex, activeArchitects])

  const handleSelectArchitect = (architect: Architect) => {
    setSelectedArchitect(architect)
    setShowConfirmation(true)
  }

  const handleConfirmConversion = () => {
    setIsLoading(true)
    // Pass empty string if no architect selected (optional)
    onArchitectSelected(selectedArchitect?.id || '')
  }

  const handleConvertWithoutArchitect = () => {
    // Show confirmation even without architect
    setSelectedArchitect(null)
    setShowConfirmation(true)
  }

  const handleBackToSelection = () => {
    setShowConfirmation(false)
    setSelectedArchitect(null)
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  const handleClose = () => {
    setSearchQuery("")
    setSelectedArchitect(null)
    setShowConfirmation(false)
    setFocusedIndex(0)
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

                {/* Search Bar with Command Palette Style */}
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Rechercher par nom, ville, spécialité..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="pl-10 pr-4 bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl h-12 text-white placeholder:text-gray-500 transition-all"
                  />
                  {searchQuery && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {activeArchitects.length} résultat{activeArchitects.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Quick hint */}
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                  <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">↑↓</kbd>
                  <span>Naviguer</span>
                  <kbd className="px-2 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
                  <span>Sélectionner</span>
                </div>
              </DialogHeader>

              {/* Architects List - Autocomplete Style */}
              <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {isFetchingArchitects ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 font-medium">Chargement des architectes...</p>
                  </div>
                ) : activeArchitects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 font-medium">
                      {searchQuery ? "Aucun architecte trouvé" : "Aucun architecte actif"}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchQuery 
                        ? "Essayez une autre recherche ou vérifiez l'orthographe" 
                        : "Ajoutez des architectes pour continuer"}
                    </p>
                    {architects.length > 0 && activeArchitects.length === 0 && !searchQuery && (
                      <p className="text-xs text-yellow-500 mt-3">
                        {architects.length} architecte(s) inactif(s) masqué(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeArchitects.map((architect, index) => {
                      const isFocused = index === focusedIndex
                      return (
                        <motion.button
                          key={architect.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          onClick={() => handleSelectArchitect(architect)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          className={cn(
                            "w-full p-4 rounded-xl transition-all duration-200 group text-left",
                            "border border-white/10",
                            isFocused
                              ? "bg-blue-500/20 border-blue-500/50 scale-[1.02] shadow-lg shadow-blue-500/10"
                              : "bg-white/5 hover:bg-white/10 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={cn(
                              "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                              isFocused 
                                ? "bg-blue-500/30 scale-105" 
                                : "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                            )}>
                              {architect.photo ? (
                                <img
                                  src={architect.photo}
                                  alt={`${architect.prenom} ${architect.nom}`}
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-blue-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate text-sm mb-0.5">
                                {architect.prenom} {architect.nom}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{architect.ville}</span>
                                {(architect.dossiersEnCours !== undefined && architect.dossiersEnCours > 0) && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                      <span>{architect.dossiersEnCours} actif{architect.dossiersEnCours > 1 ? 's' : ''}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Selection indicator */}
                            {isFocused && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"
                              >
                                <Check className="w-3.5 h-3.5 text-white" />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {activeArchitects.length > 0 
                      ? `${activeArchitects.length} architecte${activeArchitects.length !== 1 ? 's' : ''} actif${activeArchitects.length !== 1 ? 's' : ''} disponible${activeArchitects.length !== 1 ? 's' : ''}`
                      : "Aucun architecte actif disponible"
                    }
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleConvertWithoutArchitect}
                    disabled={isLoading}
                    className="h-8 px-3 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    Convertir sans architecte
                  </Button>
                </div>
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
              <div className="space-y-3 mb-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white font-semibold">{leadName}</p>
                </div>

                {selectedArchitect ? (
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
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
                        <p className="text-white font-semibold text-sm">
                          {selectedArchitect.prenom} {selectedArchitect.nom}
                        </p>
                        <p className="text-xs text-gray-400">
                          {selectedArchitect.ville}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-sm">Aucun architecte assigné</p>
                    <p className="text-xs text-gray-500 mt-1">Vous pourrez assigner un architecte plus tard</p>
                  </div>
                )}
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
                      {selectedArchitect ? 'Confirmer et convertir' : 'Convertir sans architecte'}
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
