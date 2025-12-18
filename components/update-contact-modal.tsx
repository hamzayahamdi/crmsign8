"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableSelect } from "@/components/creatable-select"
import { Textarea } from "@/components/ui/textarea"
import type { Contact, ContactTag, ContactStatus } from "@/types/contact"
import { XCircle, Save, Plus, Clock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface ContactNote {
    id: string
    content: string
    createdAt: string
    createdBy: string
    type?: string
    source?: string
}

interface UpdateContactModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    contact: Contact | null
    onSave: (contact: Contact) => void
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
    "Terrain",
    "Bureau",
    "Riad",
    "Commerce",
]

const sources: { value: string; label: string }[] = [
    { value: "magasin", label: "Magasin" },
    { value: "site_web", label: "Site web" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "tiktok", label: "TikTok" },
    { value: "reference_client", label: "Recommandation" },
    { value: "autre", label: "Autre" },
]

const tags: { value: ContactTag; label: string; color: string }[] = [
    { value: "prospect", label: "Prospect", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
    { value: "vip", label: "VIP", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
    { value: "converted", label: "Converti", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
    { value: "client", label: "Client", color: "bg-green-500/20 text-green-400 border-green-500/40" },
    { value: "archived", label: "Archivé", color: "bg-gray-500/20 text-gray-400 border-gray-500/40" },
]

const statuses: { value: ContactStatus; label: string; color: string }[] = [
    { value: "qualifie", label: "Qualifié", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
    { value: "prise_de_besoin", label: "Prise de besoin", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
    { value: "acompte_recu", label: "Acompte Reçu", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
    { value: "perdu", label: "Perdu", color: "bg-red-500/20 text-red-400 border-red-500/40" },
]

type ContactPriority = "haute" | "moyenne" | "basse"

const commercials = [
    "BOUCHEMAMA LAILA",
    "AMANE HAMZA",
    "ABOUTTAIB RANIA",
    "EL AID HANANE",
    "BELHAJ FADOUA",
    "NAMIRA GHITA",
    "KAITOUNI IDRISSI ALI",
    "Autre"
]

const calculatePriority = (source: string): ContactPriority => {
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

export function UpdateContactModal({
    open,
    onOpenChange,
    contact,
    onSave,
    currentUserName = "Admin"
}: UpdateContactModalProps) {
    const [villes, setVilles] = useState<string[]>(defaultVilles)
    const [typesBien, setTypesBien] = useState<string[]>(defaultTypesBien)
    const [architects, setArchitects] = useState<string[]>(['Mohamed'])
    const [showCustomCommercial, setShowCustomCommercial] = useState(false)
    const [customCommercialName, setCustomCommercialName] = useState("")
    const [newNote, setNewNote] = useState("")
    const [notes, setNotes] = useState<ContactNote[]>([])

    const initialForm = {
        nom: contact?.nom || "",
        telephone: contact?.telephone || "",
        ville: contact?.ville || "",
        typeBien: contact?.typeBien || "", // Use contact.typeBien directly (stored after conversion)
        source: contact?.source || "site_web",
        architecteAssigne: contact?.architecteAssigne || "",
        tag: contact?.tag || ("prospect" as ContactTag),
        status: contact?.status || ("qualifie" as ContactStatus),
        statutDetaille: "",
        message: "",
        notes: contact?.notes || "",
        magasin: contact?.magasin || "",
        commercialMagasin: (contact as any)?.commercialMagasin || "",
        campaignName: (contact as any)?.campaignName || "",
        priorite: calculatePriority(contact?.source || "site_web") as ContactPriority,
    }

    const [formData, setFormData] = useState(initialForm);

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

                    setArchitects(list.length ? list : ['Mohamed'])

                    if (contact && !contact.architecteAssigne) {
                        const mohamedUser = users.find((u: any) =>
                            (u.name || '').toLowerCase().includes('mohamed') &&
                            (u.role || '').toLowerCase() === 'gestionnaire'
                        )
                        const defaultAssignee = mohamedUser?.name || list[0] || 'Mohamed'
                        setFormData((prev) => ({ ...prev, architecteAssigne: defaultAssignee }))
                    }
                } else {
                    setArchitects(['Mohamed'])
                }
            } catch {
                setArchitects(['Mohamed'])
            }
        }
        loadAssignees()
    }, [contact])

    // Load notes and lead data in parallel when modal opens
    useEffect(() => {
        if (open && contact?.id) {
            // Set empty notes immediately
            setNotes([])
            
            const token = localStorage.getItem('token')
            const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {}
            
            // Load notes and lead data in parallel
            const loadData = async () => {
                const promises: Promise<any>[] = []
                
                // Load notes
                promises.push(
                    fetch(`/api/contacts/${contact.id}/notes`, { headers })
                        .then(res => res.ok ? res.json() : [])
                        .catch(() => [])
                )
                
                // Load lead data if leadId exists
                const leadId = (contact as any).leadId || contact.leadId
                if (leadId) {
                    promises.push(
                        fetch(`/api/leads/${leadId}`, { headers })
                            .then(res => res.ok ? res.json() : null)
                            .catch(() => null)
                    )
                } else {
                    promises.push(Promise.resolve(null))
                }
                
                // Wait for both to complete
                const [notesData, leadData] = await Promise.all(promises)
                
                // Set notes
                if (Array.isArray(notesData)) {
                    setNotes(notesData)
                } else if (notesData?.data && Array.isArray(notesData.data)) {
                    setNotes(notesData.data)
                } else if (notesData?.notes && Array.isArray(notesData.notes)) {
                    setNotes(notesData.notes)
                }
                
                // Update form with lead data if available
                // ALWAYS prefer lead data for campaignName and commercialMagasin (they originate from leads)
                // For typeBien, prefer contact.typeBien (it's stored on contact after conversion)
                if (leadData) {
                    const leadCampaignName = leadData.campaignName || ""
                    console.log('[Update Contact Modal] Lead data received:', {
                        leadId: leadData.id,
                        source: leadData.source,
                        typeBien: leadData.typeBien,
                        contactTypeBien: contact.typeBien,
                        campaignName: leadCampaignName,
                        hasCampaignName: !!leadData.campaignName,
                        commercialMagasin: leadData.commercialMagasin,
                        magasin: leadData.magasin,
                        contactCampaignName: (contact as any)?.campaignName,
                    })
                    
                    setFormData(prev => {
                        const updates: any = {}
                        
                        // Update typeBien: prefer contact.typeBien, fallback to lead.typeBien if contact doesn't have it
                        if (!prev.typeBien && leadData.typeBien) {
                            updates.typeBien = leadData.typeBien
                            console.log('[Update Contact Modal] ✅ Setting typeBien from lead (contact has none):', leadData.typeBien)
                        } else if (prev.typeBien && contact.typeBien) {
                            // Contact already has typeBien, keep it (it's the source of truth)
                            console.log('[Update Contact Modal] ✅ Keeping contact.typeBien:', contact.typeBien)
                        }
                        
                        // ALWAYS update campaignName from lead if it exists (lead is source of truth)
                        // This ensures we get the correct value even if contact was converted before schema update
                        if (leadCampaignName) {
                            updates.campaignName = leadCampaignName
                            console.log('[Update Contact Modal] ✅ Setting campaignName from lead:', leadCampaignName, 'Previous:', prev.campaignName)
                        } else if (!prev.campaignName) {
                            console.log('[Update Contact Modal] ⚠️ No campaignName in lead or contact')
                        }
                        
                        // Update commercialMagasin from lead if source is magasin
                        if (prev.source === 'magasin' && leadData.commercialMagasin) {
                            updates.commercialMagasin = leadData.commercialMagasin
                            console.log('[Update Contact Modal] Setting commercialMagasin from lead:', leadData.commercialMagasin)
                            
                            // Update custom commercial state
                            if (!commercials.includes(leadData.commercialMagasin)) {
                                setShowCustomCommercial(true)
                                setCustomCommercialName(leadData.commercialMagasin)
                            }
                        }
                        
                        // Update magasin if not already set
                        if (leadData.magasin && !prev.magasin) {
                            updates.magasin = leadData.magasin
                        }
                        
                        // Always update if we have lead data (even if empty, to ensure consistency)
                        if (Object.keys(updates).length > 0 || leadCampaignName !== prev.campaignName) {
                            console.log('[Update Contact Modal] ✅ Updating formData with:', updates, 'Final campaignName:', updates.campaignName || prev.campaignName)
                            return { ...prev, ...updates }
                        }
                        return prev
                    })
                } else {
                    console.log('[Update Contact Modal] ⚠️ No lead data available for contact:', contact?.id, 'leadId:', leadId)
                    // If no lead data and contact doesn't have campaignName, log it
                    if (!(contact as any)?.campaignName && contact?.source === 'tiktok') {
                        console.warn('[Update Contact Modal] ⚠️ Contact has TikTok source but no campaignName and no lead data available!')
                    }
                }
            }
            
            loadData()
        } else {
            setNotes([])
        }
    }, [open, contact?.id])

    // Update form when contact changes - Load data immediately (synchronous)
    useEffect(() => {
        if (contact && open) {
            const source = contact.source || "site_web"
            const calculatedPriority = calculatePriority(source)
            
            // Initialize immediately with contact data (no waiting)
            // Load campaignName and commercialMagasin from contact first (they should be saved during conversion)
            // Try multiple ways to access campaignName (in case of type issues)
            let campaignName = (contact as any)?.campaignName || (contact as any)?.campaign_name || ""
            let commercialMagasin = (contact as any)?.commercialMagasin || (contact as any)?.commercial_magasin || ""
            let magasin = contact.magasin || ""
            
            console.log('[Update Contact Modal] 🔍 Initializing form with contact data:', {
                contactId: contact.id,
                source: source,
                campaignName: campaignName,
                hasCampaignName: !!(contact as any)?.campaignName,
                hasCampaignNameAlt: !!(contact as any)?.campaign_name,
                commercialMagasin: commercialMagasin,
                hasCommercialMagasin: !!commercialMagasin,
                leadId: (contact as any)?.leadId || contact.leadId,
                contactKeys: Object.keys(contact), // Log all keys to see what's available
                contactFull: contact // Log full contact object
            })
            
            // Set form data immediately with contact data
            // Prefer contact.typeBien directly (it's stored on contact after conversion)
            // Fallback to lead data if contact doesn't have it (for backward compatibility)
            const typeBienValue = contact.typeBien || ""
            
            setFormData({
                nom: contact.nom || "",
                telephone: contact.telephone || "",
                ville: contact.ville || "",
                typeBien: typeBienValue,
                source: source,
                architecteAssigne: contact.architecteAssigne || "",
                tag: contact.tag || ("prospect" as ContactTag),
                status: contact.status || ("qualifie" as ContactStatus),
                statutDetaille: "",
                message: "",
                notes: contact.notes || "",
                magasin: magasin,
                commercialMagasin: commercialMagasin,
                campaignName: campaignName,
                priorite: calculatedPriority,
            })
            
            console.log('[Update Contact Modal] Form initialized with campaignName:', campaignName, 'commercialMagasin:', commercialMagasin)
            
            // Check if commercialMagasin is custom
            setShowCustomCommercial(false)
            setCustomCommercialName("")
            if (commercialMagasin && !commercials.includes(commercialMagasin)) {
                setShowCustomCommercial(true)
                setCustomCommercialName(commercialMagasin)
            }
            
            // Note: Lead data and notes are loaded in parallel in the separate useEffect above
            // This ensures form appears immediately while data loads in background
            // campaignName will be updated from lead data if contact doesn't have it (for backward compatibility)
        }
    }, [contact, open])

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setFormData(initialForm)
            setShowCustomCommercial(false)
            setCustomCommercialName("")
            setNewNote("")
            setNotes([])
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!contact) return

        try {
            const token = localStorage.getItem('token')
            if (!token) {
                toast.error('Token d\'authentification manquant')
                return
            }

            // Calculate priority based on source
            const calculatedPriority = calculatePriority(formData.source)

            // Prepare update data
            const updateData: any = {
                nom: formData.nom,
                telephone: formData.telephone,
                ville: formData.ville || undefined,
                typeBien: formData.typeBien || undefined,
                source: formData.source || undefined,
                architecteAssigne: formData.architecteAssigne || undefined,
                tag: formData.tag,
                status: formData.status,
                notes: formData.notes || undefined,
                magasin: formData.magasin || undefined,
            }

            // Add campaignName if source is tiktok
            if (formData.source === 'tiktok') {
                updateData.campaignName = formData.campaignName || undefined
            }

            // Add commercialMagasin if source is magasin
            if (formData.source === 'magasin') {
                updateData.commercialMagasin = formData.commercialMagasin || undefined
            }

            const response = await fetch(`/api/contacts/${contact.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to update contact')
            }

            const updatedContact = await response.json()
            onSave(updatedContact)
            toast.success('Contact mis à jour avec succès')
            onOpenChange(false)
        } catch (error) {
            console.error('Error updating contact:', error)
            toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du contact')
        }
    }

    const handleAddNote = async () => {
        if (!newNote.trim() || !contact?.id) return

        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/contacts/${contact.id}/notes`, {
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

            const responseData = await response.json()
            const savedNote = responseData.data || responseData
            
            // Add the saved note to local state
            setNotes([savedNote, ...notes])
            setNewNote("")

            toast.success("Note ajoutée", {
                description: "La note a été enregistrée avec succès.",
            })
        } catch (error) {
            console.error('Error saving note:', error)
            toast.error("Erreur", {
                description: "Impossible d'enregistrer la note.",
            })
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

    const currentTag = tags.find(t => t.value === formData.tag)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="!w-fit !max-w-[95vw] lg:!max-w-fit bg-gradient-to-br from-[#0f1117] via-[#13151c] to-[#0f1117] border border-slate-800/50 max-h-[90vh] overflow-hidden p-0 shadow-2xl shadow-black/50 flex flex-col backdrop-blur-xl"
            >
                {/* Close Button - Enhanced with Red Background */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-3 top-3 z-50 w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 group shadow-lg"
                >
                    <XCircle className="h-4 w-4 text-red-400 group-hover:text-red-300 transition-colors" />
                    <span className="sr-only">Close</span>
                </button>

                {/* Content Area - Scrollable */}
                <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                    {/* Left Panel - Form */}
                    <div className="flex-1 lg:min-w-[560px] flex flex-col">
                        {/* Header - Fixed */}
                        <div className="px-4 py-3 border-b border-slate-700/30 bg-gradient-to-r from-slate-900/50 to-transparent">
                            <DialogHeader className="mb-0">
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="text-base font-light text-white tracking-tight">
                                        Modifier Contact
                                    </DialogTitle>
                                    <Badge className={cn("px-2 py-0.5 text-[10px] font-light border", 
                                        formData.priorite === 'haute' 
                                            ? 'bg-green-500/20 text-green-400 border-green-500/40'
                                            : formData.priorite === 'moyenne'
                                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                                : 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                                    )}>
                                        ↑ {formData.priorite === 'haute' ? 'Haute' : formData.priorite === 'moyenne' ? 'Moyenne' : 'Basse'}
                                    </Badge>
                                </div>
                            </DialogHeader>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <form onSubmit={handleSubmit} className="space-y-2.5">
                                {/* Nom complet */}
                                <div className="space-y-1">
                                    <Label htmlFor="nom" className="text-[10px] font-light text-slate-300">
                                        Nom complet
                                    </Label>
                                    <Input
                                        id="nom"
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 text-xs font-light transition-all"
                                        placeholder="Nom et prénom"
                                        required
                                    />
                                </div>

                                {/* Téléphone & Ville */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="telephone" className="text-[10px] font-light text-slate-300">
                                            Téléphone
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] z-10">📞</span>
                                            <Input
                                                id="telephone"
                                                value={formData.telephone}
                                                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                                className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 pl-7 text-xs font-light transition-all"
                                                placeholder="Numéro de téléphone"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="ville" className="text-[10px] font-light text-slate-300">
                                            Ville
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] z-10">📍</span>
                                            <CreatableSelect
                                                value={formData.ville}
                                                onValueChange={(value) => setFormData({ ...formData, ville: value })}
                                                options={villes}
                                                placeholder="Sélectionner une ville"
                                                searchPlaceholder="Rechercher..."
                                                emptyText="Tapez pour créer"
                                                className="pl-7"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Type de bien & Statut */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="typeBien" className="text-[10px] font-light text-slate-300">
                                            Type de bien
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] z-10">🏠</span>
                                            <Select
                                                value={formData.typeBien || undefined}
                                                onValueChange={(value) => setFormData({ ...formData, typeBien: value })}
                                            >
                                                <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 pl-7 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                    <SelectValue placeholder="Type de bien" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                    <SelectItem value="Villa" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                        Villa
                                                    </SelectItem>
                                                    <SelectItem value="Appartement" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                        Appartement
                                                    </SelectItem>
                                                    <SelectItem value="B2B" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                        B2B
                                                    </SelectItem>
                                                    <SelectItem value="Autre" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                        Autre
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="status" className="text-[10px] font-light text-slate-300">
                                            Statut
                                        </Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) => setFormData({ ...formData, status: value as ContactStatus })}
                                        >
                                            <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("w-2 h-2 rounded-full shadow-sm",
                                                        formData.status === 'qualifie' ? 'bg-blue-500' :
                                                            formData.status === 'prise_de_besoin' ? 'bg-purple-500' :
                                                                formData.status === 'acompte_recu' ? 'bg-emerald-500' :
                                                                    'bg-red-500'
                                                    )} />
                                                    <span className="text-xs">{statuses.find(s => s.value === formData.status)?.label || 'Sélectionner'}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#252b3d] border-white/10">
                                                {statuses.map((status) => (
                                                    <SelectItem key={status.value} value={status.value} className="text-white text-xs font-light">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("w-2 h-2 rounded-full shadow-sm",
                                                                status.value === 'qualifie' ? 'bg-blue-500' :
                                                                    status.value === 'prise_de_besoin' ? 'bg-purple-500' :
                                                                        status.value === 'acompte_recu' ? 'bg-emerald-500' :
                                                                            'bg-red-500'
                                                            )} />
                                                            {status.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Statut détaillé */}
                                <div className="space-y-1">
                                    <Label htmlFor="statutDetaille" className="text-[10px] font-light text-slate-300">
                                        Statut détaillé <span className="text-slate-400 font-light">(optionnel)</span>
                                    </Label>
                                    <Textarea
                                        id="statutDetaille"
                                        value={formData.statutDetaille}
                                        onChange={(e) => setFormData({ ...formData, statutDetaille: e.target.value })}
                                        className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 resize-none font-light text-xs transition-all"
                                        placeholder="Ajouter des détails sur le statut..."
                                    />
                                </div>

                                {/* Message */}
                                <div className="space-y-1">
                                    <Label htmlFor="message" className="text-[10px] font-light text-slate-300">
                                        Message <span className="text-slate-400 font-light">(optionnel)</span>
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 resize-none font-light text-xs transition-all"
                                        placeholder="Message ou commentaire du contact..."
                                    />
                                </div>

                                {/* Assigné à & Source */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="assignePar" className="text-[10px] font-light text-slate-300">
                                            Assigné à
                                        </Label>
                                        <Select
                                            value={formData.architecteAssigne || "__none__"}
                                            onValueChange={(value) => setFormData({ ...formData, architecteAssigne: value === "__none__" ? "" : value })}
                                        >
                                            <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate text-xs">{formData.architecteAssigne || "Sélectionner..."}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                <SelectItem value="__none__" className="text-white text-xs font-light hover:bg-slate-700/50">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        Aucun
                                                    </div>
                                                </SelectItem>
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
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="source" className="text-[10px] font-light text-slate-300">
                                            Source du contact
                                        </Label>
                                        <Select
                                            value={formData.source}
                                            onValueChange={(value) => {
                                                const calculatedPriority = calculatePriority(value)
                                                setFormData({ ...formData, source: value, priorite: calculatedPriority })
                                            }}
                                        >
                                            <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
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
                                    </div>
                                </div>

                                {/* Conditional: Magasin Fields */}
                                {formData.source === 'magasin' && (
                                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 space-y-2.5 backdrop-blur-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="magasin" className="text-[10px] font-light text-slate-300">
                                                    Magasin
                                                </Label>
                                                <Select
                                                    value={formData.magasin}
                                                    onValueChange={(value) => setFormData({ ...formData, magasin: value })}
                                                >
                                                    <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                        <SelectValue placeholder="Sélectionner..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                        {["📍 Casablanca", "📍 Rabat", "📍 Tanger", "📍 Marrakech", "📍 Bouskoura"].map((mag) => (
                                                            <SelectItem key={mag} value={mag} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                                {mag}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="commercialMagasin" className="text-[10px] font-light text-slate-300">
                                                    Commercial
                                                </Label>
                                                <Select
                                                    value={formData.commercialMagasin === customCommercialName && showCustomCommercial ? "Autre" : formData.commercialMagasin}
                                                    onValueChange={(value) => {
                                                        if (value === "Autre") {
                                                            setShowCustomCommercial(true)
                                                            setFormData({ ...formData, commercialMagasin: customCommercialName })
                                                        } else {
                                                            setShowCustomCommercial(false)
                                                            setCustomCommercialName("")
                                                            setFormData({ ...formData, commercialMagasin: value })
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-slate-800/90 border-slate-600/40 text-white h-8 text-xs font-light focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 transition-all">
                                                        <SelectValue placeholder="Sélectionner..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-600/50">
                                                        {commercials.map((commercial) => (
                                                            <SelectItem key={commercial} value={commercial} className="text-white text-xs font-light hover:bg-slate-700/50">
                                                                {commercial}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Custom Commercial Name Input */}
                                        {showCustomCommercial && (
                                            <div className="space-y-1">
                                                <Label htmlFor="customCommercial" className="text-[10px] font-light text-slate-300">
                                                    Nom du commercial (Autre)
                                                </Label>
                                                <Input
                                                    id="customCommercial"
                                                    value={customCommercialName}
                                                    onChange={(e) => {
                                                        setCustomCommercialName(e.target.value)
                                                        setFormData({ ...formData, commercialMagasin: e.target.value })
                                                    }}
                                                    className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 text-xs font-light transition-all"
                                                    placeholder="Nom du commercial"
                                                />
                                            </div>
                                        )}
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
                                            key={`campaign-${formData.campaignName || 'empty'}-${Date.now()}`}
                                            value={formData.campaignName || ''}
                                            onChange={(e) => {
                                                console.log('[Update Contact Modal] campaignName changed:', e.target.value)
                                                setFormData({ ...formData, campaignName: e.target.value })
                                            }}
                                            className="bg-slate-800/90 border-slate-600/40 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 focus:bg-slate-800 h-8 text-xs font-light"
                                            placeholder="Nom de la campagne TikTok"
                                        />
                                        {formData.campaignName && (
                                            <div className="text-[9px] text-green-400 mt-0.5">
                                                ✓ Campaign name loaded: {formData.campaignName}
                                            </div>
                                        )}
                                        {!formData.campaignName && formData.source === 'tiktok' && (
                                            <div className="text-[9px] text-yellow-400 mt-0.5">
                                                ⚠️ No campaign name found
                                            </div>
                                        )}
                                    </div>
                                )}

                            </form>
                        </div>
                    </div>

                    {/* Right Panel - Notes - Enhanced Dark Background */}
                    <div className="w-full lg:w-[320px] bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-slate-700/40 flex flex-col shadow-2xl shadow-black/40">
                        <div className="p-3 border-b border-slate-700/40 bg-slate-800/30">
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="text-sm">📝</span>
                                <h3 className="text-xs font-light text-white">Notes ({notes.length})</h3>
                            </div>

                            <div className="space-y-2">
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Ajouter une note..."
                                    className="bg-slate-800/80 backdrop-blur-sm border-slate-600/50 text-white placeholder:text-slate-400 focus:border-blue-500/60 focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/30 min-h-[60px] resize-none font-light text-xs transition-all"
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
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-light h-8 shadow-lg"
                                >
                                    <Plus className="w-3 h-3 mr-1.5" />
                                    Ajouter note
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900/30">
                            {notes.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-xs font-light">
                                    Aucune note pour le moment
                                </div>
                            ) : (
                                notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "p-2 rounded-lg border backdrop-blur-sm",
                                            note.createdBy === currentUserName
                                                ? "bg-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/10"
                                                : "bg-slate-800/60 border-slate-600/40 shadow-lg"
                                        )}
                                    >
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-light flex-shrink-0 shadow-md">
                                                {note.createdBy.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-[10px] font-light text-white">{note.createdBy}</span>
                                                    {note.createdBy === currentUserName && (
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
                <div className="border-t border-slate-700/40 px-4 py-2.5 bg-gradient-to-r from-slate-900/95 to-slate-800/95 flex items-center justify-end gap-2">
                    {/* Right: Cancel and Save Buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="bg-slate-800/90 border border-slate-600/40 text-white hover:bg-slate-700/90 font-light px-4 h-8 text-xs transition-all"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-light px-5 h-8 text-xs min-w-[120px]"
                        >
                            <Save className="w-3 h-3 mr-1.5" />
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
