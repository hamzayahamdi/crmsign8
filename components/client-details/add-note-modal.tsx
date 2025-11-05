"use client"

import { useState } from "react"
import { X, MessageSquare, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import type { Client } from "@/types/client"

interface AddNoteModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onSave: (client: Client) => void
}

export function AddNoteModal({ isOpen, onClose, client, onSave }: AddNoteModalProps) {
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!note.trim()) return

    setIsSubmitting(true)
    try {
      // Save to database via API
      const response = await fetch(`/api/clients/${client.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: note,
          createdBy: 'Utilisateur', // TODO: Get from auth context
          type: 'note'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create note')
      }

      const result = await response.json()
      console.log('[Add Note] ✅ Note created in database:', result.data)

      // Also add to historique for timeline
      const newHistoryEntry = {
        id: `hist-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'note' as const,
        description: note,
        auteur: 'Utilisateur'
      }

      const updatedClient = {
        ...client,
        historique: [newHistoryEntry, ...(client.historique || [])],
        derniereMaj: new Date().toISOString()
      }

      onSave(updatedClient)
      setNote("")
      onClose()
    } catch (error) {
      console.error('[Add Note] Error creating note:', error)
      alert('Erreur lors de l\'ajout de la note. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Ajouter une note</h2>
                  <p className="text-sm text-white/50">Pour {client.nom}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="note" className="text-white mb-2 block">
                  Note *
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Écrivez votre note ici..."
                  rows={6}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    'Ajouter la note'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
