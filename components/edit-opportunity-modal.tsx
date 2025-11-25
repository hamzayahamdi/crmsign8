"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Sparkles, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { Contact, Opportunity, OpportunityType } from "@/types/contact"
import type { Architect } from "@/types/architect"
import { ArchitectSelectionDialog } from "@/components/architect-selection-dialog-improved"

interface EditOpportunityModalProps {
    isOpen: boolean
    onClose: () => void
    opportunity: Opportunity
    contact?: Contact
    onSuccess?: () => void
}

export function EditOpportunityModal({
    isOpen,
    onClose,
    opportunity,
    contact,
    onSuccess,
}: EditOpportunityModalProps) {
    const [architects, setArchitects] = useState<Architect[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [architectDialogOpen, setArchitectDialogOpen] = useState(false)

    // Form state
    const [nomOportunite, setNomOportunite] = useState(opportunity.titre)
    const [description, setDescription] = useState(opportunity.description || "")
    const [montantEstime, setMontantEstime] = useState(opportunity.budget?.toString() || "")
    const [architectId, setArchitectId] = useState(opportunity.architecteAssigne || "")

    // Reset form when opportunity changes
    useEffect(() => {
        if (isOpen) {
            setNomOportunite(opportunity.titre)
            setDescription(opportunity.description || "")
            setMontantEstime(opportunity.budget?.toString() || "")
            setArchitectId(opportunity.architecteAssigne || "")
            fetchArchitects()
        }
    }, [isOpen, opportunity])

    const fetchArchitects = async () => {
        try {
            setLoading(true)
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
            const response = await fetch("/api/architects", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (response.ok) {
                const data = await response.json()
                const list: Architect[] = data?.data || data?.architects || []
                setArchitects(list)
            }
        } catch (error) {
            console.error("Error fetching architects:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!description) {
            toast.error("La description est requise")
            return
        }

        if (!montantEstime) {
            toast.error("Le montant estimé est requis")
            return
        }

        try {
            setSubmitting(true)
            const token = localStorage.getItem("token")

            const response = await fetch(`/api/opportunities/${opportunity.id}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    titre: nomOportunite,
                    description,
                    budget: parseFloat(montantEstime),
                    architecteAssigne: architectId,
                }),
            })

            if (!response.ok) {
                throw new Error("Erreur lors de la mise à jour")
            }

            toast.success("Opportunité mise à jour")
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error("Error updating opportunity:", error)
            toast.error("Erreur lors de la mise à jour")
        } finally {
            setSubmitting(false)
        }
    }

    const selectedArchitect = architects.find((a) => a.id === architectId)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl z-50 bg-neutral-900/95 backdrop-blur-2xl border border-white/10 text-white p-6 sm:p-8"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 relative z-10">Modifier l'opportunité</h2>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Nom de l'opportunité</Label>
                                <Input
                                    value={nomOportunite}
                                    onChange={e => setNomOportunite(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200">Description <span className="text-red-400">*</span></Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="bg-white/5 border-white/10 min-h-[100px] text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200">Montant Estimé (MAD) <span className="text-red-400">*</span></Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="number"
                                        value={montantEstime}
                                        onChange={e => setMontantEstime(e.target.value)}
                                        className="bg-white/5 border-white/10 pl-10 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-200">Architecte Assigné</Label>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setArchitectDialogOpen(true)}
                                        className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-200"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        {selectedArchitect ? 'Changer' : 'Choisir'}
                                    </Button>
                                    {selectedArchitect && (
                                        <span className="text-sm text-slate-300">
                                            {selectedArchitect.prenom} {selectedArchitect.nom}
                                        </span>
                                    )}
                                    {!selectedArchitect && architectId && (
                                        <span className="text-sm text-slate-300">
                                            ID: {architectId} (Chargement...)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-slate-300">
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                                </Button>
                            </div>
                        </form>

                        <ArchitectSelectionDialog
                            open={architectDialogOpen}
                            onOpenChange={setArchitectDialogOpen}
                            onBack={() => setArchitectDialogOpen(false)}
                            onArchitectSelected={(id) => {
                                setArchitectId(id)
                                setArchitectDialogOpen(false)
                            }}
                            leadName={contact?.nom || "Contact"}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
