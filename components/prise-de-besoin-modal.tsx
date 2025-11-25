"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, FileText, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface PriseDeBesoinModalProps {
    isOpen: boolean
    onClose: () => void
    contactId: string
    onSuccess: () => void
}

export function PriseDeBesoinModal({
    isOpen,
    onClose,
    contactId,
    onSuccess,
}: PriseDeBesoinModalProps) {
    const [loading, setLoading] = useState(false)
    const [notes, setNotes] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!notes.trim()) {
            toast.error("Veuillez saisir des notes sur le besoin du client")
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem("token")

            const response = await fetch(`/api/contacts/${contactId}/prise-de-besoin`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ notes }),
            })

            if (!response.ok) {
                throw new Error("Erreur lors de la mise à jour")
            }

            toast.success("Prise de besoin enregistrée avec succès")
            onSuccess()
            onClose()
            setNotes("")
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
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Prise de besoin</h2>
                                    <p className="text-sm text-slate-400">Détaillez les besoins du client</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Notes de prise de besoin <span className="text-red-400">*</span></Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Type de bien, surface, budget, localisation souhaitée..."
                                    className="min-h-[150px] bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50"
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
                                    disabled={loading || !notes.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Confirmer
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
