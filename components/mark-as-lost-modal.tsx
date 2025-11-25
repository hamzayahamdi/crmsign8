"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface MarkAsLostModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (reason: string) => void
    opportunityName: string
}

const LOST_REASONS = [
    { value: 'budget', label: 'Budget insuffisant' },
    { value: 'no_response', label: 'Plus de réponse' },
    { value: 'cancelled', label: 'Annulation du projet' },
    { value: 'competition', label: 'Concurrence' },
    { value: 'other', label: 'Autre' },
]

export function MarkAsLostModal({ isOpen, onClose, onConfirm, opportunityName }: MarkAsLostModalProps) {
    const [reason, setReason] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!reason) return

        const selectedReason = LOST_REASONS.find(r => r.value === reason)
        onConfirm(selectedReason?.label || reason)
        setReason('')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl shadow-2xl z-50 bg-neutral-900/95 backdrop-blur-xl border border-red-500/20 text-white"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>

                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        Marquer comme perdue
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {opportunityName}
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-200">
                                        Raison de la perte *
                                    </Label>
                                    <Select value={reason} onValueChange={setReason}>
                                        <SelectTrigger className="h-11 bg-white/10 border border-white/10 text-white rounded-xl focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all">
                                            <SelectValue placeholder="Sélectionnez une raison" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border border-white/10 bg-neutral-900/95 shadow-xl">
                                            {LOST_REASONS.map((r) => (
                                                <SelectItem key={r.value} value={r.value} className="text-white">
                                                    {r.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 h-11 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all border border-white/10"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!reason}
                                        className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirmer
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
