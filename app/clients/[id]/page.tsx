"use client"

import { useState, useEffect } from "react"
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
import { DevisPaiementTracker } from "@/components/client-details/devis-paiement-tracker"
import { NotesActivitiesSection } from "@/components/client-details/notes-activities-section"
import { ProjectProgressCard } from "@/components/client-details/project-progress-card"
import { QuickActionsSidebar } from "@/components/client-details/quick-actions-sidebar"
import { EnhancedTimeline } from "@/components/enhanced-timeline"
import { AddRdvModal } from "@/components/add-rdv-modal"
import { UpcomingRdvBanner } from "@/components/upcoming-rdv-banner"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id as string
  
  // Use Zustand store for real-time sync
  const { getClientById, updateClient: updateClientInStore, deleteClient: deleteClientFromStore, refreshClients } = useClientStore()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRdvModalOpen, setIsRdvModalOpen] = useState(false)

  useEffect(() => {
    // Refresh from store
    refreshClients()
    const foundClient = getClientById(clientId)
    setClient(foundClient || null)
    setIsLoading(false)
  }, [clientId, getClientById, refreshClients])

  // Listen for store updates
  useEffect(() => {
    const unsubscribe = useClientStore.subscribe((state) => {
      const updatedClient = state.clients.find(c => c.id === clientId)
      if (updatedClient) {
        setClient(updatedClient)
      }
    })
    return unsubscribe
  }, [clientId])

  const handleUpdateClient = (updatedClient: Client) => {
    // Update in Zustand store (will sync to all views)
    updateClientInStore(updatedClient.id, updatedClient)
    setClient(updatedClient)
  }

  const handleDeleteClient = () => {
    if (!client) return
    
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le client "${client.nom}" ?`
    )
    
    if (confirmDelete) {
      // Delete from Zustand store (will sync to all views)
      deleteClientFromStore(client.id)
      
      toast({
        title: "Client supprimé",
        description: `Le client "${client.nom}" a été supprimé avec succès`,
      })
      
      router.push("/clients")
    }
  }

  const handleAddRdv = async (rdv: Omit<import('@/types/client').Appointment, "id" | "createdAt" | "updatedAt">) => {
    if (!client) return

    try {
      const now = new Date().toISOString()
      const newRdv: import('@/types/client').Appointment = {
        ...rdv,
        id: `rdv-${Date.now()}`,
        createdAt: now,
        updatedAt: now
      }

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
          assignedTo: rdv.createdBy || 'current-user',
          location: rdv.location || '',
          reminderType: 'one_day_before',
          linkedClientId: client.id,
        })
      })

      if (!calendarEventResponse.ok) {
        throw new Error('Failed to create calendar event')
      }

      // 2. Update client with new RDV
      const updatedClient = {
        ...client,
        rendezVous: [newRdv, ...(client.rendezVous || [])],
        derniereMaj: now,
        updatedAt: now
      }

      handleUpdateClient(updatedClient)
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

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-[#0D0D12]">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-white">Chargement...</div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  if (!client) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen bg-[#0D0D12]">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Client non trouvé</h2>
                <Button onClick={() => router.push("/clients")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux clients
                </Button>
              </div>
            </div>
          </main>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#0D0D12]">
        <Sidebar />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
          {/* Back Button */}
          <div className="px-8 pt-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/clients")}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux clients
            </Button>
          </div>

          {/* Upcoming RDV Banner */}
          {client.rendezVous && client.rendezVous.length > 0 && (
            <UpcomingRdvBanner appointments={client.rendezVous} />
          )}

          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-[#0D0D12]/95 backdrop-blur-lg border-b border-white/5">
            <ClientDetailsHeader 
              client={client}
              onUpdate={handleUpdateClient}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content (70%) */}
                <div className="lg:col-span-2 space-y-6">
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
                    <DevisPaiementTracker 
                      client={client}
                      onUpdate={handleUpdateClient}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <ProjectProgressCard 
                      client={client}
                      onUpdate={handleUpdateClient}
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
      </div>
    </AuthGuard>
  )
}
