"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableSelect } from "@/components/creatable-select"
import { Textarea } from "@/components/ui/textarea"
import type { Lead, LeadStatus, LeadSource, LeadPriority, LeadNote } from "@/types/lead"
import { Trash2, UserPlus, XCircle, Save, Plus, Clock, User, AlertCircle, X, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter as AlertDialogFooterRoot,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface LeadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead?: Lead
    onSave: (lead: Omit<Lead, "id"> & { id?: string }) => void
    onDelete?: () => void
    onConvertToClient?: (lead: Lead) => void
    onMarkAsNotInterested?: (lead: Lead) => void
    currentUserRole?: string
    currentUserName?: string
}

// Liste complète des villes du Maroc
const defaultVilles = [
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

const defaultTypesBien = [
    "Villa",
    "Appartement",
    "Duplex",
    "B2B",
    "Autre",
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

// Mapping of magasin names to cities
const magasinToCity: Record<string, string> = {
    "📍 Ain Diab": "Casablanca",
    "📍 Rabat": "Rabat",
    "📍 Tanger": "Tanger",
    "📍 Marrakech": "Marrakech",
    "📍 Bouskoura": "Bouskoura",
}

const statuts: { value: LeadStatus; label: string; color: string }[] = [
    { value: "nouveau", label: "Nouveau", color: "bg-green-500/20 text-green-400 border-green-500/40" },
    { value: "a_recontacter", label: "À recontacter", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
    { value: "sans_reponse", label: "Sans réponse", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
    { value: "non_interesse", label: "Non intéressé", color: "bg-red-500/20 text-red-400 border-red-500/40" },
    { value: "qualifie", label: "Qualifié", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
    { value: "refuse", label: "Refusé", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
]

const sources: { value: LeadSource; label: string }[] = [
    { value: "magasin", label: "Magasin" },
    { value: "site_web", label: "Site web" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "reference_client", label: "Recommandation" },
    { value: "autre", label: "Autre" },
]

const calculatePriority = (source: LeadSource): LeadPriority => {
    switch (source) {
        // Haute (High Priority): Direct sources with highest intent and conversion potential
        case "magasin":           // Direct walk-in, immediate interest, highest conversion
        case "reference_client":  // Warm referral, trusted source, high conversion
        case "site_web":          // Direct inquiry, shows active interest, high conversion
            return "haute"
        
        // Moyenne (Medium Priority): Social media with moderate engagement
        case "facebook":          // Social media, engaged audience, moderate conversion
        case "instagram":         // Social media, engaged audience, moderate conversion
            return "moyenne"
        
        // Basse (Low Priority): Lower intent or unknown sources
        case "tiktok":            // Social media, typically lower conversion rate
        case "autre":             // Unknown source, unpredictable conversion
            return "basse"
        
        default:
            return "moyenne"
    }
}

export function LeadModalEnhanced({
    open,
    onOpenChange,
    lead,
    onSave,
    onDelete,
    onConvertToClient,
    onMarkAsNotInterested,
    currentUserRole = "admin",
    currentUserName = "Admin"
}: LeadModalProps) {
    const [villes, setVilles] = useState<string[]>(defaultVilles)
    const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
    const [architects, setArchitects] = useState<string[]>(['Mohamed'])
    const [showCustomCommercial, setShowCustomCommercial] = useState(false)
    const [customCommercialName, setCustomCommercialName] = useState("")
    const [newNote, setNewNote] = useState("")
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [showErrors, setShowErrors] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Get available commercials based on selected ville or magasin
    const getAvailableCommercials = (ville?: string, magasin?: string): string[] => {
        const currentVille = ville ?? formData.ville
        const currentMagasin = magasin ?? formData.magasin
        
        // First try to get from magasin
        if (currentMagasin) {
            const city = magasinToCity[currentMagasin]
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

    const initialForm = {
        nom: lead?.nom || "",
        telephone: lead?.telephone || "",
        ville: lead?.ville || "",
        typeBien: lead?.typeBien || "",
        statut: lead?.statut || ("nouveau" as LeadStatus),
        statutDetaille: lead?.statutDetaille || "",
        assignePar: lead?.assignePar || "Mohamed",
        source: lead?.source || ("site_web" as LeadSource),
        priorite: lead?.priorite || ("moyenne" as LeadPriority),
        magasin: lead?.magasin || "",
        commercialMagasin: lead?.commercialMagasin || "",
        campaignName: (lead as any)?.campaignName || "",
        notes: lead?.notes || [],
    }

    const [formData, setFormData] = useState(initialForm)

    // Load project managers (gestionnaires) and architects from Users API
    useEffect(() => {
        const loadAssignees = async () => {
            try {
                const res = await fetch('/api/users')
                if (res.ok) {
                    const users = (await res.json()) as any[]
                    const list: string[] = Array.from(new Set(
                        users
                            .filter((u: any) => {
                                const role = (u.role || '').toLowerCase()
                                return role === 'gestionnaire' || role === 'architect'
                            })
                            .map((u: any) => (u.name || '').trim())
                            .filter((n: string) => n)
                    ))

                    const mohamedUser = users.find((u: any) =>
                        (u.name || '').toLowerCase().includes('mohamed') &&
                        (u.role || '').toLowerCase() === 'gestionnaire'
                    )

                    const defaultAssignee = mohamedUser?.name || list[0] || 'Mohamed'
                    setArchitects(list.length ? list : ['Mohamed'])

                    if (!lead) {
                        setFormData((prev) => ({ ...prev, assignePar: defaultAssignee }))
                    }
                } else {
                    setArchitects(['Mohamed'])
                    if (!lead) {
                        setFormData((prev) => ({ ...prev, assignePar: 'Mohamed' }))
                    }
                }
            } catch {
                setArchitects(['Mohamed'])
                if (!lead) {
                    setFormData((prev) => ({ ...prev, assignePar: 'Mohamed' }))
                }
            }
        }
        loadAssignees()
    }, [lead])

    const resetForm = () => {
        setFormData({
            nom: "",
            telephone: "",
            ville: "",
            typeBien: "",
            statut: "nouveau" as LeadStatus,
            statutDetaille: "",
            assignePar: "Mohamed",
            source: "site_web" as LeadSource,
            priorite: "moyenne" as LeadPriority,
            magasin: "",
            commercialMagasin: "",
            campaignName: "",
            notes: [],
        })
        setErrors({})
        setShowErrors(false)
        setShowCustomCommercial(false)
        setCustomCommercialName("")
    }

    useEffect(() => {
        if (lead && open) {
            const campaignName = (lead as any)?.campaignName || ""
            const leadMagasin = lead.magasin || ""
            const leadCommercialMagasin = lead.commercialMagasin || ""
            
            console.log('[Lead Modal] Loading lead data:', {
                leadId: lead.id,
                source: lead.source,
                campaignName: campaignName,
                hasCampaignName: !!(lead as any)?.campaignName,
                magasin: leadMagasin,
                commercialMagasin: leadCommercialMagasin
            })
            
            // Check if commercialMagasin is a custom value (not in predefined list)
            // We need to check against available commercials for the lead's ville/magasin
            const availableCommercials = getAvailableCommercials(lead.ville, leadMagasin)
            const isCustomCommercial = leadCommercialMagasin && !availableCommercials.includes(leadCommercialMagasin) && leadCommercialMagasin !== "Autre"
            if (isCustomCommercial) {
                setShowCustomCommercial(true)
                setCustomCommercialName(leadCommercialMagasin)
            } else {
                setShowCustomCommercial(false)
                setCustomCommercialName("")
            }
            
            setFormData((prev) => ({
                ...prev,
                nom: lead.nom,
                telephone: lead.telephone,
                ville: lead.ville,
                typeBien: lead.typeBien,
                statut: lead.statut,
                statutDetaille: lead.statutDetaille || "",
                assignePar: lead.assignePar || prev.assignePar || (architects[0] || 'Mohamed'),
                source: lead.source,
                priorite: lead.priorite,
                magasin: leadMagasin,
                commercialMagasin: leadCommercialMagasin,
                campaignName: campaignName,
                notes: lead.notes || [],
            }))
            
            console.log('[Lead Modal] Form data updated with campaignName:', campaignName)
        }
    }, [lead, architects, open])

    useEffect(() => {
        if (open && !lead) {
            resetForm()
            const defaultAssignee = architects.find((name: string) =>
                name.toLowerCase().includes('mohamed')
            ) || architects[0] || 'Mohamed'
            setFormData((prev) => ({ ...prev, assignePar: defaultAssignee }))
        }
    }, [open, lead, architects])

    // Reload notes when modal opens for an existing lead
    useEffect(() => {
        const loadNotes = async () => {
            if (open && lead?.id) {
                try {
                    const token = localStorage.getItem('token')
                    const response = await fetch(`/api/leads/${lead.id}/notes`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })

                    if (response.ok) {
                        const notes = await response.json()
                        setFormData((prev) => ({
                            ...prev,
                            notes: notes
                        }))
                    }
                } catch (error) {
                    console.error('Error loading notes:', error)
                }
            }
        }

        loadNotes()
    }, [open, lead?.id])

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
        if (!formData.source) {
            newErrors.source = "Veuillez sélectionner une source"
        }
        if (!formData.assignePar) {
            newErrors.assignePar = "Veuillez sélectionner une personne à assigner"
        }
        
        // If source is magasin, validate magasin-specific fields
        if (formData.source === 'magasin') {
            if (!formData.magasin) {
                newErrors.magasin = "Veuillez sélectionner un magasin"
            }
            if (!formData.commercialMagasin?.trim()) {
                newErrors.commercialMagasin = "Le nom du commercial est requis"
            }
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

    const handleFieldChange = (field: string, value: any) => {
        const updatedFormData = { ...formData, [field]: value }
        
        // If ville or magasin changes, check if current commercial is still valid
        if (field === 'ville' || field === 'magasin') {
            const newVille = field === 'ville' ? value : formData.ville
            const newMagasin = field === 'magasin' ? value : formData.magasin
            const availableCommercials = getAvailableCommercials(newVille, newMagasin)
            const currentCommercial = updatedFormData.commercialMagasin
            
            // If current commercial is not in the new list and not "Autre", clear it
            if (currentCommercial && !availableCommercials.includes(currentCommercial) && currentCommercial !== "Autre") {
                updatedFormData.commercialMagasin = ""
                setShowCustomCommercial(false)
                setCustomCommercialName("")
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
            toast({
                title: "Erreur de validation",
                description: `Veuillez corriger ${Object.keys(errors).length} erreur(s) dans le formulaire`,
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        try {
            const calculatedPriority = calculatePriority(formData.source)
            
            // Prepare notes array - include status details as a note if provided
            const notesToInclude = [...formData.notes]
            if (formData.statutDetaille && formData.statutDetaille.trim()) {
                const statusNote: LeadNote = {
                    id: Date.now().toString(), // Temporary ID, will be replaced by API
                    leadId: lead?.id || '',
                    content: `📋 Statut détaillé: ${formData.statutDetaille.trim()}`,
                    author: currentUserName,
                    createdAt: new Date().toISOString(),
                }
                notesToInclude.push(statusNote)
            }
            
            const leadData = {
                ...formData,
                notes: notesToInclude,
                priorite: calculatedPriority,
                id: lead?.id,
                derniereMaj: new Date().toISOString(),
                createdAt: lead?.createdAt ?? new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }

            // Save the lead (API will handle creating notes for new leads)
            await onSave(leadData)

            // For existing leads, if status details are provided, save them as a note via API
            if (lead?.id && formData.statutDetaille && formData.statutDetaille.trim()) {
                try {
                    const token = localStorage.getItem('token')
                    const response = await fetch(`/api/leads/${lead.id}/notes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            content: `📋 Statut détaillé: ${formData.statutDetaille.trim()}`
                        })
                    })

                    if (response.ok) {
                        toast({
                            title: "Note ajoutée",
                            description: "Les détails du statut ont été enregistrés comme note.",
                        })
                    }
                } catch (error) {
                    console.error('Error saving status details as note:', error)
                    // Don't show error to user, just log it
                }
            }

            toast({
                title: "Succès",
                description: lead ? "Lead mis à jour avec succès" : "Lead créé avec succès",
            })

            resetForm()
            onOpenChange(false)
        } catch (error: any) {
            console.error("Error saving lead:", error)
            toast({
                title: "Erreur",
                description: error?.message || "Une erreur est survenue lors de l'enregistrement",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Prevent modal from closing when clicking outside if there are errors
    const handleOpenChangeWrapper = (open: boolean) => {
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

    const handleAddNote = async () => {
        if (!newNote.trim()) return

        // If editing an existing lead, save the note to the database immediately
        if (lead?.id) {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`/api/leads/${lead.id}/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: newNote
                    })
                })

                if (!response.ok) {
                    throw new Error('Failed to save note')
                }

                const savedNote = await response.json()

                // Add the saved note to local state
                setFormData({
                    ...formData,
                    notes: [savedNote, ...formData.notes]
                })
                setNewNote("")

                toast({
                    title: "Note ajoutée",
                    description: "La note a été enregistrée avec succès.",
                })
            } catch (error) {
                console.error('Error saving note:', error)
                toast({
                    title: "Erreur",
                    description: "Impossible d'enregistrer la note.",
                    variant: "destructive"
                })
            }
        } else {
            // For new leads, just add to local state (will be saved when lead is created)
            const note: LeadNote = {
                id: Date.now().toString(),
                leadId: '',
                content: newNote,
                author: currentUserName,
                createdAt: new Date().toISOString(),
            }

            setFormData({
                ...formData,
                notes: [note, ...formData.notes]
            })
            setNewNote("")
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 60) return `Il y a ${diffMins} min`
        if (diffMins < 1440) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const currentStatus = statuts.find(s => s.value === formData.statut)
    const priorityColor = formData.priorite === 'haute'
        ? 'bg-green-500/20 text-green-400 border-green-500/40'
        : formData.priorite === 'moyenne'
            ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
            : 'bg-gray-500/20 text-gray-400 border-gray-500/40'

    return (
        <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
            <DialogContent
                showCloseButton={false}
                containerClassName="!p-0 sm:!p-2 md:!p-4 !items-start sm:!items-center !justify-start sm:!justify-center"
                className="!w-full !max-w-full sm:!max-w-[95vw] lg:!max-w-fit lg:!w-fit !h-full sm:!h-auto !max-h-full sm:!max-h-[90vh] !rounded-none sm:!rounded-lg bg-gradient-to-br from-[#0f1117] via-[#13151c] to-[#0f1117] border-0 sm:border border-slate-800/50 overflow-hidden !p-0 shadow-2xl shadow-black/50 flex flex-col backdrop-blur-xl !m-0"
            >
                {/* Header - Fixed at Top (Always Visible) */}
                <div className="relative w-full px-3 py-3 sm:px-4 sm:py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-900/50 to-transparent shrink-0 z-40 flex-shrink-0 min-h-[48px] flex items-center">
                    <div className="flex items-center justify-between gap-2 min-w-0 w-full pr-10 sm:pr-10">
                        <h2 className="text-base sm:text-base font-medium text-white tracking-tight truncate flex-1 min-w-0 text-left m-0 leading-tight">
                            {lead ? "Modifier Lead" : "Créer Lead"}
                        </h2>
                        <Badge className={cn("px-2 py-1 sm:px-2 text-[10px] sm:text-[10px] font-medium border shrink-0 whitespace-nowrap m-0", priorityColor)}>
                            ↑ {formData.priorite === 'haute' ? 'Haute' : formData.priorite === 'moyenne' ? 'Moyenne' : 'Basse'}
                        </Badge>
                    </div>
                    
                    {/* Close Button - Positioned in Header */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-3 z-50 w-7 h-7 sm:w-7 sm:h-7 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 group shadow-lg"
                        aria-label="Fermer"
                    >
                        <XCircle className="h-4 w-4 sm:h-4 sm:w-4 text-red-400 group-hover:text-red-300 transition-colors" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden max-h-[calc(100vh-120px)] sm:max-h-none">
                    {/* Left Panel - Form */}
                    <div className="flex-1 lg:min-w-[560px] flex flex-col min-h-0 overflow-hidden">

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 lg:p-4">
                            {/* Error Summary */}
                            <AnimatePresence>
                                {showErrors && Object.keys(errors).length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: "auto", y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="mt-0.5 shrink-0">
                                                <AlertCircle className="h-4 w-4 text-red-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-red-400 mb-1.5">
                                                    Veuillez corriger les erreurs suivantes :
                                                </p>
                                                <ul className="text-[10px] text-red-300/90 space-y-1">
                                                    {Object.entries(errors).map(([field, message]) => (
                                                        <li key={field} className="flex items-start gap-1.5">
                                                            <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                            <span className="flex-1">{message}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowErrors(false)
                                                    setErrors({})
                                                }}
                                                className="text-red-400 hover:text-red-300 transition-colors shrink-0 mt-0.5 p-0.5 rounded hover:bg-red-500/10"
                                                aria-label="Fermer"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5 lg:space-y-3">
                                {/* Nom complet */}
                                <div className="space-y-1 sm:space-y-1.5">
                                    <Label htmlFor="nom" className="text-[10px] font-light text-slate-300">
                                        Nom complet <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nom"
                                        value={formData.nom}
                                        onChange={(e) => handleFieldChange("nom", e.target.value)}
                                        className={cn(
                                            "bg-slate-800/90 border text-white placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 px-3 text-xs font-light transition-all",
                                            errors.nom
                                                ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                : "border-slate-600/40 focus:border-blue-500/60"
                                        )}
                                        placeholder="Nom et prénom"
                                    />
                                    {errors.nom && (
                                        <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                            {errors.nom}
                                        </p>
                                    )}
                                </div>

                                {/* Téléphone & Ville */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="telephone" className="text-[10px] font-light text-slate-300">
                                            Téléphone <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10 pointer-events-none flex items-center justify-center w-4 h-4">📞</span>
                                            <Input
                                                id="telephone"
                                                value={formData.telephone}
                                                onChange={(e) => handleFieldChange("telephone", e.target.value)}
                                                className={cn(
                                                    "bg-slate-800/90 border text-white placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 pl-8 pr-3 text-xs font-light transition-all",
                                                    errors.telephone
                                                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                        : "border-slate-600/40 focus:border-blue-500/60"
                                                )}
                                                placeholder="Numéro de téléphone"
                                            />
                                        </div>
                                        {errors.telephone && (
                                            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                {errors.telephone}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="ville" className="text-[10px] font-light text-slate-300">
                                            Ville <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10 pointer-events-none flex items-center justify-center w-4 h-4">📍</span>
                                            <div>
                                                <CreatableSelect
                                                    value={formData.ville}
                                                    onValueChange={(value) => handleFieldChange("ville", value)}
                                                    options={villes}
                                                    placeholder="Sélectionner une ville"
                                                    searchPlaceholder="Rechercher..."
                                                    emptyText="Tapez pour créer"
                                                    className={cn(
                                                        "pl-8",
                                                        errors.ville ? "border-red-500/50" : ""
                                                    )}
                                                />
                                                {errors.ville && (
                                                    <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                        {errors.ville}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Type de bien & Statut */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="typeBien" className="text-[10px] font-light text-slate-300">
                                            Type de bien <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-10 pointer-events-none flex items-center justify-center w-4 h-4">🏠</span>
                                            <div>
                                                <Select
                                                    value={formData.typeBien || undefined}
                                                    onValueChange={(value) => handleFieldChange("typeBien", value)}
                                                >
                                                    <SelectTrigger className={cn(
                                                        "bg-slate-800/90 border text-white h-8 pl-8 pr-3 text-xs font-light focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all",
                                                        errors.typeBien
                                                            ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                            : "border-slate-600/40 focus:border-blue-500/60"
                                                    )}>
                                                        <SelectValue placeholder="Type de bien" />
                                                    </SelectTrigger>
                                                     <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                         <SelectItem value="Villa" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                             Villa
                                                         </SelectItem>
                                                         <SelectItem value="Appartement" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                             Appartement
                                                         </SelectItem>
                                                         <SelectItem value="Duplex" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                             Duplex
                                                         </SelectItem>
                                                         <SelectItem value="B2B" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                             B2B
                                                         </SelectItem>
                                                         <SelectItem value="Autre" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                             Autre
                                                         </SelectItem>
                                                     </SelectContent>
                                                </Select>
                                                {errors.typeBien && (
                                                    <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                        {errors.typeBien}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="statut" className="text-[10px] font-light text-slate-300">
                                            Statut
                                        </Label>
                                        <Select
                                            value={formData.statut}
                                            onValueChange={(value) => setFormData({ ...formData, statut: value as LeadStatus })}
                                        >
                                            <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("w-2 h-2 rounded-full shadow-sm",
                                                        formData.statut === 'nouveau' ? 'bg-green-500' :
                                                            formData.statut === 'a_recontacter' ? 'bg-yellow-500' :
                                                                formData.statut === 'sans_reponse' ? 'bg-orange-500' :
                                                                    formData.statut === 'non_interesse' ? 'bg-red-500' :
                                                                        formData.statut === 'qualifie' ? 'bg-blue-500' :
                                                                            'bg-gray-500'
                                                    )} />
                                                    <span className="text-xs">{statuts.find(s => s.value === formData.statut)?.label || 'Sélectionner'}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#252b3d] border-white/10">
                                                {statuts.map((statut) => (
                                                    <SelectItem key={statut.value} value={statut.value} className="text-white text-xs font-light">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("w-2 h-2 rounded-full shadow-sm",
                                                                statut.value === 'nouveau' ? 'bg-green-500' :
                                                                    statut.value === 'a_recontacter' ? 'bg-yellow-500' :
                                                                        statut.value === 'sans_reponse' ? 'bg-orange-500' :
                                                                            statut.value === 'non_interesse' ? 'bg-red-500' :
                                                                                statut.value === 'qualifie' ? 'bg-blue-500' :
                                                                                    'bg-gray-500'
                                                            )} />
                                                            {statut.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Statut détaillé - Will be saved as note */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="statutDetaille" className="text-[10px] font-light text-slate-300">
                                        Statut détaillé <span className="text-slate-400 font-light">(optionnel - sera enregistré comme note)</span>
                                    </Label>
                                    <Textarea
                                        id="statutDetaille"
                                        value={formData.statutDetaille}
                                        onChange={(e) => setFormData({ ...formData, statutDetaille: e.target.value })}
                                        className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 min-h-[80px] resize-none font-light text-xs transition-all"
                                        placeholder="Ajouter des détails sur le statut... (sera visible dans l'historique des notes)"
                                    />
                                </div>


                                {/* Assigné à & Source */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="assignePar" className="text-[10px] font-light text-slate-300">
                                            Assigné à <span className="text-red-500">*</span>
                                        </Label>
                                        <div>
                                            <Select
                                                value={formData.assignePar}
                                                onValueChange={(value) => handleFieldChange("assignePar", value)}
                                            >
                                                <SelectTrigger className={cn(
                                                    "bg-slate-800/90 border text-white h-8 text-xs font-light focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all",
                                                    errors.assignePar
                                                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                        : "border-slate-600/40 focus:border-blue-500/60"
                                                )}>
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-gray-400 shrink-0" />
                                                        <span className="truncate text-xs">{formData.assignePar || "Sélectionner..."}</span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                    {architects.map((name: string) => (
                                                        <SelectItem key={name} value={name} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="w-3 h-3 text-gray-400" />
                                                                {name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.assignePar && (
                                                <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                    <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                    {errors.assignePar}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="source" className="text-[10px] font-light text-slate-300">
                                            Source du lead <span className="text-red-500">*</span>
                                        </Label>
                                        <div>
                                            <Select
                                                value={formData.source}
                                                onValueChange={(value) => {
                                                    const newSource = value as LeadSource
                                                    const calculatedPriority = calculatePriority(newSource)
                                                    handleFieldChange("source", newSource)
                                                    setFormData({ ...formData, source: newSource, priorite: calculatedPriority })
                                                    // Clear magasin errors if source changes
                                                    if (newSource !== 'magasin') {
                                                        const newErrors = { ...errors }
                                                        delete newErrors.magasin
                                                        delete newErrors.commercialMagasin
                                                        setErrors(newErrors)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className={cn(
                                                    "bg-slate-800/90 border text-white h-8 text-xs font-light focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all",
                                                    errors.source
                                                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                        : "border-slate-600/40 focus:border-blue-500/60"
                                                )}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs">
                                                            {formData.source === 'magasin' ? '🏢' :
                                                                formData.source === 'site_web' ? '🌐' :
                                                                    formData.source === 'facebook' ? '📘' :
                                                                        formData.source === 'instagram' ? '📷' :
                                                                            formData.source === 'tiktok' ? '🎵' :
                                                                                formData.source === 'reference_client' ? '👥' : '📦'}
                                                        </span>
                                                        <SelectValue />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                    {sources.map((source) => (
                                                        <SelectItem key={source.value} value={source.value} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                            {source.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.source && (
                                                <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                    <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                    {errors.source}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>


                                {/* Conditional: Magasin Fields - Show if source is magasin OR if lead has magasin/commercial values */}
                                {(formData.source === 'magasin' || formData.magasin || formData.commercialMagasin) && (
                                    <div className="p-2 sm:p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 space-y-2 sm:space-y-3 backdrop-blur-sm">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="magasin" className="text-[10px] font-light text-slate-300">
                                                    Magasin <span className="text-red-500">*</span>
                                                </Label>
                                                <div>
                                                    <Select
                                                        value={formData.magasin}
                                                        onValueChange={(value) => handleFieldChange("magasin", value)}
                                                    >
                                                        <SelectTrigger className={cn(
                                                            "bg-slate-800/90 border text-white h-8 text-xs font-light focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all",
                                                            errors.magasin
                                                                ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                                : "border-slate-600/40 focus:border-blue-500/60"
                                                        )}>
                                                            <SelectValue placeholder="Sélectionner...">
                                                                {formData.magasin || "Sélectionner..."}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                            {(() => {
                                                                const defaultMagasins = ["📍 Ain Diab", "📍 Rabat", "📍 Tanger", "📍 Marrakech", "📍 Bouskoura"]
                                                                const currentMagasin = formData.magasin
                                                                const magasinList = [...defaultMagasins]
                                                                // Add current magasin if it's not in the default list
                                                                if (currentMagasin && !defaultMagasins.includes(currentMagasin)) {
                                                                    magasinList.unshift(currentMagasin)
                                                                }
                                                                return magasinList.map((mag) => (
                                                                    <SelectItem key={mag} value={mag} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                                        {mag}
                                                                    </SelectItem>
                                                                ))
                                                            })()}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.magasin && (
                                                        <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                            {errors.magasin}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="commercialMagasin" className="text-[10px] font-light text-slate-300">
                                                    Commercial <span className="text-red-500">*</span>
                                                </Label>
                                                {showCustomCommercial ? (
                                                    <div className="space-y-1">
                                                        <Input
                                                            id="commercialMagasin"
                                                            value={customCommercialName}
                                                            onChange={(e) => {
                                                                setCustomCommercialName(e.target.value)
                                                                handleFieldChange("commercialMagasin", e.target.value)
                                                            }}
                                                            className={cn(
                                                                "bg-slate-800/90 border text-white placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 text-xs font-light transition-all",
                                                                errors.commercialMagasin
                                                                    ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                                    : "border-slate-600/40 focus:border-blue-500/60"
                                                            )}
                                                            placeholder="Nom du commercial"
                                                        />
                                                        {errors.commercialMagasin && (
                                                            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                                <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                                {errors.commercialMagasin}
                                                            </p>
                                                        )}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setShowCustomCommercial(false)
                                                                // Try to match with predefined list if possible
                                                                const availableCommercials = getAvailableCommercials()
                                                                const matchingCommercial = availableCommercials.find(c => c.toLowerCase() === customCommercialName.toLowerCase())
                                                                if (matchingCommercial && matchingCommercial !== "Autre") {
                                                                    setFormData({ ...formData, commercialMagasin: matchingCommercial })
                                                                } else {
                                                                    setFormData({ ...formData, commercialMagasin: customCommercialName })
                                                                }
                                                            }}
                                                            className="text-[9px] h-5 px-1.5 text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                                                        >
                                                            ← Liste
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Select
                                                            value={formData.commercialMagasin || ""}
                                                            onValueChange={(value) => {
                                                                if (value === "Autre") {
                                                                    setShowCustomCommercial(true)
                                                                    setCustomCommercialName("")
                                                                    handleFieldChange("commercialMagasin", "")
                                                                } else {
                                                                    setShowCustomCommercial(false)
                                                                    setCustomCommercialName("")
                                                                    handleFieldChange("commercialMagasin", value)
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger 
                                                                disabled={!formData.ville && !formData.magasin}
                                                                className={cn(
                                                                    "bg-slate-800/90 border text-white h-8 text-xs font-light focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all",
                                                                    errors.commercialMagasin
                                                                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/40"
                                                                        : "border-slate-600/40 focus:border-blue-500/60",
                                                                    (!formData.ville && !formData.magasin) && "opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                <SelectValue placeholder={
                                                                    (!formData.ville && !formData.magasin) 
                                                                        ? "Sélectionnez d'abord une ville ou un magasin"
                                                                        : "Sélectionner un commercial..."
                                                                }>
                                                                    {formData.commercialMagasin || ""}
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                                {(() => {
                                                                    const availableCommercials = getAvailableCommercials()
                                                                    const currentCommercial = formData.commercialMagasin
                                                                    const commercialList = [...availableCommercials]
                                                                    // Add current commercial if it's not in the predefined list
                                                                    if (currentCommercial && !availableCommercials.includes(currentCommercial) && currentCommercial !== "Autre") {
                                                                        commercialList.unshift(currentCommercial)
                                                                    }
                                                                    
                                                                    // Determine the city name for display
                                                                    let cityName = ""
                                                                    if (formData.magasin) {
                                                                        cityName = magasinToCity[formData.magasin] || ""
                                                                    } else if (formData.ville) {
                                                                        cityName = formData.ville
                                                                    }
                                                                    
                                                                    if (commercialList.length === 0 || (!formData.ville && !formData.magasin)) {
                                                                        return (
                                                                            <div className="px-2 py-4 text-center text-xs text-slate-400">
                                                                                Sélectionnez d'abord une ville ou un magasin
                                                                            </div>
                                                                        )
                                                                    }
                                                                    
                                                                    return (
                                                                        <>
                                                                            {cityName && (
                                                                                <div className="px-2 py-1.5 text-[10px] text-slate-400 border-b border-slate-700/50">
                                                                                    📍 {cityName}
                                                                                </div>
                                                                            )}
                                                                            {commercialList.map((commercial) => (
                                                                                <SelectItem key={commercial} value={commercial} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                                                    {commercial}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </>
                                                                    )
                                                                })()}
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.commercialMagasin && (
                                                            <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                                <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                                                {errors.commercialMagasin}
                                                            </p>
                                                        )}
                                                        {!errors.commercialMagasin && (formData.ville || formData.magasin) && !formData.commercialMagasin && (
                                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                                {(() => {
                                                                    const availableCommercials = getAvailableCommercials()
                                                                    const count = availableCommercials.filter(c => c !== "Autre").length
                                                                    return `${count} commercial${count > 1 ? 'aux' : ''} disponible${count > 1 ? 's' : ''}`
                                                                })()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Conditional: TikTok Campaign Name */}
                                {formData.source === 'tiktok' && (
                                    <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 space-y-1 backdrop-blur-sm">
                                        <Label htmlFor="campaignName" className="text-[10px] font-light text-slate-300">
                                            Nom de la campagne TikTok
                                        </Label>
                                        <Input
                                            id="campaignName"
                                            key={`campaign-${(formData as any).campaignName || 'empty'}`}
                                            value={(formData as any).campaignName || ''}
                                            onChange={(e) => setFormData({ ...formData, campaignName: e.target.value } as any)}
                                            className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 text-xs font-light"
                                            placeholder="Nom de la campagne TikTok"
                                        />
                                    </div>
                                )}



                            </form>
                        </div>
                    </div>

                    {/* Right Panel - Notes - Enhanced Dark Background */}
                    <div className="w-full lg:w-[320px] max-h-[35vh] sm:max-h-[50vh] lg:max-h-none bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-slate-700/40 flex flex-col shadow-2xl shadow-black/40 shrink-0 lg:shrink">
                        <div className="p-2 sm:p-3 border-b border-slate-700/40 bg-slate-800/30">
                            <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                                <span className="text-xs sm:text-sm">📝</span>
                                <h3 className="text-[10px] sm:text-xs font-light text-white">Notes ({formData.notes.length})</h3>
                            </div>

                            <div className="space-y-1.5 sm:space-y-2">
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Ajouter une note..."
                                    className="bg-slate-800/80 backdrop-blur-sm border-slate-600/50 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/30 min-h-[50px] sm:min-h-[60px] resize-none font-light text-[10px] sm:text-xs transition-all p-2 sm:p-3"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            handleAddNote()
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim()}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-[10px] sm:text-xs font-light h-7 sm:h-8 shadow-lg"
                                >
                                    <Plus className="w-3 h-3 mr-1.5" />
                                    Ajouter note
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2 bg-slate-900/30">
                            {formData.notes.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs font-light">
                                    Aucune note pour le moment
                                </div>
                            ) : (
                                formData.notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "p-2 rounded-lg border backdrop-blur-sm",
                                            note.author === currentUserName
                                                ? "bg-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/10"
                                                : "bg-slate-800/60 border-slate-600/40 shadow-lg"
                                        )}
                                    >
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-light flex-shrink-0 shadow-md">
                                                {note.author.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-light text-white">{note.author}</span>
                                                    {note.author === currentUserName && (
                                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[9px] px-1 py-0 font-light">
                                                            Vous
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {formatTime(note.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-200 font-light leading-relaxed whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons - Fixed at Bottom of Modal, Full Width */}
                <div className="border-t border-slate-700/40 px-2 py-2.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-slate-900/95 to-slate-800/95 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0">
                    {/* Left: Delete Button (only when editing) */}
                    {lead && onDelete ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-light px-2 sm:px-3 h-7 sm:h-8 text-[10px] sm:text-xs"
                                >
                                    <Trash2 className="w-3 h-3 mr-1.5" />
                                    Supprimer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1a1f2e] border-white/10">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white text-sm font-light">Supprimer ce lead ?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400 text-xs font-light">
                                        Cette action est irréversible. Le lead sera définitivement supprimé.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooterRoot>
                                    <AlertDialogCancel className="bg-[#252b3d] border-white/10 text-white hover:bg-[#2a3142] text-xs font-light h-8">
                                        Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white text-xs font-light h-8" onClick={onDelete}>
                                        Supprimer
                                    </AlertDialogAction>
                                </AlertDialogFooterRoot>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <div></div>
                    )}

                    {/* Right: Cancel and Save Buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setErrors({})
                                setShowErrors(false)
                                onOpenChange(false)
                            }}
                            className="bg-slate-800/90 border border-slate-600/40 text-white hover:bg-slate-700/90 font-light px-2 sm:px-4 h-7 sm:h-8 text-[10px] sm:text-xs transition-all"
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-light px-3 sm:px-5 h-7 sm:h-8 text-[10px] sm:text-xs min-w-[100px] sm:min-w-[120px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                                    {lead ? "Enregistrement..." : "Création..."}
                                </>
                            ) : (
                                <>
                                    <Save className="w-3 h-3 mr-1.5" />
                                    Enregistrer
                                </>
                            )}
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
