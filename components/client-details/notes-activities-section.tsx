"use client"

import { useState } from "react"
import { MessageSquare, Plus } from "lucide-react"
import type { Client } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"

interface NotesActivitiesSectionProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function NotesActivitiesSection({ client, onUpdate }: NotesActivitiesSectionProps) {
  const { user } = useAuth()
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState("")

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    const userName = user?.name || 'Utilisateur'
    
    try {
      // Save note to database via API
      const response = await fetch(`/api/clients/${client.id}/historique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'note',
          description: newNote,
          auteur: userName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      const result = await response.json()
      const now = new Date().toISOString()
      
      // Update local state
      const updatedClient = {
        ...client,
        historique: [
          result.data,
          ...(client.historique || [])
        ],
        derniereMaj: now,
        updatedAt: now
      }

      onUpdate(updatedClient)
      setNewNote("")
      setIsAddingNote(false)
    } catch (error) {
      console.error('[Add Note] Error:', error)
      // Show error to user (you can add a toast here)
      alert('Impossible d\'ajouter la note. Veuillez réessayer.')
    }
  }

  const allHistory = [...(client.historique || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10) // Show last 10 activities

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-xs font-light text-white/90 mb-0.5 tracking-wide uppercase">Notes & Activités</h2>
          <p className="text-[9px] text-white/40 font-light">Chronologie des actions et mises à jour</p>
        </div>
        <Button
          onClick={() => setIsAddingNote(!isAddingNote)}
          size="sm"
          className="bg-blue-600/90 hover:bg-blue-600 text-white h-7 px-2.5 text-[10px] font-light"
        >
          <Plus className="w-3 h-3 mr-1" />
          Ajouter note
        </Button>
      </div>

      <AnimatePresence>
        {isAddingNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Écrivez votre note..."
                className="mb-3 min-h-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNote("")
                  }}
                  size="sm"
                  variant="ghost"
                  className="bg-white/5 hover:bg-white/10 text-white"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {allHistory.length > 0 ? (
        <div className="space-y-2.5">
          {allHistory.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/3 border border-white/5 rounded-md p-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3 h-3 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-light text-white/70">{entry.auteur}</span>
                    <span className="text-[10px] text-white/30">•</span>
                    <span className="text-[10px] text-white/40 font-light">
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed font-light">{entry.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-white/50 text-xs font-light">Aucune activité pour le moment</p>
        </div>
      )}
    </div>
  )
}
