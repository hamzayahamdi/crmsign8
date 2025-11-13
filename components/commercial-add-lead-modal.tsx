"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { LeadsService } from "@/lib/leads-service"
import { Phone, MapPin, Home, Building2, User, UserPlus } from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { TasksService } from "@/lib/tasks-service"

interface CommercialAddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadAdded: () => void
  commercialName: string
  magasin?: string
}

const MOROCCAN_CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès", 
  "Oujda", "Kenitra", "Tétouan", "Safi", "Temara", "Mohammedia", "Khouribga",
  "El Jadida", "Béni Mellal", "Nador", "Taza", "Settat", "Ksar El Kebir",
  "Larache", "Khemisset", "Guelmim", "Berrechid", "Berkane", "Taourirt",
  "Bouskoura", "Dar Bouazza"
]

const PROPERTY_TYPES = [
  "Appartement",
  "Villa",
  "Terrain",
  "Bureau",
  "Local commercial",
  "Riad",
  "Autre"
]

const MAGASINS = [
  "Casa",
  "Rabat",
  "Tanger",
  "Marrakech",
  "Bouskoura"
]

export function CommercialAddLeadModal({
  open,
  onOpenChange,
  onLeadAdded,
  commercialName,
  magasin
}: CommercialAddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    ville: "",
    typeBien: "",
    magasin: magasin || "",
    message: ""
  })

  // Optional task creation state
  const [createTask, setCreateTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskAssignedTo, setTaskAssignedTo] = useState("")
  const [users, setUsers] = useState<string[]>([])

  // Load users when modal opens for assignment options
  useEffect(() => {
    if (!open) return
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const names = (Array.isArray(data) ? data : []).map((u: any) => (u?.name || '').trim()).filter((n: string) => n)
          setUsers(names)
        }
      } catch {}
    }
    loadUsers()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.nom.trim()) {
      toast.error("Veuillez saisir le nom complet")
      return
    }
    if (!formData.telephone.trim()) {
      toast.error("Veuillez saisir le numéro de téléphone")
      return
    }
    if (!formData.ville) {
      toast.error("Veuillez sélectionner une ville")
      return
    }
    if (!formData.typeBien) {
      toast.error("Veuillez sélectionner un type de bien")
      return
    }
    if (!formData.magasin) {
      toast.error("Veuillez sélectionner un magasin")
      return
    }

    setLoading(true)
    try {
      const createdLead = await LeadsService.createLead({
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        ville: formData.ville,
        typeBien: formData.typeBien,
        statut: "nouveau",
        statutDetaille: "Nouveau lead",
        message: formData.message.trim() || undefined,
        assignePar: "Non assigné",
        source: "magasin",
        priorite: "moyenne",
        magasin: formData.magasin,
        commercialMagasin: commercialName,
        createdBy: commercialName,
        derniereMaj: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast.success("✅ Lead ajouté avec succès !", {
        description: `${formData.nom} a été ajouté à votre liste`
      })

      // Optionally create a task and assign to someone
      if (createTask) {
        try {
          const dueIso = taskDueDate ? new Date(taskDueDate).toISOString() : new Date().toISOString()
          const title = taskTitle?.trim() || `Suivi lead: ${formData.nom}`
          const assigned = taskAssignedTo?.trim() || commercialName
          await TasksService.createTask({
            title,
            description: formData.message?.trim() || `Suivi initial pour le lead ${formData.nom}`,
            dueDate: dueIso,
            assignedTo: assigned,
            linkedType: 'lead',
            linkedId: createdLead.id,
            linkedName: formData.nom,
            status: 'a_faire',
            reminderEnabled: true,
            reminderDays: 1,
            createdBy: commercialName,
          } as any)
          toast.success('📌 Tâche créée et assignée')
        } catch (err) {
          console.error('Error creating task from lead modal:', err)
          toast.error("La tâche n'a pas pu être créée")
        }
      }

      // Reset form
      setFormData({
        nom: "",
        telephone: "",
        ville: "",
        typeBien: "",
        magasin: magasin || "",
        message: ""
      })
      setCreateTask(false)
      setTaskTitle("")
      setTaskDueDate("")
      setTaskAssignedTo("")

      onLeadAdded()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating lead:", error)
      toast.error("Erreur lors de l'ajout du lead", {
        description: "Veuillez réessayer"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      nom: "",
      telephone: "",
      ville: "",
      typeBien: "",
      magasin: magasin || "",
      message: ""
    })
    setCreateTask(false)
    setTaskTitle("")
    setTaskDueDate("")
    setTaskAssignedTo("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass border-border/40">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            Créer un lead
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Nom complet */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Nom complet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Ahmed Benali"
              className="h-11"
              required
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              Téléphone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telephone"
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              placeholder="Ex: 0612345678"
              className="h-11"
              required
            />
          </div>

          {/* Ville */}
          <div className="space-y-2">
            <Label htmlFor="ville" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Ville <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.ville} onValueChange={(value) => setFormData({ ...formData, ville: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionner une ville" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {MOROCCAN_CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de bien */}
          <div className="space-y-2">
            <Label htmlFor="typeBien" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              Type de bien <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.typeBien} onValueChange={(value) => setFormData({ ...formData, typeBien: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Magasin */}
          <div className="space-y-2">
            <Label htmlFor="magasin" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Magasin <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.magasin} onValueChange={(value) => setFormData({ ...formData, magasin: value })}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionner un magasin" />
              </SelectTrigger>
              <SelectContent>
                {MAGASINS.map((mag) => (
                  <SelectItem key={mag} value={mag}>
                    {mag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commercial (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Commercial
            </Label>
            <Input
              value={commercialName}
              disabled
              className="h-11 bg-gray-50 text-gray-600"
            />
          </div>

          {/* Message (optional) */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-gray-700">
              Message ou notes (optionnel)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Informations complémentaires..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Optional Task Creation */}
          <div className="space-y-3 border rounded-lg p-4 bg-white/50 border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-800">Créer une tâche de suivi</Label>
              <input
                type="checkbox"
                checked={createTask}
                onChange={(e) => setCreateTask(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
            </div>

            {createTask && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm text-gray-700">Titre de la tâche</Label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder={`Suivi lead: ${formData.nom || ''}`}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" /> Échéance
                  </Label>
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Assigné à</Label>
                  <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={commercialName || 'Sélectionner'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(users.length ? users : [commercialName]).filter(Boolean).map((u) => (
                        <SelectItem key={u as string} value={u as string}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 h-12 border-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-semibold transition-all duration-200"
            >
              ❌ Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 font-semibold transition-all duration-200"
            >
              {loading ? "Enregistrement..." : "✅ Enregistrer le Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
