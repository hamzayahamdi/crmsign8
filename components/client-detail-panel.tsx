"use client"

import { useState, useEffect } from "react"
import type { Client, ProjectStatus, ClientDocument } from "@/types/client"
import { X, Phone, Mail, MapPin, Building2, User, Calendar, Edit, MessageCircle, CheckCircle, Plus, Paperclip, FileText, Image as ImageIcon, File, Trash2, Upload, Save, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

interface ClientDetailPanelProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (client: Client) => void
  onUpdate?: (client: Client) => void
  onCall?: (client: Client) => void
  onWhatsApp?: (client: Client) => void
  onMarkComplete?: (client: Client) => void
}

const statutConfig = {
  en_conception: { label: "En conception", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  en_travaux: { label: "En travaux", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  termine: { label: "Terminé", color: "bg-green-500/20 text-green-400 border-green-500/40" },
}

const historyTypeIcons = {
  note: FileText,
  appel: Phone,
  whatsapp: MessageCircle,
  modification: Edit,
  statut: AlertCircle,
  document: Paperclip,
  "rendez-vous": Calendar,
  devis: FileText,
  validation: CheckCircle,
}

const documentTypeIcons = {
  pdf: FileText,
  image: ImageIcon,
  dwg: File,
  other: File,
}

export function ClientDetailPanel({
  client,
  isOpen,
  onClose,
  onEdit,
  onUpdate,
  onCall,
  onWhatsApp,
  onMarkComplete
}: ClientDetailPanelProps) {
  const { toast } = useToast()
  const [localClient, setLocalClient] = useState<Client | null>(null)
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [showAllStages, setShowAllStages] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showAllDocs, setShowAllDocs] = useState(false)

  useEffect(() => {
    if (client) {
      setLocalClient(client)
    }
  }, [client])

  if (!localClient) return null

  const statutInfo = statutConfig[localClient.statutProjet]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatProjectType = (type: string) => {
    const types: Record<string, string> = {
      appartement: "Appartement",
      villa: "Villa",
      magasin: "Magasin",
      bureau: "Bureau",
      riad: "Riad",
      studio: "Studio",
      autre: "Autre"
    }
    return types[type] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleCall = () => {
    window.location.href = `tel:${localClient.telephone}`
    onCall?.(localClient)
  }

  const handleWhatsApp = () => {
    const phoneNumber = localClient.telephone.replace(/\s+/g, '').replace(/^0/, '212')
    window.open(`https://wa.me/${phoneNumber}`, '_blank')
    onWhatsApp?.(localClient)
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const updatedClient = {
      ...localClient,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: new Date().toISOString(),
          type: "note" as const,
          description: newNote,
          auteur: localClient.architecteAssigne
        },
        ...(localClient.historique || [])
      ],
      updatedAt: new Date().toISOString(),
      derniereMaj: new Date().toISOString()
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)
    setNewNote("")
    setIsAddingNote(false)

    toast({
      title: "💾 Note enregistrée",
      description: "La note a été ajoutée avec succès",
    })
  }

  const handleStatusChange = (newStatus: ProjectStatus) => {
    const statusLabels = {
      en_conception: "En conception",
      en_travaux: "En travaux",
      termine: "Terminé"
    }

    const updatedClient = {
      ...localClient,
      statutProjet: newStatus,
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: new Date().toISOString(),
          type: "statut" as const,
          description: `Statut passé à ${statusLabels[newStatus]}`,
          auteur: localClient.architecteAssigne
        },
        ...(localClient.historique || [])
      ],
      updatedAt: new Date().toISOString(),
      derniereMaj: new Date().toISOString()
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)

    toast({
      title: "✅ Statut mis à jour",
      description: `Le statut a été changé à ${statusLabels[newStatus]}`,
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newDocuments: ClientDocument[] = Array.from(files).map(file => {
      const fileType = file.type.includes('pdf') ? 'pdf' : 
                      file.type.includes('image') ? 'image' : 
                      file.name.endsWith('.dwg') ? 'dwg' : 'other'

      return {
        id: `doc-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: fileType,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: localClient.architecteAssigne,
        category: "autre"
      }
    })

    const updatedClient = {
      ...localClient,
      documents: [...(localClient.documents || []), ...newDocuments],
      historique: [
        {
          id: `hist-${Date.now()}`,
          date: new Date().toISOString(),
          type: "document" as const,
          description: `${newDocuments.length} document(s) ajouté(s)`,
          auteur: localClient.architecteAssigne
        },
        ...(localClient.historique || [])
      ],
      updatedAt: new Date().toISOString(),
      derniereMaj: new Date().toISOString()
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)

    toast({
      title: "📎 Documents ajoutés",
      description: `${newDocuments.length} fichier(s) téléchargé(s) avec succès`,
    })
  }

  const handleDeleteDocument = (docId: string) => {
    const updatedClient = {
      ...localClient,
      documents: localClient.documents?.filter(d => d.id !== docId) || [],
      updatedAt: new Date().toISOString(),
      derniereMaj: new Date().toISOString()
    }

    setLocalClient(updatedClient)
    onUpdate?.(updatedClient)

    toast({
      title: "🗑️ Document supprimé",
      description: "Le document a été supprimé avec succès",
    })
  }

  const sortedHistory = [...(localClient.historique || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[oklch(22%_0.03_260)] border-l border-slate-600/30 shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="glass border-b border-slate-600/30 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">
                      {localClient.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{localClient.nom}</h2>
                    <Badge className={cn("border text-xs font-medium px-2.5 py-1", statutInfo.color)}>
                      {statutInfo.label}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-slate-700/50 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 flex-wrap">
                {onEdit && (
                  <Button
                    onClick={() => onEdit(localClient)}
                    size="sm"
                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                <Button
                  onClick={handleCall}
                  size="sm"
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Appeler
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  size="sm"
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                {localClient.statutProjet !== 'termine' && onMarkComplete && (
                  <Button
                    onClick={() => onMarkComplete(localClient)}
                    size="sm"
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Terminé
                  </Button>
                )}
              </div>
            </div>

            {/* Content - Two Column Layout */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Stages */}
                  {localClient.stages && localClient.stages.length > 0 && (
                    <div className="glass rounded-2xl p-6 border border-slate-600/30">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Étapes du projet</h3>
                        <span className="text-xs text-slate-400">{localClient.stages.length} étapes</span>
                      </div>
                      <div className="space-y-2">
                        {(showAllStages ? localClient.stages : localClient.stages.slice(0, 5))
                          .sort((a, b) => a.order - b.order)
                          .map((stage, index) => (
                            <div key={stage.id} className="flex items-center gap-3 py-1.5">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                stage.status === "completed" && "bg-green-500/20 text-green-400",
                                stage.status === "in_progress" && "bg-blue-500/20 text-blue-400",
                                stage.status === "pending" && "bg-slate-600/20 text-slate-400"
                              )}>
                                {stage.status === "completed" ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  <span className="text-sm font-bold">{index + 1}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={cn(
                                  "text-sm font-medium",
                                  stage.status === "completed" && "text-green-400",
                                  stage.status === "in_progress" && "text-blue-400",
                                  stage.status === "pending" && "text-slate-400"
                                )}>
                                  {stage.name}
                                </p>
                                {stage.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1">{stage.description}</p>
                                )}
                              </div>
                              {stage.completedAt && (
                                <span className="text-xs text-slate-500">
                                  {formatShortDate(stage.completedAt)}
                                </span>
                              )}
                            </div>
                          ))}
                        {localClient.stages.length > 5 && (
                          <button
                            className="text-xs text-primary hover:underline mt-1"
                            onClick={() => setShowAllStages(!showAllStages)}
                          >
                            {showAllStages ? "Afficher moins" : `Afficher plus (${localClient.stages.length - 5})`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes & Timeline */}
                  <div className="glass rounded-2xl p-6 border border-slate-600/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Notes & Historique</h3>
                      <Button
                        onClick={() => setIsAddingNote(!isAddingNote)}
                        size="sm"
                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une note
                      </Button>
                    </div>

                    {/* Add Note Form */}
                    {isAddingNote && (
                      <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Écrivez votre note ici..."
                          className="mb-3 bg-slate-700/50 border-slate-600/50 text-white"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddNote}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button
                            onClick={() => {
                              setIsAddingNote(false)
                              setNewNote("")
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="space-y-3">
                      {sortedHistory.length > 0 ? (
                        (showAllHistory ? sortedHistory : sortedHistory.slice(0, 6)).map((entry, index) => {
                          const Icon = historyTypeIcons[entry.type] || FileText
                          return (
                            <div key={entry.id} className="flex gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                {index < sortedHistory.length - 1 && (
                                  <div className="absolute top-10 left-5 w-0.5 h-full bg-slate-600/30" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="text-sm font-medium text-white leading-snug">{entry.description}</p>
                                  <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                    {formatShortDate(entry.date)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">Par {entry.auteur}</p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-400">Aucun historique disponible</p>
                        </div>
                      )}
                      {sortedHistory.length > 6 && (
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => setShowAllHistory(!showAllHistory)}
                        >
                          {showAllHistory ? "Afficher moins" : `Afficher plus (${sortedHistory.length - 6})`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Documents & Media */}
                  <div className="glass rounded-2xl p-6 border border-slate-600/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Documents & Médias</h3>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.dwg,.doc,.docx"
                        />
                        <Button
                          size="sm"
                          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
                          asChild
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Joindre un fichier
                          </span>
                        </Button>
                      </label>
                    </div>

                    {localClient.documents && localClient.documents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(showAllDocs ? localClient.documents : localClient.documents.slice(0, 4)).map((doc) => {
                          const Icon = documentTypeIcons[doc.type]
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30 hover:border-primary/40 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                                <p className="text-xs text-slate-400">
                                  {formatFileSize(doc.size)} • {formatShortDate(doc.uploadedAt)}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="shrink-0 hover:bg-red-500/20 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )
                        })}
                        {localClient.documents.length > 4 && (
                          <button
                            className="text-xs text-primary hover:underline text-left mt-1"
                            onClick={() => setShowAllDocs(!showAllDocs)}
                          >
                            {showAllDocs ? "Afficher moins" : `Afficher plus (${localClient.documents.length - 4})`}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-slate-600/30 rounded-lg">
                        <Paperclip className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 mb-2">Aucun document disponible</p>
                        <p className="text-xs text-slate-500">Glissez-déposez des fichiers ou cliquez pour télécharger</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Quick Actions Sidebar */}
                <div className="space-y-6">
                  {/* Client Info Card */}
                  <div className="glass rounded-2xl p-6 border border-slate-600/30">
                    <h3 className="text-lg font-semibold text-white mb-4">Informations</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-1">Téléphone</p>
                          <p className="text-sm font-medium text-white">{localClient.telephone}</p>
                        </div>
                      </div>

                      {localClient.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 mb-1">Email</p>
                            <p className="text-sm font-medium text-white truncate">{localClient.email}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-1">Ville</p>
                          <p className="text-sm font-medium text-white">{localClient.ville}</p>
                        </div>
                      </div>

                      {localClient.adresse && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 mb-1">Adresse</p>
                            <p className="text-sm font-medium text-white">{localClient.adresse}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-1">Type de projet</p>
                          <p className="text-sm font-medium text-white">{formatProjectType(localClient.typeProjet)}</p>
                        </div>
                      </div>

                      {localClient.budget && (
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 mb-1">Budget</p>
                            <p className="text-sm font-medium text-white">{formatCurrency(localClient.budget)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Change Status */}
                  <div className="glass rounded-2xl p-6 border border-slate-600/30">
                    <h3 className="text-lg font-semibold text-white mb-4">🔁 Changer le statut</h3>
                    <div className="space-y-2">
                      {(Object.keys(statutConfig) as ProjectStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={localClient.statutProjet === status}
                          className={cn(
                            "w-full p-3 rounded-lg border text-left transition-all",
                            localClient.statutProjet === status
                              ? "bg-slate-700/50 border-slate-600/50 cursor-not-allowed opacity-50"
                              : "bg-slate-800/50 border-slate-600/30 hover:border-primary/40 hover:bg-slate-700/50"
                          )}
                        >
                          <p className="text-sm font-medium text-white">
                            {statutConfig[status].label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Architecte */}
                  <div className="glass rounded-2xl p-6 border border-slate-600/30">
                    <h3 className="text-lg font-semibold text-white mb-4">Architecte</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{localClient.architecteAssigne}</p>
                        <p className="text-xs text-slate-400">Architecte assigné</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
