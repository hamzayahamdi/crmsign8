"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Lead, LeadNote } from "@/types/lead"
import { 
  X, 
  MessageSquare,
  Plus,
  Send,
  Clock,
  User,
  Phone,
  MapPin
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface LeadNotesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onAddNote?: (leadId: string, note: string) => Promise<void>
}

export function LeadNotesPanel({ open, onOpenChange, lead, onAddNote }: LeadNotesPanelProps) {
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
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "À l'instant"
      if (diffMins < 60) return `Il y a ${diffMins} min`
      if (diffHours < 24) return `Il y a ${diffHours}h`
      if (diffDays < 7) return `Il y a ${diffDays}j`
      
      return format(date, "d MMM yyyy", { locale: fr })
    } catch {
      return dateString
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
        {/* Compact Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-slate-700/50">
          <DialogHeader className="relative px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-white truncate">{lead.nom}</DialogTitle>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {lead.telephone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lead.ville}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Notes Content - Full Width */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Add Note Section */}
          <div className="p-4 border-b border-slate-700/30 bg-slate-800/20">
            {!isAddingNote ? (
              <Button
                onClick={() => setIsAddingNote(true)}
                className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/20"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une note
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Saisissez votre note ici..."
                  className="min-h-[80px] bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-primary/50 focus:ring-primary/20 text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSaving}
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white"
                    size="sm"
                  >
                    {isSaving ? (
                      <>
                        <Clock className="w-3 h-3 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-2" />
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
                    size="sm"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes List - Takes Maximum Space */}
          <ScrollArea className="flex-1 p-4">
            {lead.notes && lead.notes.length > 0 ? (
              <div className="space-y-3">
                {[...lead.notes].reverse().map((note, index) => (
                  <div
                    key={note.id}
                    className={cn(
                      "group relative p-3 rounded-lg border transition-all duration-300",
                      index === 0 
                        ? "bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30 shadow-lg shadow-primary/5" 
                        : "bg-slate-800/40 border-slate-700/30 hover:border-slate-600/50"
                    )}
                  >
                    {/* Timeline connector */}
                    {index < lead.notes!.length - 1 && (
                      <div className="absolute left-4 top-full h-3 w-px bg-gradient-to-b from-slate-600/50 to-transparent"></div>
                    )}
                    
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "p-1.5 rounded-md flex-shrink-0 mt-0.5",
                        index === 0 ? "bg-primary/20 border border-primary/30" : "bg-slate-700/50"
                      )}>
                        <MessageSquare className={cn("w-3 h-3", index === 0 ? "text-primary" : "text-slate-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={cn(
                            "text-xs font-medium flex items-center gap-1",
                            index === 0 ? "text-primary" : "text-slate-300"
                          )}>
                            <User className="w-3 h-3" />
                            {note.author}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatNoteDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/30 mb-3">
                  <MessageSquare className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium mb-1">Aucune note</p>
                <p className="text-xs text-slate-500">Ajoutez la première note pour ce lead</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
