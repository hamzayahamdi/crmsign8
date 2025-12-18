"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableSelect } from "@/components/creatable-select"
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

// Liste complète des villes du Maroc
const MOROCCAN_CITIES = [
  "Agadir",
  "Aïn Harrouda",
  "Aïn Taoujdate",
  "Aït Melloul",
  "Al Hoceïma",
  "Azemmour",
  "Azrou",
  "Béni Mellal",
  "Berkane",
  "Berrechid",
  "Boujdour",
  "Bouskoura",
  "Casablanca",
  "Chefchaouen",
  "Dakhla",
  "Dar Bouazza",
  "El Aaiún",
  "El Jadida",
  "Errachidia",
  "Essaouira",
  "Fès",
  "Guelmim",
  "Ifrane",
  "Imzouren",
  "Kénitra",
  "Khemisset",
  "Khouribga",
  "Ksar El Kebir",
  "Larache",
  "Marrakech",
  "Meknès",
  "Mohammedia",
  "Nador",
  "Ouarzazate",
  "Oujda",
  "Rabat",
  "Safi",
  "Salé",
  "Settat",
  "Sidi Bennour",
  "Sidi Ifni",
  "Sidi Kacem",
  "Sidi Slimane",
  "Skhirat",
  "Tanger",
  "Taourirt",
  "Taroudant",
  "Taza",
  "Témara",
  "Tétouan",
  "Tifelt",
  "Tiznit",
  "Youssoufia",
  "Zagora",
]

const PROPERTY_TYPES = [
  "Villa",
  "Appartement",
  "Duplex",
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
  const [villes, setVilles] = useState<string[]>(MOROCCAN_CITIES)
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
        assignePar: "Mohamed",
        source: "magasin",
        priorite: "haute",
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
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[840px] max-h-[90vh] overflow-y-auto glass bg-slate-900/90 border border-white/10 ring-1 ring-white/10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
            >
              <DialogHeader className="pb-3">
                <DialogTitle className="text-lg md:text-2xl font-bold text-white flex items-center gap-2.5">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30">
                    <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  Créer un lead
                </DialogTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
                  Remplissez les informations du client pour créer un nouveau lead
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-3 md:mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3.5">
                  {/* Nom complet */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.03, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="nom" className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Nom complet <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Ex: Ahmed Benali"
                      className="h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                      required
                    />
                  </motion.div>

                  {/* Téléphone */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="telephone" className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Téléphone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="telephone"
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="Ex: 0612345678"
                      className="h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                      required
                    />
                  </motion.div>

                  {/* Ville */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.07, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="ville" className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Ville <span className="text-red-500">*</span>
                    </Label>
                    <CreatableSelect
                      value={formData.ville}
                      onValueChange={(value) => setFormData({ ...formData, ville: value })}
                      options={villes}
                      placeholder="Choisir ou créer une ville..."
                      searchPlaceholder="Rechercher une ville..."
                      emptyText="Aucune ville trouvée"
                      onCreateNew={(newCity) => {
                        if (!villes.includes(newCity)) {
                          setVilles([...villes, newCity])
                        }
                      }}
                      className="h-9 md:h-10 glass rounded-xl bg-white/10 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                    />
                  </motion.div>

                  {/* Type de bien */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.09, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="typeBien" className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Type de bien <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.typeBien} onValueChange={(value) => setFormData({ ...formData, typeBien: value })}>
                      <SelectTrigger className="h-9 md:h-10 glass rounded-xl bg-white/10 border border-white/10 text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40">
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
                    className="space-y-1.5"
                  >
                    <Label className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Magasin
                    </Label>
                    <Input
                      value={magasin || "Non défini"}
                      disabled
                      className="h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border border-white/10 text-foreground"
                    />
                  </motion.div>

                  {/* Nom du commercial */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.13, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="commercialName" className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Nom du commercial <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="commercialName"
                      value={formData.commercialName}
                      onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                      placeholder="Ex: Mohamed Alami"
                      className="h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                      required
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground/70 mt-0.5">
                      Nom du commercial qui a soumis ce lead
                    </p>
                  </motion.div>

                  {/* Date de création (auto-generated, display only) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="space-y-1.5"
                  >
                    <Label className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                      Date de création
                    </Label>
                    <Input
                      value={new Date().toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                      disabled
                      className="h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border border-white/10 text-muted-foreground"
                    />
                  </motion.div>

                  {/* Message (optional) */}
                  <motion.div
                    className="md:col-span-2 space-y-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.17, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  >
                    <Label htmlFor="message" className="text-xs md:text-sm font-semibold text-foreground">
                      Message ou notes (optionnel)
                    </Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Informations complémentaires..."
                      className="min-h-[80px] md:min-h-[90px] text-sm md:text-base resize-none glass rounded-xl bg-white/10 border border-white/10 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                    />
                  </motion.div>

                  <motion.div
                    className="md:col-span-2 flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.19, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                  >
                    <span className="inline-flex items-center gap-1.5 md:gap-2 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 border text-xs md:text-sm font-medium bg-emerald-500/10 text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20">
                      <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-emerald-400" />
                      Statut du lead: 🟢 Nouveau
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.23, duration: 0.15, ease: [0.4, 0.0, 0.2, 1] }}
                    className="md:col-span-2 flex gap-2 md:gap-3 pt-4 md:pt-5 border-t border-border/40 mt-4 md:mt-5"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={loading}
                      className="flex-1 h-9 md:h-10 glass border-border/40 hover:bg-destructive/10 hover:text-destructive font-semibold rounded-xl text-xs md:text-sm"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-9 md:h-10 bg-gradient-to-r from-primary to-blue-500 hover:opacity-90 shadow-primary/30 font-semibold rounded-xl text-xs md:text-sm"
                    >
                      {loading ? (
                        <span className="flex items-center gap-1.5 md:gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full"
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
