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
import { Trash2, UserPlus, XCircle, Save, Plus, Clock, User } from "lucide-react"
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

const defaultVilles = [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Tanger",
    "Fès",
    "Agadir",
    "Meknès",
    "Oujda",
    "Bouskoura",
    "Sale",
]

const defaultTypesBien = [
    "Villa",
    "Appartement",
    "Terrain",
    "Bureau",
    "Riad",
    "Commerce",
]

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
        case "magasin":
        case "reference_client":
            return "haute"
        case "site_web":
            return "moyenne"
        case "facebook":
        case "instagram":
        case "tiktok":
        case "autre":
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
    const [commercials] = useState<string[]>([
        "BOUCHEMAMA LAILA",
        "AMANE HAMZA",
        "ABOUTTAIB RANIA",
        "EL AID HANANE",
        "BELHAJ FADOUA",
        "NAMIRA GHITA",
        "KAITOUNI IDRISSI ALI",
        "Autre"
    ])
    const [showCustomCommercial, setShowCustomCommercial] = useState(false)
    const [customCommercialName, setCustomCommercialName] = useState("")
    const [newNote, setNewNote] = useState("")

    const initialForm = {
        nom: lead?.nom || "",
        telephone: lead?.telephone || "",
        ville: lead?.ville || "",
        typeBien: lead?.typeBien || "",
        statut: lead?.statut || ("nouveau" as LeadStatus),
        statutDetaille: lead?.statutDetaille || "",
        message: lead?.message || "",
        assignePar: lead?.assignePar || "Mohamed",
        source: lead?.source || ("site_web" as LeadSource),
        priorite: lead?.priorite || ("moyenne" as LeadPriority),
        magasin: lead?.magasin || "",
        commercialMagasin: lead?.commercialMagasin || "",
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

    const resetForm = () => setFormData({
        nom: "",
        telephone: "",
        ville: "",
        typeBien: "",
        statut: "nouveau" as LeadStatus,
        statutDetaille: "",
        message: "",
        assignePar: "Mohamed",
        source: "site_web" as LeadSource,
        priorite: "moyenne" as LeadPriority,
        magasin: "",
        commercialMagasin: "",
        notes: [],
    })

    useEffect(() => {
        if (lead && open) {
            setFormData((prev) => ({
                ...prev,
                nom: lead.nom,
                telephone: lead.telephone,
                ville: lead.ville,
                typeBien: lead.typeBien,
                statut: lead.statut,
                statutDetaille: lead.statutDetaille || "",
                message: lead.message || "",
                assignePar: lead.assignePar || prev.assignePar || (architects[0] || 'Mohamed'),
                source: lead.source,
                priorite: lead.priorite,
                magasin: lead.magasin || "",
                commercialMagasin: lead.commercialMagasin || "",
                notes: lead.notes || [],
            }))
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const calculatedPriority = calculatePriority(formData.source)
        onSave({
            ...formData,
            priorite: calculatedPriority,
            id: lead?.id,
            derniereMaj: new Date().toISOString(),
            createdAt: lead?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
        resetForm()
        onOpenChange(false)
    }

    const handleAddNote = () => {
        if (!newNote.trim()) return

        const note: LeadNote = {
            id: Date.now().toString(),
            leadId: lead?.id || '',
            content: newNote,
            author: currentUserName,
            createdAt: new Date().toISOString(),
        }

        setFormData({
            ...formData,
            notes: [...formData.notes, note]
        })
        setNewNote("")
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="!w-fit !max-w-[95vw] lg:!max-w-fit bg-[#1a1f2e] border border-white/10 max-h-[90vh] overflow-hidden p-0 shadow-2xl"
            >
                {/* Close Button */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <XCircle className="h-5 w-5 text-gray-400 hover:text-white" />
                    <span className="sr-only">Close</span>
                </button>

                <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
                    {/* Left Panel - Form */}
                    <div className="flex-1 lg:min-w-[580px] flex flex-col">
                        {/* Header - Fixed */}
                        <div className="p-4 lg:p-6 lg:pb-4">
                            <DialogHeader className="mb-0">
                                <div className="flex items-center justify-between">
                                    <DialogTitle className="text-2xl font-light text-white">
                                        Gestion du Lead
                                    </DialogTitle>
                                    <Badge className={cn("px-3 py-1 text-xs font-medium border", priorityColor)}>
                                        ↑ Priorité {formData.priorite === 'haute' ? 'Haute' : formData.priorite === 'moyenne' ? 'Moyenne' : 'Basse'}
                                    </Badge>
                                </div>
                            </DialogHeader>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto px-4 lg:px-6">
                            <form onSubmit={handleSubmit} className="space-y-5 pb-4">
                                {/* Nom complet */}
                                <div className="space-y-2">
                                    <Label htmlFor="nom" className="text-sm font-light text-gray-300">
                                        Nom complet
                                    </Label>
                                    <Input
                                        id="nom"
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 h-11 font-light"
                                        placeholder="Entrez le nom complet"
                                        required
                                    />
                                </div>

                                {/* Téléphone & Ville */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telephone" className="text-sm font-light text-gray-300">
                                            Téléphone
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📞</span>
                                            <Input
                                                id="telephone"
                                                value={formData.telephone}
                                                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                                className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 h-11 pl-9 font-light"
                                                placeholder="+33 6 12 34 56 78"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ville" className="text-sm font-light text-gray-300">
                                            Ville
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm z-10">📍</span>
                                            <CreatableSelect
                                                value={formData.ville}
                                                onValueChange={(value) => setFormData({ ...formData, ville: value })}
                                                options={villes}
                                                placeholder="Paris"
                                                searchPlaceholder="Rechercher..."
                                                emptyText="Tapez pour créer"
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Type de bien & Statut */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="typeBien" className="text-sm font-light text-gray-300">
                                            Type de bien
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm z-10">🏠</span>
                                            <CreatableSelect
                                                value={formData.typeBien}
                                                onValueChange={(value) => setFormData({ ...formData, typeBien: value })}
                                                options={typesBien}
                                                placeholder="Appartement"
                                                searchPlaceholder="Rechercher..."
                                                emptyText="Tapez pour créer"
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="statut" className="text-sm font-light text-gray-300">
                                            Statut
                                        </Label>
                                        <Select
                                            value={formData.statut}
                                            onValueChange={(value) => setFormData({ ...formData, statut: value as LeadStatus })}
                                        >
                                            <SelectTrigger className="bg-[#252b3d] border-white/10 text-white h-11 font-light">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("w-2 h-2 rounded-full",
                                                        formData.statut === 'nouveau' ? 'bg-green-500' :
                                                            formData.statut === 'a_recontacter' ? 'bg-yellow-500' :
                                                                formData.statut === 'sans_reponse' ? 'bg-orange-500' :
                                                                    formData.statut === 'non_interesse' ? 'bg-red-500' :
                                                                        formData.statut === 'qualifie' ? 'bg-blue-500' :
                                                                            'bg-gray-500'
                                                    )} />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#252b3d] border-white/10">
                                                {statuts.map((statut) => (
                                                    <SelectItem key={statut.value} value={statut.value} className="text-white font-light">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("w-2 h-2 rounded-full",
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

                                {/* Statut détaillé */}
                                <div className="space-y-2">
                                    <Label htmlFor="statutDetaille" className="text-sm font-light text-gray-300">
                                        Statut détaillé
                                    </Label>
                                    <Textarea
                                        id="statutDetaille"
                                        value={formData.statutDetaille}
                                        onChange={(e) => setFormData({ ...formData, statutDetaille: e.target.value })}
                                        className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 min-h-[70px] resize-none font-light text-sm"
                                        placeholder="Détails du statut..."
                                    />
                                </div>

                                {/* Message */}
                                <div className="space-y-2">
                                    <Label htmlFor="message" className="text-sm font-light text-gray-300">
                                        Message
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 min-h-[90px] resize-none font-light text-sm"
                                        placeholder="Message du lead..."
                                    />
                                </div>


                                {/* Assigné à & Source */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="assignePar" className="text-sm font-light text-gray-300">
                                            Assigné à
                                        </Label>
                                        <Select
                                            value={formData.assignePar}
                                            onValueChange={(value) => setFormData({ ...formData, assignePar: value })}
                                        >
                                            <SelectTrigger className="bg-[#252b3d] border-white/10 text-white h-11 font-light">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{formData.assignePar || "Sélectionner..."}</span>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#252b3d] border-white/10">
                                                {architects.map((name: string) => (
                                                    <SelectItem key={name} value={name} className="text-white font-light">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            {name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="source" className="text-sm font-light text-gray-300">
                                            Source du lead
                                        </Label>
                                        <Select
                                            value={formData.source}
                                            onValueChange={(value) => {
                                                const newSource = value as LeadSource
                                                const calculatedPriority = calculatePriority(newSource)
                                                setFormData({ ...formData, source: newSource, priorite: calculatedPriority })
                                            }}
                                        >
                                            <SelectTrigger className="bg-[#252b3d] border-white/10 text-white h-11 font-light">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">
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
                                            <SelectContent className="bg-[#252b3d] border-white/10">
                                                {sources.map((source) => (
                                                    <SelectItem key={source.value} value={source.value} className="text-white font-light">
                                                        {source.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>


                                {/* Conditional: Magasin Fields */}
                                {formData.source === 'magasin' && (
                                    <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="magasin" className="text-sm font-light text-gray-300">
                                                    Magasin
                                                </Label>
                                                <Select
                                                    value={formData.magasin}
                                                    onValueChange={(value) => setFormData({ ...formData, magasin: value })}
                                                >
                                                    <SelectTrigger className="bg-[#252b3d] border-white/10 text-white h-11 font-light">
                                                        <SelectValue placeholder="Sélectionner un magasin..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#252b3d] border-white/10">
                                                        {["📍 Casablanca", "📍 Rabat", "📍 Tanger", "📍 Marrakech", "📍 Bouskoura"].map((mag) => (
                                                            <SelectItem key={mag} value={mag} className="text-white font-light">
                                                                {mag}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="commercialMagasin" className="text-sm font-light text-gray-300">
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
                                                    <SelectTrigger className="bg-[#252b3d] border-white/10 text-white h-11 font-light">
                                                        <SelectValue placeholder="Sélectionner un commercial..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#252b3d] border-white/10">
                                                        {commercials.map((commercial) => (
                                                            <SelectItem key={commercial} value={commercial} className="text-white font-light">
                                                                {commercial}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Custom Commercial Name Input */}
                                        {showCustomCommercial && (
                                            <div className="space-y-2">
                                                <Label htmlFor="customCommercial" className="text-sm font-light text-gray-300">
                                                    Nom du commercial (Autre)
                                                </Label>
                                                <Input
                                                    id="customCommercial"
                                                    value={customCommercialName}
                                                    onChange={(e) => {
                                                        setCustomCommercialName(e.target.value)
                                                        setFormData({ ...formData, commercialMagasin: e.target.value })
                                                    }}
                                                    className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 h-11 font-light"
                                                    placeholder="Entrez le nom du commercial..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Conditional: TikTok Campaign Name */}
                                {formData.source === 'tiktok' && (
                                    <div className="p-4 rounded-lg bg-pink-500/5 border border-pink-500/20 space-y-2">
                                        <Label htmlFor="campaignName" className="text-sm font-light text-gray-300">
                                            Nom de la campagne TikTok
                                        </Label>
                                        <Input
                                            id="campaignName"
                                            value={(formData as any).campaignName || ''}
                                            onChange={(e) => setFormData({ ...formData, campaignName: e.target.value } as any)}
                                            className="bg-[#252b3d] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 h-11 font-light"
                                            placeholder="Ex: Campagne TikTok Novembre 2024..."
                                        />
                                    </div>
                                )}



                            </form>
                        </div>
                    </div>

                    {/* Right Panel - Notes */}
                    <div className="w-full lg:w-[380px] bg-[#252b3d]/50 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">📝</span>
                                <h3 className="text-lg font-light text-white">Notes ({formData.notes.length})</h3>
                            </div>

                            <div className="space-y-3">
                                <Textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Ajouter une note..."
                                    className="bg-[#1a1f2e] border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 min-h-[80px] resize-none font-light text-sm"
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
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-light"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter note
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {formData.notes.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm font-light">
                                    Aucune note pour le moment
                                </div>
                            ) : (
                                formData.notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className={cn(
                                            "p-4 rounded-lg border",
                                            note.author === currentUserName
                                                ? "bg-blue-500/10 border-blue-500/30"
                                                : "bg-[#1a1f2e] border-white/10"
                                        )}
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                                {note.author.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-white">{note.author}</span>
                                                    {note.author === currentUserName && (
                                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-xs px-2 py-0">
                                                            Vous
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(note.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-300 font-light leading-relaxed whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>



                    </div>
                </div>

                {/* Footer Buttons - Spans Full Width */}
                <div className="border-t border-white/10 p-4 lg:p-6 bg-[#1a1f2e] flex items-center justify-between gap-3">
                    {/* Left: Delete Button */}
                    {lead && onDelete && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-light px-4 h-11"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1a1f2e] border-white/10">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Supprimer ce lead ?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                        Cette action est irréversible. Le lead sera définitivement supprimé.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooterRoot>
                                    <AlertDialogCancel className="bg-[#252b3d] border-white/10 text-white hover:bg-[#2a3142]">
                                        Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={onDelete}>
                                        Supprimer
                                    </AlertDialogAction>
                                </AlertDialogFooterRoot>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {/* Right: Cancel and Save Buttons */}
                    <div className="flex items-center gap-3 ml-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="bg-[#252b3d] border border-white/10 text-white hover:bg-[#2a3142] font-light px-6 h-11"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg font-light px-8 h-11 min-w-[160px]"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
