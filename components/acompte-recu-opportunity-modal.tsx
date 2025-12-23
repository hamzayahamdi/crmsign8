"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, DollarSign, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface AcompteRecuOpportunityModalProps {
    isOpen: boolean
    onClose: () => void
    opportunityId: string
    onSuccess: () => void
}

export function AcompteRecuOpportunityModal({
    isOpen,
    onClose,
    opportunityId,
    onSuccess,
}: AcompteRecuOpportunityModalProps) {
    const [loading, setLoading] = useState(false)
    const [montant, setMontant] = useState("")
    const [methode, setMethode] = useState("virement")
    const [reference, setReference] = useState("")
    const [description, setDescription] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (montant === "" || montant === null || montant === undefined || isNaN(Number(montant)) || Number(montant) < 0) {
            toast.error("Veuillez saisir un montant valide (0 ou plus)")
            return
        }

        if (!methode) {
            toast.error("Veuillez sélectionner une méthode de paiement")
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem("token")

            const response = await fetch(`/api/opportunities/${opportunityId}/acompte-recu`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    montant: Number(montant),
                    methode,
                    reference: reference || undefined,
                    description: description || undefined
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Erreur lors de la mise à jour")
            }

            toast.success("Pipeline mis à jour avec succès")
            
            // Reset form
            setMontant("")
            setMethode("virement")
            setReference("")
            setDescription("")
            
            onSuccess()
            onClose()
        } catch (error) {
            console.error("Error:", error)
            toast.error(error instanceof Error ? error.message : "Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    const paymentMethods = [
        { value: "virement", label: "Virement bancaire" },
        { value: "especes", label: "Espèces" },
        { value: "cheque", label: "Chèque" },
        { value: "carte", label: "Carte bancaire" },
        { value: "autre", label: "Autre" },
    ]

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
                        onClick={(e) => e.stopPropagation()}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 shadow-xl z-50 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Acompte Reçu</h2>
                                    <p className="text-sm text-slate-400">Enregistrer le paiement de l'acompte</p>
                                </div>
                            </div>
                            <motion.button 
                                onClick={onClose} 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Montant (MAD) <span className="text-red-400">*</span></Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={montant}
                                    onChange={(e) => setMontant(e.target.value)}
                                    placeholder="Ex: 5000"
                                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Méthode de paiement <span className="text-red-400">*</span></Label>
                                <Select value={methode} onValueChange={setMethode} disabled={loading}>
                                    <SelectTrigger className="w-full h-11">
                                        <SelectValue placeholder="Sélectionner une méthode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.value} value={method.value}>
                                                {method.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Notes additionnelles...</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Notes additionnelles..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 min-h-[80px] rounded-lg resize-none"
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="text-slate-300 hover:text-white hover:bg-white/10"
                                    disabled={loading}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !montant || !methode || Number(montant) <= 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Valider l'acompte
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

