"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Lead } from "@/types/lead"
import { LeadsService } from "@/lib/leads-service"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CommercialAddLeadModal } from "@/components/commercial-add-lead-modal"
import { CommercialLeadsTable } from "@/components/commercial-leads-table"
import { LeadModalRedesigned } from "@/components/lead-modal-redesigned"
import { Plus, Building2, TrendingUp, Users, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

export default function CommercialDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Redirect if not commercial
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "commercial")) {
      router.push("/")
    }
  }, [user, authLoading, router])

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true)
      const response = await LeadsService.getLeads({ page: 1, limit: 1000 })
      setLeads(response.data)
    } catch (error) {
      console.error("Error fetching leads:", error)
      toast.error("Erreur lors du chargement des leads")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === "commercial") {
      fetchLeads()
    }
  }, [user])

  const handleLeadAdded = () => {
    fetchLeads()
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setViewModalOpen(true)
  }

  const handleSaveLead = async (updatedLead: Omit<Lead, "id"> & { id?: string }) => {
    try {
      if (updatedLead.id) {
        // Check if this lead was converted and status is being changed
        const wasConverted = selectedLead?.statut === 'qualifie'
        const statusChanged = updatedLead.statut !== 'qualifie'
        
        const updated = await LeadsService.updateLead(updatedLead.id, updatedLead)
        
        // If lead was converted but status changed, remove associated client from localStorage
        if (wasConverted && statusChanged) {
          try {
            const storedClients = localStorage.getItem('signature8-clients')
            if (storedClients) {
              const clients = JSON.parse(storedClients)
              const filteredClients = clients.filter((client: any) => client.leadId !== updatedLead.id)
              
              if (filteredClients.length < clients.length) {
                localStorage.setItem('signature8-clients', JSON.stringify(filteredClients))
                console.log(`[Commercial] Removed client associated with lead ${updatedLead.id} from localStorage`)
                toast.success("Conversion annulée - Client retiré de la liste")
              }
            }
          } catch (err) {
            console.error('[Commercial] Error removing client from localStorage:', err)
          }
        }
        
        // Update the leads list immediately
        setLeads(prevLeads => 
          prevLeads.map(lead => lead.id === updated.id ? updated : lead)
        )
        
        // Update selected lead to show new status
        setSelectedLead(updated)
        
        toast.success("Lead mis à jour avec succès")
        setViewModalOpen(false)
        
        // Refresh to ensure sync with server
        await fetchLeads()
      }
    } catch (error) {
      console.error("Error updating lead:", error)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (user.role !== "commercial") {
    return null
  }

  const stats = [
    {
      title: "Total Leads",
      value: leads.length,
      icon: Users,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-slate-800/80 to-slate-700/80",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30"
    },
    {
      title: "Nouveaux",
      value: leads.filter(l => l.statut === "nouveau").length,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-slate-800/80 to-slate-700/80",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/30"
    },
    {
      title: "Magasin",
      value: user.magasin || "Non défini",
      icon: Building2,
      gradient: "from-purple-500 to-fuchsia-600",
      bgGradient: "from-slate-800/80 to-slate-700/80",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/30",
      isText: true
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="glass border-b border-white/10 backdrop-blur-xl bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/infnite-logo.png" alt="Infinite Logo" className="h-12 w-12 object-contain" />
                <h1 className="text-3xl font-bold text-white">
                  Tableau de bord Commercial
                </h1>
              </div>
              <p className="text-slate-300 ml-15">
                <span className="font-semibold text-white">{user.name}</span>
                {user.magasin && (
                  <>
                    {" — "}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/30">
                      <Building2 className="h-3.5 w-3.5" />
                      Magasin {user.magasin}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setAddModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 h-12 px-8 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-200 text-white font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau Lead
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem("token")
                  router.push("/login")
                }}
                variant="outline"
                className="h-12 px-6 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 font-semibold"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className={`bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} overflow-hidden backdrop-blur-xl`}>
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <p className="text-4xl font-bold text-white">
                      {stat.isText ? stat.value : stat.value}
                    </p>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shadow-${stat.iconColor.split('-')[1]}-500/30`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Leads Section */}
        <div className="rounded-3xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-gradient-to-br from-slate-800/90 to-slate-700/90">
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Mes Leads
                  <span className="text-sm font-normal text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/50">
                    {leads.length}
                  </span>
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Liste de tous les leads que vous avez soumis
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : (
              <CommercialLeadsTable leads={leads} onViewLead={handleViewLead} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CommercialAddLeadModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onLeadAdded={handleLeadAdded}
        commercialName={user.name}
        magasin={user.magasin}
      />

      {selectedLead && (
        <LeadModalRedesigned
          lead={selectedLead}
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          onSave={handleSaveLead}
          currentUserRole={user.role}
          currentUserName={user.name}
          currentUserMagasin={user.magasin}
        />
      )}
    </div>
  )
}
