"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Plus, Loader2, FileText, Briefcase } from "lucide-react"
import type { Client } from "@/types/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface NotesActivitiesSectionProps {
  client: Client
  onUpdate: (client: Client) => void
}

interface UnifiedNote {
  id: string
  content: string
  createdAt: string
  createdBy: string
  type: string
  source: string
}

export function NotesActivitiesSection({ client, onUpdate }: NotesActivitiesSectionProps) {
  const { user } = useAuth()
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [unifiedNotes, setUnifiedNotes] = useState<UnifiedNote[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [localNotes, setLocalNotes] = useState<any[]>([]) // Local notes cache for immediate UI update
  const isAddingNoteRef = useRef(false) // Ref to track if we're adding a note
  const previousHistoriqueLengthRef = useRef(0) // Track previous historique length
  const isInitializedRef = useRef(false) // Track if component has been initialized

  // Initialize local notes on mount
  useEffect(() => {
    if (!isInitializedRef.current && client.historique) {
      const notesFromHistorique = (client.historique || [])
        .filter((entry: any) => entry.type === 'note')
        .map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          type: 'note' as const,
          description: entry.description,
          auteur: entry.auteur,
          source: entry.metadata?.source || 'client',
        }))
      setLocalNotes(notesFromHistorique)
      previousHistoriqueLengthRef.current = client.historique.length
      isInitializedRef.current = true
    }
  }, [client.historique])

  // Fetch notes from unified Note table (includes lead notes)
  // Only fetch when client.id or lead_id changes, not when historique changes (to avoid clearing during updates)
  useEffect(() => {
    const fetchUnifiedNotes = async () => {
      // Don't fetch if we're in the middle of adding a note
      if (isAddingNoteRef.current) return
      
      setIsLoadingNotes(true)
      try {
        // Get contactId from client (could be in lead_id or contactId field)
        const contactId = (client as any).contactId || (client as any).contact_id
        
        // If client has a lead_id, try to get notes from contact that was converted from lead
        const leadId = client.lead_id
        
        if (contactId || leadId) {
          // Try to fetch from contact notes API if we have contactId
          if (contactId) {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/contacts/${contactId}/notes`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              // Don't cache to ensure we get latest notes
              cache: 'no-store',
            })
            
            if (response.ok) {
              const notes = await response.json()
              setUnifiedNotes(notes)
              setIsLoadingNotes(false)
              return
            }
          }
        }
        
        // Fallback: extract notes from historique that are type 'note'
        const notesFromHistorique = (client.historique || [])
          .filter((entry: any) => entry.type === 'note')
          .map((entry: any) => ({
            id: entry.id,
            content: entry.description,
            createdAt: entry.date,
            createdBy: entry.auteur,
            type: 'note',
            source: entry.metadata?.source || 'client',
            metadata: entry.metadata,
          }))
        
        setUnifiedNotes(notesFromHistorique)
      } catch (error) {
        console.error('[Notes] Error fetching unified notes:', error)
        // Fallback to historique notes
        const notesFromHistorique = (client.historique || [])
          .filter((entry: any) => entry.type === 'note')
          .map((entry: any) => ({
            id: entry.id,
            content: entry.description,
            createdAt: entry.date,
            createdBy: entry.auteur,
            type: 'note',
            source: entry.metadata?.source || 'client',
            metadata: entry.metadata,
          }))
        setUnifiedNotes(notesFromHistorique)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    fetchUnifiedNotes()
    
    // Listen for opportunity creation events to refresh notes
    const handleOpportunityCreated = async (event: CustomEvent) => {
      const eventContactId = event.detail?.contactId
      const contactId = (client as any).contactId || (client as any).contact_id
      
      // Wait a bit for the note to be created in the database
      if (eventContactId === contactId) {
        setTimeout(() => {
          console.log('[NotesActivitiesSection] Opportunity created, refreshing notes...')
          fetchUnifiedNotes()
        }, 1000)
      }
    }
    
    window.addEventListener('opportunity-created', handleOpportunityCreated as EventListener)
    return () => {
      window.removeEventListener('opportunity-created', handleOpportunityCreated as EventListener)
    }
  }, [client.id, client.lead_id]) // Removed client.historique from dependencies

  // Update local notes when client historique changes, but preserve existing notes
  useEffect(() => {
    // Don't update if we're adding a note or if historique is empty/cleared
    if (isAddingNoteRef.current) return
    
    const currentHistorique = client.historique || []
    const currentLength = currentHistorique.length
    
    // If historique was cleared (length decreased significantly), don't clear local notes
    // This prevents clearing when parent component refreshes
    if (currentLength === 0 && previousHistoriqueLengthRef.current > 0) {
      console.log('[Notes] Historique cleared, preserving local notes')
      return
    }
    
    // Only update if historique actually has new data
    if (currentLength > 0) {
      const notesFromHistorique = currentHistorique
        .filter((entry: any) => entry.type === 'note')
        .map((entry: any) => ({
          id: entry.id,
          date: entry.date,
          type: 'note' as const,
          description: entry.description,
          auteur: entry.auteur,
          source: entry.metadata?.source || 'client',
        }))
      
      // Merge with existing local notes to avoid duplicates
      setLocalNotes(prev => {
        const existingIds = new Set(prev.map(n => n.id))
        const newNotes = notesFromHistorique.filter(n => !existingIds.has(n.id))
        return [...newNotes, ...prev].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      })
      
      previousHistoriqueLengthRef.current = currentLength
    }
  }, [client.historique])

  const handleAddNote = async () => {
    if (!newNote.trim() || isSavingNote) return

    const userName = user?.name || 'Utilisateur'
    const noteContent = newNote.trim()
    
    setIsSavingNote(true)
    isAddingNoteRef.current = true // Set flag to prevent clearing during update
    
    // Optimistically add note to local state for immediate UI update
    const optimisticNote = {
      id: `temp-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'note' as const,
      description: noteContent,
      auteur: userName,
      source: 'client',
      isOptimistic: true, // Flag to identify optimistic updates
    }
    
    // Add to local notes immediately
    setLocalNotes(prev => [optimisticNote, ...prev])
    
    try {
      // Save note to database via API
      const response = await fetch(`/api/clients/${client.id}/historique`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'note',
          description: noteContent,
          auteur: userName
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add note')
      }

      const result = await response.json()
      const now = new Date().toISOString()
      
      // Remove optimistic note and add real note
      setLocalNotes(prev => {
        const withoutOptimistic = prev.filter(n => n.id !== optimisticNote.id)
        return [{
          id: result.data.id,
          date: result.data.date,
          type: 'note' as const,
          description: result.data.description,
          auteur: result.data.auteur,
          source: result.data.metadata?.source || 'client',
        }, ...withoutOptimistic]
      })
      
      // Update client state WITHOUT calling onUpdate to avoid full refresh
      // The note is already in localNotes, so we don't need to trigger parent update
      // Only update if really necessary (for other components that depend on client.historique)
      const updatedClient = {
        ...client,
        historique: [
          result.data,
          ...(client.historique || [])
        ],
        derniereMaj: now,
        updatedAt: now
      }

      // Call onUpdate but with a delay to ensure local state is preserved
      setTimeout(() => {
        onUpdate(updatedClient)
        isAddingNoteRef.current = false // Reset flag after update
      }, 100)
      
      setNewNote("")
      setIsAddingNote(false)
      
      // Show success toast
      toast.success('Note ajoutée', {
        description: 'La note a été enregistrée avec succès.',
        duration: 2000,
      })
    } catch (error) {
      console.error('[Add Note] Error:', error)
      
      // Remove optimistic note on error
      setLocalNotes(prev => prev.filter(n => n.id !== optimisticNote.id))
      isAddingNoteRef.current = false // Reset flag on error
      
      // Show error toast
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Impossible d\'ajouter la note. Veuillez réessayer.',
        duration: 3000,
      })
    } finally {
      setIsSavingNote(false)
    }
  }

  // Filter out system-generated notes, only show manually added notes
  const systemNotePatterns = [
    /^Architecte assigné/i,
    /^Gestionnaire assigné/i,
    /^Opportunité créée/i,
    /^Contact converti en Client/i,
    /^Contact créé depuis Lead/i,
    /^Statut changé/i,
    /^Lead créé par/i,
    /statut.*mis à jour/i,
    /déplacé/i,
    /mouvement/i,
    /Note de campagne/i,
    /^📝 Note de campagne/i,
    /^✉️ Message WhatsApp envoyé/i,
    /^📅 Nouveau rendez-vous/i,
    /^✅ Statut mis à jour/i,
  ];

  // Helper function to identify "prise de besoin" notes
  const identifyPriseDeBesoinNotes = (notes: any[]): any[] => {
    if (!client.historique || !Array.isArray(client.historique)) {
      return notes;
    }

    // Find historique entries where status changed to "prise_de_besoin"
    const priseDeBesoinEntries = client.historique.filter((entry: any) => {
      const metadata = entry.metadata || {};
      const description = (entry.description || '').toLowerCase();
      
      return (
        (entry.type === 'statut' || entry.type === 'note') &&
        (metadata.newStatus === 'prise_de_besoin' || 
         description.includes('prise de besoin') ||
         description.includes('prise_de_besoin') ||
         description.includes('statut mis à jour:') && description.includes('prise de besoin')) &&
        (metadata.notes || entry.description)
      );
    });

    // Match notes with historique entries by content and approximate date
    return notes.map(note => {
      const noteContent = (note.description || '').trim().toLowerCase();
      const noteDate = new Date(note.date);

      // Check if this note matches any prise de besoin entry
      const isPriseDeBesoin = priseDeBesoinEntries.some((entry: any) => {
        const entryNotes = (entry.metadata?.notes || entry.description || '').trim().toLowerCase();
        const entryDate = new Date(entry.date);
        
        // Match by content similarity (exact match or contains)
        const contentMatches = entryNotes === noteContent || 
                              noteContent.includes(entryNotes) ||
                              entryNotes.includes(noteContent) ||
                              // Also match if note content is just "confirmer" and entry mentions prise de besoin
                              (noteContent === 'confirmer' && entryNotes.includes('prise de besoin'));
        
        // Match by date (within 5 minutes of historique entry)
        const timeDiff = Math.abs(noteDate.getTime() - entryDate.getTime());
        const dateMatches = timeDiff < 5 * 60 * 1000; // 5 minutes tolerance

        return contentMatches && dateMatches;
      });

      // Check if this is an opportunity note
      const isOpportunityNote = note.description?.trim().startsWith('[Opportunité:') || 
                                note.source === 'opportunity' ||
                                (note as any).metadata?.source === 'opportunity' ||
                                (note as any).metadata?.opportunityId;

      return {
        ...note,
        isPriseDeBesoin: isPriseDeBesoin,
        isOpportunityNote: isOpportunityNote,
      };
    });
  };

  // Combine unified notes with local notes (from historique), filter system notes, and show ONLY notes (type === 'note')
  const allNotesRaw = [
    ...unifiedNotes.map(note => ({
      id: note.id,
      date: note.createdAt,
      type: 'note' as const,
      description: note.content,
      auteur: note.createdBy,
      source: note.source,
      metadata: (note as any).metadata,
    })),
    ...localNotes.map(note => ({
      ...note,
      metadata: (note as any).metadata,
    })) // Use local notes state for immediate UI updates
  ]
    .filter((note) => {
      const description = note.description?.trim() || '';
      // Exclude empty notes
      if (!description) return false;
      // Exclude system-generated notes
      return !systemNotePatterns.some(pattern => pattern.test(description));
    })
    // Deduplicate by content + author + date
    .filter((note, index, self) => {
      const key = `${note.description?.trim().toLowerCase()}|${note.auteur}|${new Date(note.date).setSeconds(0, 0)}`;
      return index === self.findIndex(n => {
        const nKey = `${n.description?.trim().toLowerCase()}|${n.auteur}|${new Date(n.date).setSeconds(0, 0)}`;
        return nKey === key;
      });
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Identify prise de besoin and opportunity notes
  const allNotes = identifyPriseDeBesoinNotes(allNotesRaw)

  return (
    <div className="bg-[#171B22] rounded-lg border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-xs font-light text-white/90 mb-0.5 tracking-wide uppercase">Notes</h2>
          <p className="text-[9px] text-white/40 font-light">Notes ajoutées manuellement</p>
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
                  disabled={!newNote.trim() || isSavingNote}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingNote ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
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

      {isLoadingNotes ? (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-white/30 animate-pulse" />
          </div>
          <p className="text-white/50 text-xs font-light">Chargement des notes...</p>
        </div>
      ) : allNotes.length > 0 ? (
        <div className="space-y-2.5">
          {allNotes.map((note, index) => {
            const isPriseDeBesoin = note.isPriseDeBesoin || false;
            const isOpportunityNote = note.isOpportunityNote || false;
            
            // Extract opportunity title and details if it's an opportunity note
            let opportunityTitle = '';
            let noteContent = note.description || '';
            let hasOpportunityPrefix = false;
            
            if (isOpportunityNote && note.description?.includes('[Opportunité:')) {
              hasOpportunityPrefix = true;
              const match = note.description.match(/\[Opportunité:\s*([^\]]+)\]/);
              if (match) {
                opportunityTitle = match[1].trim();
                // Remove the [Opportunité: title] prefix and clean up
                noteContent = note.description.replace(/\[Opportunité:\s*[^\]]+\]\s*/, '').trim();
                // If noteContent is empty after removing prefix, it means the description was just the title
                if (!noteContent) {
                  noteContent = 'Détails de l\'opportunité';
                }
              }
            } else if (isOpportunityNote && !note.description?.includes('[Opportunité:')) {
              // Opportunity note without prefix - might be from metadata
              opportunityTitle = (note as any).metadata?.opportunityTitle || 'Opportunité';
            }

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-md p-3 transition-colors ${
                  isPriseDeBesoin
                    ? 'bg-purple-500/8 border border-purple-500/30 hover:bg-purple-500/12 hover:border-purple-500/40'
                    : isOpportunityNote
                    ? 'bg-blue-500/8 border border-blue-500/30 hover:bg-blue-500/12 hover:border-blue-500/40'
                    : 'bg-white/3 border border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isPriseDeBesoin
                      ? 'bg-purple-500/20'
                      : isOpportunityNote
                      ? 'bg-blue-500/20'
                      : 'bg-blue-500/15'
                  }`}>
                    {isPriseDeBesoin ? (
                      <FileText className="w-3 h-3 text-purple-300" />
                    ) : isOpportunityNote ? (
                      <Briefcase className="w-3 h-3 text-blue-300" />
                    ) : (
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-light ${
                        isPriseDeBesoin ? 'text-purple-200/80' : isOpportunityNote ? 'text-blue-200/80' : 'text-white/70'
                      }`}>
                        {note.auteur}
                      </span>
                      <span className={`text-[10px] ${
                        isPriseDeBesoin ? 'text-purple-500/40' : isOpportunityNote ? 'text-blue-500/40' : 'text-white/30'
                      }`}>•</span>
                      <span className={`text-[10px] font-light ${
                        isPriseDeBesoin ? 'text-purple-200/60' : isOpportunityNote ? 'text-blue-200/60' : 'text-white/40'
                      }`}>
                        {new Date(note.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isPriseDeBesoin && (
                        <>
                          <span className={`text-[10px] ${
                            isPriseDeBesoin ? 'text-purple-500/40' : 'text-white/30'
                          }`}>•</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/25 text-purple-200 text-[9px] font-medium">
                            <FileText className="w-2.5 h-2.5" />
                            Prise de Besoin
                          </span>
                        </>
                      )}
                      {isOpportunityNote && (
                        <>
                          <span className={`text-[10px] ${
                            isOpportunityNote ? 'text-blue-500/40' : 'text-white/30'
                          }`}>•</span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-blue-200 text-[9px] font-medium">
                            <Briefcase className="w-2.5 h-2.5" />
                            {opportunityTitle ? (
                              <span className="max-w-[200px] truncate" title={opportunityTitle}>
                                {opportunityTitle}
                              </span>
                            ) : (
                              'Opportunité'
                            )}
                          </span>
                        </>
                      )}
                      {note.source === 'lead' && !isPriseDeBesoin && !isOpportunityNote && (
                        <>
                          <span className="text-[10px] text-white/30">•</span>
                          <span className="text-[10px] text-purple-400/70 font-light">Lead</span>
                        </>
                      )}
                    </div>
                    {isOpportunityNote && opportunityTitle && hasOpportunityPrefix && (
                      <div className="mb-1.5">
                        <p className="text-[10px] font-medium text-blue-300/80 mb-0.5">
                          Détails de l'opportunité:
                        </p>
                      </div>
                    )}
                    <p className={`text-xs leading-relaxed font-light ${
                      isPriseDeBesoin ? 'text-purple-50/90' : isOpportunityNote ? 'text-blue-50/90' : 'text-white/80'
                    }`}>
                      {noteContent || note.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-white/30" />
          </div>
          <p className="text-white/50 text-xs font-light">Aucune note pour le moment</p>
        </div>
      )}
    </div>
  )
}
