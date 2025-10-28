"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Lead, LeadStatus, LeadNote } from "@/types/lead"
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Calendar,
  Clock,
  MessageSquare,
  Plus,
  Send,
  History,
  TrendingUp,
  Store,
  Globe,
  Facebook,
  Instagram,
  Music2,
  Users,
  Package,
  Sparkles,
  FileText,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface LeadHistoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onAddNote?: (leadId: string, note: string) => Promise<void>
}

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  nouveau: { label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-500/40", icon: "🟢" },
  a_recontacter: { label: "À recontacter", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: "🟡" },
  sans_reponse: { label: "Sans réponse", color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: "🟠" },
  non_interesse: { label: "Non intéressé", color: "bg-red-500/20 text-red-400 border-red-500/40", icon: "🔴" },
  converti: { label: "Converti", color: "bg-blue-500/20 text-blue-400 border-blue-500/40", icon: "🔵" },
}

const sourceIcons = {
  magasin: { icon: Store, label: "Magasin", color: "text-purple-400" },
  site_web: { icon: Globe, label: "Site web", color: "text-blue-400" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-400" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-fuchsia-400" },
  reference_client: { icon: Users, label: "Recommandation", color: "text-green-400" },
  autre: { icon: Package, label: "Autre", color: "text-gray-400" },
}

export function LeadHistoryPanel({ open, onOpenChange, lead, onAddNote }: LeadHistoryPanelProps) {
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setNewNote("")
      setIsAddingNote(false)
    }
  }, [open])

  if (!lead) return null

  const statusInfo = statusConfig[lead.statut]
  const sourceInfo = sourceIcons[lead.source as keyof typeof sourceIcons] || sourceIcons.autre
  const SourceIcon = sourceInfo.icon

  const handleAddNote = async () => {
    if (!newNote.trim() || !onAddNote) return
    
    setIsSaving(true)
    try {
      await onAddNote(lead.id, newNote.trim())
      setNewNote("")
      setIsAddingNote(false)
    } catch (error) {
      console.error("Error adding note:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const formatNoteDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr })
    } catch {
      return dateString
    }
  }

  const formatCreatedDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
    } catch {
      return dateString
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-b border-slate-700/50">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <DialogHeader className="relative p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
                  <History className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    {lead.nom}
                    <Badge className={cn("border text-xs font-medium px-3 py-1", statusInfo.color)}>
                      {statusInfo.icon} {statusInfo.label}
                    </Badge>
                  </DialogTitle>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Historique complet et notes du lead
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
          {/* Left Column - Lead Information */}
          <div className="w-full md:w-2/5 space-y-4">
            <div className="glass rounded-xl p-5 border border-slate-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Informations principales
              </h3>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <Phone className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Téléphone</p>
                    <p className="text-sm font-medium text-white truncate">{lead.telephone}</p>
                  </div>
                </div>

                {lead.email && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                    <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-white truncate">{lead.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <MapPin className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Ville</p>
                    <p className="text-sm font-medium text-white">{lead.ville}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <Building2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Type de bien</p>
                    <p className="text-sm font-medium text-white">{lead.typeBien}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Source & Assignment */}
            <div className="glass rounded-xl p-5 border border-slate-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Origine & Affectation
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <SourceIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", sourceInfo.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Source</p>
                    <p className="text-sm font-medium text-white">{sourceInfo.label}</p>
                    {lead.magasin && (
                      <p className="text-xs text-slate-500 mt-1">{lead.magasin}</p>
                    )}
                    {lead.commercialMagasin && (
                      <p className="text-xs text-slate-500">Commercial: {lead.commercialMagasin}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <User className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Assigné par</p>
                    <p className="text-sm font-medium text-white">{lead.assignePar}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                  <Calendar className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Créé le</p>
                    <p className="text-sm font-medium text-white capitalize">{formatCreatedDate(lead.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message initial */}
            {lead.message && (
              <div className="glass rounded-xl p-5 border border-slate-700/50 space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Message initial
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Right Column - Notes History */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="glass rounded-xl border border-slate-700/50 flex flex-col h-full overflow-hidden">
              {/* Notes Header */}
              <div className="p-5 border-b border-slate-700/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Historique des notes
                  </h3>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {lead.notes?.length || 0} note{(lead.notes?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {!isAddingNote && (
                  <Button
                    onClick={() => setIsAddingNote(true)}
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une note
                  </Button>
                )}
              </div>

              {/* Add Note Form */}
              {isAddingNote && (
                <div className="p-5 border-b border-slate-700/30 bg-slate-800/30 space-y-3">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Saisissez votre note ici..."
                    className="min-h-[100px] bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-primary/50 focus:ring-primary/20"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSaving}
                      className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingNote(false)
                        setNewNote("")
                      }}
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes List */}
              <ScrollArea className="flex-1 p-5">
                {lead.notes && lead.notes.length > 0 ? (
                  <div className="space-y-4">
                    {[...lead.notes].reverse().map((note, index) => (
                      <div
                        key={note.id}
                        className="group relative p-4 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-800/30 border border-slate-700/30 hover:border-primary/30 transition-all duration-300"
                      >
                        {/* Timeline connector */}
                        {index < lead.notes!.length - 1 && (
                          <div className="absolute left-6 top-full h-4 w-px bg-gradient-to-b from-slate-700/50 to-transparent"></div>
                        )}
                        
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-primary">{note.author}</span>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-400 capitalize">{formatNoteDate(note.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/30 mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium mb-1">Aucune note pour le moment</p>
                    <p className="text-sm text-slate-500">Ajoutez la première note pour ce lead</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
