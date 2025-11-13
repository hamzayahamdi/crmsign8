
"use client"

import { useState, useEffect, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import type { Client } from "@/types/client"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { Header } from "@/components/header"
import { useClientStore } from "@/stores/client-store"
import { ClientDetailsHeader } from "@/components/client-details/client-details-header"
import { ClientOverviewCard } from "@/components/client-details/client-overview-card"
import { ProjectInformationCard } from "@/components/client-details/project-information-card"
import { FinancementDocumentsUnified } from "@/components/client-details/financement-documents-unified"
import { NotesActivitiesSection } from "@/components/client-details/notes-activities-section"
import { ProjectRoadmapCard } from "@/components/client-details/project-roadmap-card"
import { QuickActionsSidebar } from "@/components/client-details/quick-actions-sidebar"
import { EnhancedTimeline } from "@/components/enhanced-timeline"
import { AddRdvModal } from "@/components/add-rdv-modal"
import { AddTaskModal } from "@/components/add-task-modal"
import { UpcomingRdvBanner } from "@/components/upcoming-rdv-banner"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { getCurrentClientStage } from "@/lib/client-stage-service"

const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-[#0b1529] to-slate-950 overflow-x-hidden overflow-y-hidden">
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-1/3 right-[-18%] h-[26rem] w-[26rem] rounded-full bg-sky-500/15 blur-[140px]" />
      <div className="absolute bottom-[-30%] left-1/2 h-[28rem] w-[46rem] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[160px]" />
    </div>
    <div className="relative z-10 shrink-0">
      <Sidebar />
    </div>
    {children}
  </div>
)

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const clientId = params.id as string
  
  // Use Zustand store for real-time sync
  const { getClientById, updateClient: updateClientInStore, deleteClient: deleteClientFromStore, refreshClients } = useClientStore()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRdvModalOpen, setIsRdvModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  useEffect(() => {
    // Fetch full client data from API (includes devis, historique, etc.)
    const fetchClientData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/clients/${clientId}`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch client')
        }
        
        const result = await response.json()
        setClient(result.data)
        setIsLoading(false)
      } catch (error) {
        console.error('[Client Details] Error fetching client:', error)
        setIsLoading(false)
      }
    }
    
    fetchClientData()
  }, [clientId])

  // Listen for store updates (this handles kanban drag updates)
  useEffect(() => {
    const unsubscribe = useClientStore.subscribe((state) => {
      const updatedClient = state.clients.find(c => c.id === clientId)
      if (updatedClient) {
        // Merge store updates with existing client data (preserve devis, historique, etc.)
        setClient(prev => prev ? { ...prev, ...updatedClient } : updatedClient as Client)
      }
    })
    return unsubscribe
  }, [clientId])

  // Listen for devis updates from real-time sync
  useEffect(() => {
    const handleDevisUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Devis updated, refreshing...')
        // Re-fetch client data to get updated devis
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing devis:', error)
        }
      }
    }

    window.addEventListener('devis-updated' as any, handleDevisUpdate)
    return () => window.removeEventListener('devis-updated' as any, handleDevisUpdate)
  }, [clientId])

  // Listen for historique updates from real-time sync
  useEffect(() => {
    const handleHistoriqueUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Historique updated, refreshing...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing historique:', error)
        }
      }
    }

    window.addEventListener('historique-updated' as any, handleHistoriqueUpdate)
    return () => window.removeEventListener('historique-updated' as any, handleHistoriqueUpdate)
  }, [clientId])

  // Listen for appointment updates from real-time sync
  useEffect(() => {
    const handleAppointmentUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Appointment updated, refreshing...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing appointments:', error)
        }
      }
    }

    window.addEventListener('appointment-updated' as any, handleAppointmentUpdate)
    return () => window.removeEventListener('appointment-updated' as any, handleAppointmentUpdate)
  }, [clientId])

  // Listen for payment updates from real-time sync
  useEffect(() => {
    const handlePaymentUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Payment updated, refreshing...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            console.log('[Client Details] Refreshed client data after payment:', {
              statutProjet: result.data.statutProjet,
              paymentsCount: result.data.payments?.length || 0,
              clientId: result.data.id
            })
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing payments:', error)
        }
      }
    }

    window.addEventListener('payment-updated' as any, handlePaymentUpdate)
    return () => window.removeEventListener('payment-updated' as any, handlePaymentUpdate)
  }, [clientId])

  // Listen for document updates from real-time sync
  useEffect(() => {
    const handleDocumentUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Document updated, refreshing...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing documents:', error)
        }
      }
    }

    window.addEventListener('document-updated' as any, handleDocumentUpdate)
    return () => window.removeEventListener('document-updated' as any, handleDocumentUpdate)
  }, [clientId])

  // Listen for task updates from real-time sync
  useEffect(() => {
    const handleTaskUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Task updated, refreshing...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing tasks:', error)
        }
      }
    }

    window.addEventListener('task-updated' as any, handleTaskUpdate)
    return () => window.removeEventListener('task-updated' as any, handleTaskUpdate)
  }, [clientId])

  // Listen for stage updates from real-time sync
  useEffect(() => {
    const handleStageUpdate = async (event: CustomEvent) => {
      if (event.detail.clientId === clientId) {
        console.log('[Client Details] Stage updated, refreshing client data...')
        try {
          const response = await fetch(`/api/clients/${clientId}`, {
            credentials: 'include'
          })
          if (response.ok) {
            const result = await response.json()
            console.log('[Client Details] Refreshed after stage update:', {
              statutProjet: result.data.statutProjet,
              updatedAt: result.data.updatedAt
            })
            setClient(result.data)
          }
        } catch (error) {
          console.error('[Client Details] Error refreshing after stage update:', error)
        }
      }
    }

    window.addEventListener('stage-updated' as any, handleStageUpdate)
    return () => window.removeEventListener('stage-updated' as any, handleStageUpdate)
  }, [clientId])

  const handleUpdateClient = async (updatedClient: Client, skipApiCall = false) => {
    try {
      // If skipApiCall is true, just update local state (for optimistic updates)
      if (skipApiCall) {
        console.log('[Client Details] 🔄 Optimistic update - updating local state only')
        setClient(updatedClient)
        updateClientInStore(updatedClient.id, updatedClient)
        return
      }

      // 1. Update in database via API
      const response = await fetch(`/api/clients/${updatedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedClient)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update client')
      }

      const result = await response.json()
      console.log('[Client Details] ✅ Client updated in database:', result.data)
      console.log('[Client Details] 📊 New statutProjet:', result.data?.statutProjet)

      // 2. Update in Zustand store (will sync to all views)
      updateClientInStore(updatedClient.id, result.data || updatedClient)
      
      // 3. Update local state with FRESH data from API (includes updated statutProjet)
      setClient(result.data || updatedClient)

      // Success - no toast needed as components will show their own success messages
    } catch (error) {
      console.error('[Client Details] ❌ Error updating client:', error)
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder les modifications. Veuillez réessayer.",
        variant: "destructive"
      })
      
      // Revert local changes on error
      refreshClients()
      const revertedClient = getClientById(clientId)
      if (revertedClient) {
        setClient(revertedClient)
      }
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return
    
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le client "${client.nom}" ?`
    )
    
    if (confirmDelete) {
      try {
        // 1. Delete from database via API
        const response = await fetch(`/api/clients/${client.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete client')
        }

        console.log('[Client Details] ✅ Client deleted from database')

        // 2. Delete from Zustand store (will sync to all views)
        deleteClientFromStore(client.id)
        
        toast({
          title: "Client supprimé",
          description: `Le client "${client.nom}" a été supprimé avec succès`,
        })
        
        // 3. Redirect to clients list
        router.push("/clients")
      } catch (error) {
        console.error('[Client Details] ❌ Error deleting client:', error)
        toast({
          title: "Erreur de suppression",
          description: "Impossible de supprimer le client. Veuillez réessayer.",
          variant: "destructive"
        })
      }
    }
  }

  const handleAddRdv = async (rdv: Omit<import('@/types/client').Appointment, "id" | "createdAt" | "updatedAt">) => {
    if (!client) return

    try {
      const now = new Date().toISOString()

      // 1. Create event in calendar database
      const calendarEventResponse = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: rdv.title,
          description: rdv.notes || '',
          startDate: rdv.dateStart,
          endDate: rdv.dateEnd,
          eventType: 'rendez_vous',
          assignedTo: user?.id || '',
          location: rdv.location || '',
          reminderType: 'day_1',
          linkedClientId: client.id,
        })
      })

      if (!calendarEventResponse.ok) {
        const errorData = await calendarEventResponse.json()
        console.error('Calendar API error:', errorData)
        throw new Error(errorData.error || 'Failed to create calendar event')
      }

      // 2. Create appointment in appointments table for real-time sync
      const appointmentResponse = await fetch(`/api/clients/${client.id}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: rdv.title,
          dateStart: rdv.dateStart,
          dateEnd: rdv.dateEnd,
          description: rdv.notes || '',
          location: rdv.location || '',
          locationUrl: rdv.locationUrl || '',
          notes: rdv.notes || '',
          createdBy: user?.name || 'Utilisateur',
          clientName: client.nom
        })
      })

      if (!appointmentResponse.ok) {
        const errorData = await appointmentResponse.json()
        console.error('Appointment API error:', errorData)
        throw new Error(errorData.error || 'Failed to create appointment')
      }

      const appointmentResult = await appointmentResponse.json()
      console.log('[Add RDV] ✅ Appointment created in database:', appointmentResult.data)

      // 3. Re-fetch client data to get updated appointments
      const clientResponse = await fetch(`/api/clients/${client.id}`, {
        credentials: 'include'
      })
      
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        setClient(clientResult.data)
      }
      
      setIsRdvModalOpen(false)

      toast({
        title: "RDV créé",
        description: `Le rendez-vous "${rdv.title}" a été ajouté au calendrier et synchronisé`,
      })
    } catch (error) {
      console.error('Error creating RDV:', error)
      toast({
        title: "Erreur",
        description: "Impossible de créer le rendez-vous. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  const handleSaveTask = async (taskData: Omit<import('@/types/task').Task, "id" | "createdAt" | "updatedAt" | "createdBy">) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...taskData,
          linkedType: 'client',
          linkedId: client?.id,
          linkedName: client?.nom,
          createdBy: user?.name || 'Utilisateur',
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      const result = await response.json()
      console.log('[Add Task] ✅ Task created in database:', result.data)

      // Re-fetch client data to get updated tasks/historique
      const clientResponse = await fetch(`/api/clients/${client?.id}`, {
        credentials: 'include'
      })
      
      if (clientResponse.ok) {
        const clientResult = await clientResponse.json()
        setClient(clientResult.data)
      }

      setIsTaskModalOpen(false)
      toast({
        title: "Tâche créée",
        description: `La tâche "${taskData.title}" a été créée avec succès`,
      })
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "Erreur",
        description: "Impossible de créer la tâche. Veuillez réessayer.",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <PageShell>
          <main className="relative z-10 flex-1 flex items-center justify-center">
            <div className="text-slate-200 animate-pulse">Chargement...</div>
          </main>
        </PageShell>
      </AuthGuard>
    )
  }

  if (!client) {
    return (
      <AuthGuard>
        <PageShell>
          <main className="relative z-10 flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center px-6 pb-10">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">Client non trouvé</h2>
                <Button
                  onClick={() => router.push("/clients")}
                  className="px-4 py-2 bg-primary/90 hover:bg-primary text-white shadow-lg shadow-primary/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux clients
                </Button>
              </div>
            </div>
          </main>
        </PageShell>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <PageShell>
        <>
          <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <Header />
          
          {/* Back Button */}
          <div className="px-8 pt-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/clients")}
                className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white/90 shadow-lg shadow-black/10"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Retour aux clients
            </Button>
          </div>

          {/* Upcoming RDV Banner */}
          {client.rendezVous && client.rendezVous.length > 0 && (
              <div className="px-8 pt-4">
            <UpcomingRdvBanner appointments={client.rendezVous} />
              </div>
          )}

          {/* Sticky Header */}
            <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-[0_12px_50px_rgba(15,23,42,0.35)]">
            <ClientDetailsHeader 
              client={client}
              onUpdate={handleUpdateClient}
            />
          </div>

          {/* Main Content Area */}
            <div className="relative flex-1 overflow-y-auto custom-scrollbar">
              <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
                <div className="absolute top-28 right-12 h-64 w-64 rounded-full bg-sky-500/12 blur-[120px]" />
                <div className="absolute bottom-[-25%] left-16 h-72 w-72 rounded-full bg-purple-600/12 blur-[140px]" />
              </div>

              <div className="relative z-10 px-8 py-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
                {/* Left Column - Main Content (70%) */}
                  <div className="space-y-6 lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <ClientOverviewCard 
                      client={client}
                      onUpdate={handleUpdateClient}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ProjectInformationCard 
                      client={client}
                      onUpdate={handleUpdateClient}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <FinancementDocumentsUnified 
                      client={client}
                      onUpdate={handleUpdateClient}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <ProjectRoadmapCard 
                      client={client}
                      onUpdate={handleUpdateClient}
                      onAddTask={() => setIsTaskModalOpen(true)}
                      onAddRdv={() => setIsRdvModalOpen(true)}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <NotesActivitiesSection 
                      client={client}
                      onUpdate={handleUpdateClient}
                    />
                  </motion.div>
                </div>

                {/* Right Column - Sidebar (30%) */}
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <QuickActionsSidebar 
                      client={client}
                      onUpdate={handleUpdateClient}
                      onDelete={handleDeleteClient}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <EnhancedTimeline 
                      client={client}
                      onAddRdv={() => setIsRdvModalOpen(true)}
                      showFilters={true}
                      maxItems={15}
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RDV Modal */}
        {client && (
          <AddRdvModal
            isOpen={isRdvModalOpen}
            onClose={() => setIsRdvModalOpen(false)}
            client={client}
            onAddRdv={handleAddRdv}
          />
        )}

        {/* Task Modal */}
        {client && (
          <AddTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            onSave={handleSaveTask}
            editingTask={null}
          />
        )}
        </>
      </PageShell>
    </AuthGuard>
  )
}
