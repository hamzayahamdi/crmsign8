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
import { Phone, MapPin, Home, Building2, User, UserPlus, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
 

interface MagasinerAddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadAdded: () => void
  magasinerName: string
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
  "Villa",
  "Appartement",
  "B2B",
  "autre",
]

export function MagasinerAddLeadModal({
  open,
  onOpenChange,
  onLeadAdded,
  magasinerName,
  magasin
}: MagasinerAddLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    ville: "",
    typeBien: "",
    commercialName: "",
    message: ""
  })

  

  

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
    if (!formData.commercialName.trim()) {
      toast.error("Veuillez saisir le nom du commercial")
      return
    }
    if (!magasin) {
      toast.error("Magasin non défini")
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
        magasin: magasin,
        commercialMagasin: formData.commercialName.trim(),
        createdBy: magasinerName,
        derniereMaj: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast.success("✅ Lead ajouté avec succès !", {
        description: `${formData.nom} a été ajouté à votre liste`
      })

      

      // Reset form
      setFormData({
        nom: "",
        telephone: "",
        ville: "",
        typeBien: "",
        commercialName: "",
        message: ""
      })
      

      onLeadAdded()
      onOpenChange(false)
    } catch (error) {
      console.error("Error creating lead:", error)
      toast.error("⚠️ Erreur lors de l'ajout du lead", {
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
      commercialName: "",
      message: ""
    })
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="sm:max-w-[840px] max-h-[92vh] overflow-y-auto glass bg-slate-900/90 border border-white/10 ring-1 ring-white/10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  Créer un lead
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Remplissez les informations du client pour créer un nouveau lead
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom complet */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.03, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label htmlFor="nom" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Nom complet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: Ahmed Benali"
                    className="h-11 glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                    required
                  />
                </motion.div>

                {/* Téléphone */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label htmlFor="telephone" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Téléphone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="Ex: 0612345678"
                    className="h-11 glass border-border/40 rounded-xl bg-background/60 text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </motion.div>

                {/* Ville */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.07, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label htmlFor="ville" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Ville <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.ville} onValueChange={(value) => setFormData({ ...formData, ville: value })}>
                    <SelectTrigger className="h-11 glass rounded-xl bg-white/10 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40">
                      <SelectValue placeholder="Sélectionner une ville" className="placeholder:text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] glass bg-slate-900/95 border border-white/10">
                      {MOROCCAN_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Type de bien */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.09, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label htmlFor="typeBien" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Type de bien <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.typeBien} onValueChange={(value) => setFormData({ ...formData, typeBien: value })}>
                    <SelectTrigger className="h-11 glass rounded-xl bg-white/10 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40">
                      <SelectValue placeholder="Sélectionner un type" className="placeholder:text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent className="glass bg-slate-900/95 border border-white/10">
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Magasin (read-only) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.11, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Magasin
                  </Label>
                  <Input
                    value={magasin || "Non défini"}
                    disabled
                    className="h-11 glass rounded-xl bg-white/10 border border-white/10 text-foreground"
                  />
                </motion.div>

                {/* Nom du commercial */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.13, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label htmlFor="commercialName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Nom du commercial <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="commercialName"
                    value={formData.commercialName}
                    onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                    placeholder="Ex: Mohamed Alami"
                    className="h-11 glass border-border/40 rounded-xl bg-background/60 text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nom du commercial qui a soumis ce lead
                  </p>
                </motion.div>

                {/* Date de création (auto-generated, display only) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date de création
                  </Label>
                  <Input
                    value={new Date().toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                    disabled
                    className="h-11 glass rounded-xl bg-white/10 border border-white/10 text-muted-foreground"
                  />
                </motion.div>

                {/* Message (optional) */}
                <motion.div
                  className="md:col-span-2 space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.17, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                >
                  <Label htmlFor="message" className="text-sm font-semibold text-foreground">
                    Message ou notes (optionnel)
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Informations complémentaires..."
                    className="min-h-[100px] resize-none glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                  />
                </motion.div>

                <motion.div
                  className="md:col-span-2 flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.19, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm font-medium bg-emerald-500/10 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Statut du lead: 🟢 Nouveau
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.23, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  className="flex gap-3 pt-6 border-t border-border/40 mt-6"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 h-11 glass border-border/40 hover:bg-destructive/10 hover:text-destructive font-semibold rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-11 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 shadow-primary/30 font-semibold rounded-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Enregistrement...
                      </span>
                    ) : (
                      "✅ Enregistrer le Lead"
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </motion.div>
        </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
