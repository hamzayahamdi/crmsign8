"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Lead } from "@/types/lead"
import { LeadsService } from "@/lib/leads-service"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MagasinerAddLeadModal } from "@/components/magasiner-add-lead-modal"
import { MagasinerLeadsTable } from "@/components/magasiner-leads-table"
import { Plus, Building2, TrendingUp, Users, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"

export default function MagasinerDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    nom: "",
    telephone: "",
    ville: "",
    typeBien: "",
    commercialMagasin: "",
  })

  // Redirect if not magasiner
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "magasiner")) {
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
    if (user?.role === "magasiner") {
      fetchLeads()
    }
  }, [user])

  const handleLeadAdded = () => {
    fetchLeads()
  }

  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setEditForm({
      nom: lead.nom || "",
      telephone: lead.telephone || "",
      ville: lead.ville || "",
      typeBien: lead.typeBien || "",
      commercialMagasin: lead.commercialMagasin || "",
    })
  }

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editLead) return
    try {
      setEditLoading(true)
      await LeadsService.updateLead(editLead.id, {
        nom: editForm.nom,
        telephone: editForm.telephone,
        ville: editForm.ville,
        typeBien: editForm.typeBien,
        commercialMagasin: editForm.commercialMagasin,
      } as any)
      toast.success("Lead mis à jour")
      setEditLead(null)
      fetchLeads()
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la mise à jour")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteLead = async (lead: Lead) => {
    const ok = window.confirm(`Supprimer le lead ${lead.nom} ?`)
    if (!ok) return
    try {
      await LeadsService.deleteLead(lead.id)
      toast.success("Lead supprimé")
      fetchLeads()
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression")
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (user.role !== "magasiner") {
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

  // Get magasin emoji
  const getMagasinEmoji = (magasin?: string) => {
    if (!magasin) return "📍"
    const magasinLower = magasin.toLowerCase()
    if (magasinLower.includes("casa")) return "📍"
    if (magasinLower.includes("rabat")) return "📍"
    if (magasinLower.includes("tanger")) return "📍"
    if (magasinLower.includes("marrakech")) return "📍"
    if (magasinLower.includes("bouskoura")) return "📍"
    return "📍"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="glass border-b border-white/10 backdrop-blur-xl bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/infnite-logo.png" alt="Infinite Logo" className="h-12 w-12 object-contain" />
                <h1 className="text-3xl font-bold text-white">
                  Tableau de bord Magasiner
                </h1>
              </div>
              <p className="text-slate-300 ml-15">
                <span className="font-semibold text-white">{user.name}</span>
                {user.magasin && (
                  <>
                    {" — "}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium border border-blue-500/30">
                      <Building2 className="h-3.5 w-3.5" />
                      {getMagasinEmoji(user.magasin)} Magasin {user.magasin}
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  Liste de tous les leads de votre magasin
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
              <MagasinerLeadsTable leads={leads} onEdit={openEdit} onDelete={handleDeleteLead} />
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <MagasinerAddLeadModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onLeadAdded={handleLeadAdded}
        magasinerName={user.name}
        magasin={user.magasin}
      />

      {/* Edit Lead Dialog */}
      <Dialog open={!!editLead} onOpenChange={(o) => !o && setEditLead(null)}>
        <DialogContent className="sm:max-w-[600px] glass border-border/40">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateLead} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom" className="text-white">Nom complet</Label>
                <Input id="edit-nom" value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} className="glass border-border/40" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telephone" className="text-white">Téléphone</Label>
                <Input id="edit-telephone" value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })} className="glass border-border/40" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ville" className="text-white">Ville</Label>
                <Select value={editForm.ville} onValueChange={(v) => setEditForm({ ...editForm, ville: v })}>
                  <SelectTrigger className="glass border-border/40"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent className="glass border-border/40">
                    {[
                      "Casablanca","Rabat","Marrakech","Fès","Tanger","Agadir","Meknès","Oujda","Kenitra","Tétouan","Safi","Temara","Mohammedia","Khouribga","El Jadida","Béni Mellal","Nador","Taza","Settat","Ksar El Kebir","Larache","Khemisset","Guelmim","Berrechid","Berkane","Taourirt","Bouskoura","Dar Bouazza"
                    ].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-white">Type de bien</Label>
                <Select value={editForm.typeBien} onValueChange={(v) => setEditForm({ ...editForm, typeBien: v })}>
                  <SelectTrigger className="glass border-border/40"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent className="glass border-border/40">
                    {["Villa","Appartement","B2B","autre"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-commercial" className="text-white">Nom du commercial</Label>
                <Input id="edit-commercial" value={editForm.commercialMagasin} onChange={(e) => setEditForm({ ...editForm, commercialMagasin: e.target.value })} className="glass border-border/40" required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="glass border-border/40" onClick={() => setEditLead(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={editLoading} className="bg-gradient-to-r from-primary to-blue-500">
                {editLoading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
