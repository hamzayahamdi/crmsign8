"use client"
// Optimized for mobile responsiveness
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
      <DialogContent className="w-[92vw] sm:w-full sm:max-w-[440px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white shadow-2xl rounded-xl md:rounded-2xl overflow-hidden p-0">
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
              <DialogHeader className="p-3 md:p-5 lg:p-6 pb-2 md:pb-3 lg:pb-4 border-b border-white/5">
                <div className="flex items-center gap-1.5 md:gap-2.5 lg:gap-3 mb-1 md:mb-1.5 lg:mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 p-0 hover:bg-white/10 rounded-lg"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                  <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                    <Briefcase className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base md:text-lg lg:text-xl font-semibold truncate">
                      Sélectionnez un architecte
                    </DialogTitle>
                    <p className="text-[10px] md:text-xs lg:text-sm text-gray-400 mt-0 md:mt-0.5 truncate">
                      Pour assigner le lead <span className="text-white font-medium">{leadName}</span>
                    </p>
                  </div>
                </div>

                {/* Search Bar with Command Palette Style */}
                <div className="relative mt-2 md:mt-3 lg:mt-4">
                  <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Rechercher par nom, ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="pl-8 md:pl-9 lg:pl-10 pr-3 md:pr-4 bg-white/5 border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-lg md:rounded-xl h-9 md:h-10 lg:h-12 text-xs md:text-sm lg:text-base text-white placeholder:text-gray-500 transition-all"
                  />
                  {searchQuery && (
                    <div className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-[10px] md:text-xs text-gray-500">
                      {activeArchitects.length}
                    </div>
                  )}
                </div>

                {/* Quick hint */}
                <div className="hidden md:flex items-center gap-2 mt-2 lg:mt-3 text-[10px] md:text-xs text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↑↓</kbd>
                  <span>Naviguer</span>
                  <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Enter</kbd>
                  <span>Sélectionner</span>
                </div>
              </DialogHeader>

              {/* Architects List - Autocomplete Style */}
              <div className="p-2 md:p-3 lg:p-4 max-h-[55vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar">
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
                  <div className="space-y-1.5 md:space-y-2">
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
                            "w-full p-2 md:p-2.5 lg:p-3 rounded-lg md:rounded-xl transition-all duration-200 group text-left",
                            "border border-white/10",
                            isFocused
                              ? "bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10"
                              : "bg-white/5 hover:bg-white/10 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3">
                            {/* Avatar */}
                            <div className={cn(
                              "w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-md md:rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                              isFocused
                                ? "bg-blue-500/30"
                                : "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                            )}>
                              {architect.photo ? (
                                <img
                                  src={architect.photo}
                                  alt={`${architect.prenom} ${architect.nom}`}
                                  className="w-full h-full rounded-md md:rounded-lg object-cover"
                                />
                              ) : (
                                <User className="w-4 h-4 md:w-4.5 md:h-4.5 lg:w-5 lg:h-5 text-blue-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate text-[11px] md:text-xs lg:text-sm mb-0 md:mb-0.5">
                                {architect.prenom} {architect.nom}
                              </h3>
                              <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] lg:text-xs text-gray-400">
                                <span className="truncate">{architect.ville}</span>
                                {(architect.dossiersEnCours !== undefined && architect.dossiersEnCours > 0) && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-green-400" />
                                      <span className="whitespace-nowrap">{architect.dossiersEnCours} actif{architect.dossiersEnCours > 1 ? 's' : ''}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Selection indicator - Smaller and more compact */}
                            {isFocused && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-4 h-4 md:w-5 md:h-5 lg:w-5.5 lg:h-5.5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"
                              >
                                <Check className="w-2.5 h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 text-white" />
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
              <div className="p-2.5 md:p-3 lg:p-4 border-t border-white/5 bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] md:text-xs text-gray-500 truncate flex-1">
                    {activeArchitects.length > 0
                      ? `${activeArchitects.length} disponible${activeArchitects.length !== 1 ? 's' : ''}`
                      : "Aucun"
                    }
                  </p>
                  <Button
                    variant="ghost"
                    onClick={handleConvertWithoutArchitect}
                    disabled={isLoading}
                    className="h-7 md:h-8 px-2.5 md:px-3 text-[10px] md:text-xs text-gray-400 hover:text-white hover:bg-white/10 whitespace-nowrap flex-shrink-0"
                  >
                    Sans architecte
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
              className="relative p-3 md:p-4 lg:p-6"
            >
              {/* Confirmation Header */}
              <div className="flex items-center gap-1.5 md:gap-2.5 lg:gap-3 mb-3 md:mb-4 lg:mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  disabled={isLoading}
                  className="h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 p-0 hover:bg-white/10 rounded-lg"
                >
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
                <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base md:text-lg lg:text-xl font-semibold truncate">Confirmer la conversion</DialogTitle>
                  <p className="text-[10px] md:text-xs lg:text-sm text-gray-400 mt-0 md:mt-0.5 truncate">Vérifiez les informations</p>
                </div>
              </div>

              {/* Confirmation Details */}
              <div className="space-y-2 md:space-y-2.5 lg:space-y-3 mb-4 md:mb-5 lg:mb-6">
                <div className="p-2.5 md:p-3 lg:p-4 bg-white/5 rounded-lg md:rounded-xl border border-white/10">
                  <p className="text-white font-semibold text-xs md:text-sm lg:text-base truncate">{leadName}</p>
                </div>

                {selectedArchitect ? (
                  <div className="p-2.5 md:p-3 lg:p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg md:rounded-xl border border-blue-500/20">
                    <div className="flex items-center gap-2 md:gap-2.5 lg:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-md md:rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        {selectedArchitect.photo ? (
                          <img
                            src={selectedArchitect.photo}
                            alt={`${selectedArchitect.prenom} ${selectedArchitect.nom}`}
                            className="w-full h-full rounded-md md:rounded-lg object-cover"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-[11px] md:text-xs lg:text-sm truncate">
                          {selectedArchitect.prenom} {selectedArchitect.nom}
                        </p>
                        <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-400 truncate">
                          {selectedArchitect.ville}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 md:p-3 lg:p-4 bg-white/5 rounded-lg md:rounded-xl border border-white/10">
                    <p className="text-gray-400 text-[11px] md:text-xs lg:text-sm">Aucun architecte assigné</p>
                    <p className="text-[9px] md:text-[10px] lg:text-xs text-gray-500 mt-0.5 md:mt-1">Vous pourrez assigner un architecte plus tard</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 md:gap-2.5 lg:gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackToSelection}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 rounded-lg md:rounded-xl h-9 md:h-10 lg:h-11 text-[11px] md:text-xs lg:text-sm px-3 md:px-4"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleConfirmConversion}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg md:rounded-xl h-9 md:h-10 lg:h-11 shadow-lg shadow-green-600/20 text-[11px] md:text-xs lg:text-sm px-3 md:px-4"
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
