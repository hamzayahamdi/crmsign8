"use client"

import { useState, useEffect } from "react"
import type { Client, ProjectStatus } from "@/types/client"
import { X, Phone, Mail, MessageCircle, Plus, ChevronDown, ChevronUp, MapPin, Building2, User, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface ClientDetailPanelProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (client: Client) => void
}

const statusConfig = {
  en_conception: { 
    label: "En conception", 
    icon: "📐",
    progress: 30,
    color: "bg-blue-100 text-blue-700 border-blue-200"
  },
  en_travaux: { 
    label: "En travaux", 
    icon: "🏗️",
    progress: 65,
    color: "bg-orange-100 text-orange-700 border-orange-200"
  },
  termine: { 
    label: "Livré", 
    icon: "🏁",
    progress: 100,
    color: "bg-green-100 text-green-700 border-green-200"
  },
}

export function ClientDetailPanelMinimal({
  client,
  isOpen,
  onClose,
  onUpdate
}: ClientDetailPanelProps) {
  const { toast } = useToast()
  const [localClient, setLocalClient] = useState<Client | null>(null)
  const [newNote, setNewNote] = useState("")
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'historique'>('notes')

  useEffect(() => {
    if (client) {
      setLocalClient(client)
      setShowFullHistory(false)
      setIsAddingNote(false)
    }
  }, [client])

  if (!localClient) return null

  const statusInfo = statusConfig[localClient.statutProjet]
  
  const sortedHistory = [...(localClient.historique || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const onlyNotes = sortedHistory.filter(h => h.type === 'note')
  const importantHistory = sortedHistory.filter(h =>
    h.type !== 'statut' || /livr[ée]|terminé/i.test(h.description || '')
  )
  
  const latestNotes = onlyNotes.slice(0, 3)
  const hasMoreNotes = onlyNotes.length > 3

  const currentStage = localClient.stages?.find(s => s.status === "in_progress") || 
                       localClient.stages?.filter(s => s.status === "completed").pop()

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const now = new Date().toISOString()
    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: now,
          type: "note" as const,
          description: newNote,
          auteur: "Architecte"
        },
        ...(localClient.historique || [])
      ],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setNewNote("")
    setIsAddingNote(false)

    toast({
      title: "Note ajoutée",
      description: "La note a été enregistrée avec succès",
    })
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    const now = new Date().toISOString()
    const newHist = (newStatus === 'termine') ? [{
      id: `hist-${Date.now()}`,
      date: now,
      type: 'validation' as const,
      description: 'Projet livré',
      auteur: 'Système'
    } as const] : []

    const updatedClient = {
      ...localClient,
      statutProjet: newStatus,
      historique: [...newHist, ...(localClient.historique || [])],
      derniereMaj: now,
      updatedAt: now
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)

    toast({
      title: "Statut mis à jour",
      description: `Le projet est maintenant ${statusConfig[newStatus].label}`,
    })
  }

  const handleCall = () => {
    window.location.href = `tel:${localClient.telephone}`
  }

  const handleWhatsApp = () => {
    const phone = localClient.telephone.replace(/\s/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const handleEmail = () => {
    if (!localClient.email) return
    const subject = encodeURIComponent(`Projet ${localClient.typeProjet} - ${localClient.nom}`)
    const body = encodeURIComponent("Bonjour,\n\n")
    window.location.href = `mailto:${localClient.email}?subject=${subject}&body=${body}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col font-['Inter',sans-serif]"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{localClient.nom}</h2>
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", statusInfo.color)}>
                      <span>{statusInfo.icon}</span>
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-medium">{currentStage?.name || "Démarrage"}</span>
                  <span>{statusInfo.progress}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${statusInfo.progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full rounded-full", 
                      localClient.statutProjet === "termine" ? "bg-green-600" :
                      localClient.statutProjet === "en_travaux" ? "bg-orange-600" :
                      "bg-blue-600"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                
                {/* Client Info Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Informations client</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Ville</p>
                        <p className="text-sm font-medium text-slate-900">{localClient.ville}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Téléphone</p>
                        <p className="text-sm font-medium text-slate-900">{localClient.telephone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Architecte responsable</p>
                        <p className="text-sm font-medium text-slate-900">{localClient.architecteAssigne}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Type de projet</p>
                        <p className="text-sm font-medium text-slate-900 capitalize">{localClient.typeProjet}</p>
                      </div>
                    </div>
                    {localClient.budget && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-500">Budget</p>
                          <p className="text-sm font-medium text-slate-900">{formatCurrency(localClient.budget)}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Dernière mise à jour</p>
                        <p className="text-sm font-medium text-slate-900">{formatShortDate(localClient.derniereMaj)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Rapides */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Actions rapides</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleEmail}
                      disabled={!localClient.email}
                      className={cn("h-11 rounded-lg font-medium shadow-sm text-white",
                        !localClient.email ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700")}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      onClick={handleWhatsApp}
                      className="bg-green-600 hover:bg-green-700 text-white h-11 rounded-lg font-medium shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      variant="outline"
                      className="h-11 rounded-lg font-medium bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter note
                    </Button>
                    <Button
                      onClick={() => {
                        const statuses: ProjectStatus[] = ["en_conception", "en_travaux", "termine"]
                        const currentIndex = statuses.indexOf(localClient.statutProjet)
                        const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                        handleStatusChange(nextStatus)
                      }}
                      variant="outline"
                      className="h-11 rounded-lg font-medium bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      Changer statut
                    </Button>
                  </div>

                  {/* Add Note Form */}
                  {isAddingNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-200"
                    >
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Écrivez votre note ici..."
                        className="mb-3 min-h-[80px] border-slate-300 focus:border-blue-500 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAddNote}
                          disabled={!newNote.trim()}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Enregistrer
                        </Button>
                        <Button
                          onClick={() => {
                            setIsAddingNote(false)
                            setNewNote("")
                          }}
                          variant="outline"
                          className="rounded-lg border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        >
                          Annuler
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Notes & Historique - Tabs */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        activeTab === 'notes' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                      onClick={() => setActiveTab('notes')}
                    >
                      Notes ({onlyNotes.length})
                    </button>
                    <button
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium',
                        activeTab === 'historique' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                      onClick={() => setActiveTab('historique')}
                    >
                      Historique ({importantHistory.length})
                    </button>
                  </div>

                  {activeTab === 'notes' ? (
                    <>
                      {latestNotes.length > 0 ? (
                        <div className="space-y-3">
                          {latestNotes.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3 rounded-lg border border-slate-200 bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-slate-900 leading-relaxed flex-1 line-clamp-2">{entry.description}</p>
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">{formatShortDate(entry.date)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Par {entry.auteur}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune note disponible</p>
                      )}

                      {hasMoreNotes && (
                        <Button
                          onClick={() => setShowFullHistory(!showFullHistory)}
                          variant="ghost"
                          className="w-full mt-3 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                        >
                          {showFullHistory ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Masquer
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Voir plus de notes ({onlyNotes.length - 3})
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {importantHistory.length > 0 ? (
                        <div className="space-y-3">
                          {importantHistory.slice(0, showFullHistory ? importantHistory.length : 6).map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3 rounded-lg border border-slate-200 bg-white"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-slate-800 leading-relaxed flex-1 line-clamp-2">{entry.description}</p>
                                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">{formatShortDate(entry.date)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Par {entry.auteur}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-4">Aucun historique important</p>
                      )}

                      {importantHistory.length > 6 && (
                        <Button
                          onClick={() => setShowFullHistory(!showFullHistory)}
                          variant="ghost"
                          className="w-full mt-3 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                        >
                          {showFullHistory ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Masquer
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Voir l'historique complet ({importantHistory.length - 6})
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Full History - Collapsible */}
                {showFullHistory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-5"
                  >
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Historique complet</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {sortedHistory.slice(3).map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-slate-800 leading-relaxed flex-1 line-clamp-2">{entry.description}</p>
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">{formatShortDate(entry.date)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Par {entry.auteur}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
