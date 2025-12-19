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
import { Phone, MapPin, Home, Building2, User, UserPlus, Calendar, AlertCircle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"


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

// Mapping of cities to their respective commercial lists
const cityToCommercials: Record<string, string[]> = {
  "Casablanca": [
    "DARRHAL BOUTAINA",
    "BABYA ELMEHDI",
    "BENTALEB CHAIMAE",
    "EL KAMILI OUSSAMA",
    "EL RHITI HAJAR",
    "FADIL ZAKARIA",
    "JEKKI RAJAA",
    "LAHJAILY ISLAM",
    "TOUYMASNA REDA",
    "AMEZRARA JALAL",
    "BAJADI AMINE",
  ],
  "Rabat": [
    "HIMICH AISSAM",
    "BAZI MOHAMMED",
    "CHERRADI ZINEB",
    "DARROUS SAMIRA",
    "EKHLAF OTMANE",
    "EL BAOUSSI HANANE",
    "EL MESSAOUDI ISSAM",
    "ETTABAA OUMAIMA",
    "MOUSSAOUI OTHMAANE",
    "ROUGUIAGUE BRAHIM",
  ],
  "Marrakech": [
    "BOUCHEMAMA LAILA",
    "AMANE HAMZA",
    "ABOUTTAIB RANIA",
    "EL OURI HANANE",
    "BELHAJ FADOUA",
    "NAMIRA GHITA",
    "KAITOUNI IDRISSI ALI",
  ],
  "Tanger": [
    "NADI BOUKTIBA MOHAMMED",
    "BOUKTIBA MOHAMMED NAD",
    "CHRIF TAOUNATI HAMID",
    "EL AMRANI OUIAM",
    "ROUIJEL AYA",
  ],
  "Bouskoura": [
    "KABLI WAHIBA",
    "BAYADE FANIDA",
    "ECHAOUI KHALID",
    "EL BADLAOUI EL AOUNI",
    "MASSIDE MOHAMMED",
    "MOUNJI MAROUANE",
    "RAFIQI MOHAMMED",
  ],
}

// Mapping of magasin names to cities (handles various formats)
const magasinToCity: Record<string, string> = {
  "📍 Ain Diab": "Casablanca",
  "📍 Rabat": "Rabat",
  "📍 Tanger": "Tanger",
  "📍 Marrakech": "Marrakech",
  "📍 Bouskoura": "Bouskoura",
  "Ain Diab": "Casablanca",
  "Casa - Ain Diab": "Casablanca",
  "Casablanca": "Casablanca",
  "Rabat": "Rabat",
  "Tanger": "Tanger",
  "Marrakech": "Marrakech",
  "Bouskoura": "Bouskoura",
}

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)

  // Get available commercials based on selected magasin or ville
  const getAvailableCommercials = (ville?: string): string[] => {
    const currentVille = ville ?? formData.ville
    
    // First try to get from magasin
    if (magasin) {
      const city = magasinToCity[magasin]
      if (city && cityToCommercials[city]) {
        return [...cityToCommercials[city], "Autre"]
      }
    }
    
    // Fallback to ville
    if (currentVille) {
      if (cityToCommercials[currentVille]) {
        return [...cityToCommercials[currentVille], "Autre"]
      }
    }
    
    // Default: return all commercials from all cities
    const allCommercials = new Set<string>()
    Object.values(cityToCommercials).forEach(commercials => {
      commercials.forEach(commercial => allCommercials.add(commercial))
    })
    return [...Array.from(allCommercials), "Autre"]
  }





  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom complet est requis"
    }
    if (!formData.telephone.trim()) {
      newErrors.telephone = "Le numéro de téléphone est requis"
    } else if (!/^[0-9+\s-]{8,}$/.test(formData.telephone.trim())) {
      newErrors.telephone = "Veuillez saisir un numéro de téléphone valide"
    }
    if (!formData.ville) {
      newErrors.ville = "Veuillez sélectionner une ville"
    }
    if (!formData.typeBien) {
      newErrors.typeBien = "Veuillez sélectionner un type de bien"
    }
    if (!formData.commercialName || !formData.commercialName.trim()) {
      newErrors.commercialName = "Veuillez sélectionner un commercial"
    }
    if (!magasin) {
      newErrors.magasin = "Magasin non défini"
    }

    setErrors(newErrors)
    setShowErrors(Object.keys(newErrors).length > 0)
    
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0]
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
        element.focus()
      }
      return false
    }

    return true
  }

  const handleFieldChange = (field: string, value: string) => {
    const updatedFormData = { ...formData, [field]: value }
    
    // If ville changes, check if current commercial is still valid
    if (field === 'ville') {
      const availableCommercials = getAvailableCommercials(value)
      const currentCommercial = updatedFormData.commercialName
      
      // If current commercial is not in the new list and not "Autre", clear it
      if (currentCommercial && !availableCommercials.includes(currentCommercial) && currentCommercial !== "Autre") {
        updatedFormData.commercialName = ""
      }
    }
    
    setFormData(updatedFormData)
    // Clear error for this field when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Validate form
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire", {
        description: `${Object.keys(errors).length} champ(s) requis manquant(s)`
      })
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



      // Reset form and errors
      setFormData({
        nom: "",
        telephone: "",
        ville: "",
        typeBien: "",
        commercialName: "",
        message: ""
      })
      setErrors({})
      setShowErrors(false)

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
    setErrors({})
    setShowErrors(false)
    onOpenChange(false)
  }

  // Prevent modal from closing when clicking outside if there are errors
  const handleOpenChange = (open: boolean) => {
    if (!open && showErrors) {
      // Don't close if there are validation errors
      return
    }
    if (!open) {
      // Clear errors when closing
      setErrors({})
      setShowErrors(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

              {/* Error Summary */}
              <AnimatePresence>
                {showErrors && Object.keys(errors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-400 mb-1">
                          Veuillez corriger les erreurs suivantes :
                        </p>
                        <ul className="text-xs text-red-300/80 space-y-1">
                          {Object.entries(errors).map(([field, message]) => (
                            <li key={field} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-red-400" />
                              {message}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          setShowErrors(false)
                          setErrors({})
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                      onChange={(e) => handleFieldChange("nom", e.target.value)}
                      placeholder="Ex: Ahmed Benali"
                      className={cn(
                        "h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40",
                        errors.nom
                          ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                          : "border-white/10 focus:border-primary/40"
                      )}
                    />
                    {errors.nom && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.nom}
                      </p>
                    )}
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
                      onChange={(e) => handleFieldChange("telephone", e.target.value)}
                      placeholder="Ex: 0612345678"
                      className={cn(
                        "h-9 md:h-10 text-sm md:text-base glass rounded-xl bg-white/10 border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40",
                        errors.telephone
                          ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                          : "border-white/10 focus:border-primary/40"
                      )}
                    />
                    {errors.telephone && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.telephone}
                      </p>
                    )}
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
                    <div>
                      <CreatableSelect
                        value={formData.ville}
                        onValueChange={(value) => {
                          handleFieldChange("ville", value)
                        }}
                        options={villes}
                        placeholder="Choisir ou créer une ville..."
                        searchPlaceholder="Rechercher une ville..."
                        emptyText="Aucune ville trouvée"
                        onCreateNew={(newCity) => {
                          if (!villes.includes(newCity)) {
                            setVilles([...villes, newCity])
                          }
                        }}
                        className={cn(
                          "h-9 md:h-10 glass rounded-xl bg-white/10 border text-foreground focus:ring-2 focus:ring-primary/40",
                          errors.ville
                            ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                            : "border-white/10 focus:border-primary/40"
                        )}
                      />
                      {errors.ville && (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.ville}
                        </p>
                      )}
                    </div>
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
                    <div>
                      <Select value={formData.typeBien} onValueChange={(value) => handleFieldChange("typeBien", value)}>
                        <SelectTrigger className={cn(
                          "h-9 md:h-10 glass rounded-xl bg-white/10 border text-foreground focus:ring-2 focus:ring-primary/40",
                          errors.typeBien
                            ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                            : "border-white/10 focus:border-primary/40"
                        )}>
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
                      {errors.typeBien && (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.typeBien}
                        </p>
                      )}
                    </div>
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
                    <div>
                      <Select
                        value={formData.commercialName || ""}
                        onValueChange={(value) => {
                          if (value === "Autre") {
                            // Handle custom commercial name if needed
                            handleFieldChange("commercialName", "")
                          } else {
                            handleFieldChange("commercialName", value)
                          }
                        }}
                      >
                        <SelectTrigger 
                          disabled={!magasin && !formData.ville}
                          className={cn(
                            "h-9 md:h-10 glass rounded-xl bg-white/10 border text-foreground focus:ring-2 focus:ring-primary/40",
                            errors.commercialName
                              ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                              : "border-white/10 focus:border-primary/40",
                            (!magasin && !formData.ville) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <SelectValue placeholder={
                            (!magasin && !formData.ville)
                              ? "Sélectionnez d'abord une ville ou un magasin"
                              : "Sélectionner un commercial..."
                          }>
                            {formData.commercialName || ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="glass bg-slate-900/95 border border-white/10">
                          {(() => {
                            const availableCommercials = getAvailableCommercials()
                            const currentCommercial = formData.commercialName
                            const commercialList = [...availableCommercials]
                            
                            // Add current commercial if it's not in the predefined list
                            if (currentCommercial && !availableCommercials.includes(currentCommercial) && currentCommercial !== "Autre") {
                              commercialList.unshift(currentCommercial)
                            }
                            
                            // Determine the city name for display
                            let cityName = ""
                            if (magasin) {
                              cityName = magasinToCity[magasin] || ""
                            } else if (formData.ville) {
                              cityName = formData.ville
                            }
                            
                            if (commercialList.length === 0 || (!magasin && !formData.ville)) {
                              return (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                  Sélectionnez d'abord une ville ou un magasin
                                </div>
                              )
                            }
                            
                            return (
                              <>
                                {cityName && (
                                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-b border-white/10">
                                    📍 {cityName}
                                  </div>
                                )}
                                {commercialList.map((commercial) => (
                                  <SelectItem key={commercial} value={commercial} className="text-foreground">
                                    {commercial}
                                  </SelectItem>
                                ))}
                              </>
                            )
                          })()}
                        </SelectContent>
                      </Select>
                      {errors.commercialName ? (
                        <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3 w-3" />
                          {errors.commercialName}
                        </p>
                      ) : (
                        <p className="text-[10px] md:text-xs text-muted-foreground/70 mt-0.5">
                          {(() => {
                            const availableCommercials = getAvailableCommercials()
                            const count = availableCommercials.filter(c => c !== "Autre").length
                            if (magasin || formData.ville) {
                              return `${count} commercial${count > 1 ? 'aux' : ''} disponible${count > 1 ? 's' : ''}`
                            }
                            return "Nom du commercial qui a soumis ce lead"
                          })()}
                        </p>
                      )}
                    </div>
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
