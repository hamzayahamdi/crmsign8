"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, DollarSign, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface AcompteRecuModalProps {
    isOpen: boolean
    onClose: () => void
    contactId: string
    onSuccess: () => void
}

export function AcompteRecuModal({
    isOpen,
    onClose,
    contactId,
    onSuccess,
}: AcompteRecuModalProps) {
    const [loading, setLoading] = useState(false)
    const [amount, setAmount] = useState("")
    const [methode, setMethode] = useState("virement")
    const [reference, setReference] = useState("")
    const [description, setDescription] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount || isNaN(Number(amount))) {
            toast.error("Veuillez saisir un montant valide")
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem("token")

            const response = await fetch(`/api/contacts/${contactId}/acompte-recu`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    montant: Number(amount),
                    methode,
                    reference,
                    description
                }),
            })

            if (!response.ok) {
                throw new Error("Erreur lors de la mise à jour")
            }

            toast.success("Acompte enregistré avec succès")
            onSuccess()
            onClose()
            setAmount("")
            setMethode("virement")
            setReference("")
            setDescription("")
        } catch (error) {
            console.error("Error:", error)
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 shadow-xl z-50 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Acompte Reçu</h2>
                                    <p className="text-sm text-slate-400">Enregistrer le paiement de l'acompte</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Montant (MAD) <span className="text-red-400">*</span></Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Méthode de paiement <span className="text-red-400">*</span></Label>
                                <Select value={methode} onValueChange={setMethode}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sélectionner une méthode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="virement">Virement</SelectItem>
                                        <SelectItem value="espece">Espèce</SelectItem>
                                        <SelectItem value="cheque">Chèque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Référence paiement (Optionnel)</Label>
                                <Input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Ex: Virement #12345"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500/50"
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="text-slate-300 hover:text-white hover:bg-white/10"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !amount}
                                    className="bg-green-600 hover:bg-green-700 text-white"
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
