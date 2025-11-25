"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MoreVertical, Edit2, CheckCircle2, XCircle, Loader2, DollarSign, FileText } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Opportunity, OpportunityPipelineStage, OpportunityStatus } from '@/types/contact'
import { toast } from 'sonner'
import { MarkAsLostModal } from '@/components/mark-as-lost-modal'
import { EditOpportunityModal } from '@/components/edit-opportunity-modal'
import { Contact } from '@/types/contact'
import { AcompteRecuOpportunityModal } from '@/components/acompte-recu-opportunity-modal'

interface OpportunitiesTableProps {
    opportunities: Opportunity[]
    architectNameMap: Record<string, string>
    onUpdate: () => void
    contact?: Contact
}

export function OpportunitiesTable({ opportunities, architectNameMap, onUpdate, contact }: OpportunitiesTableProps) {
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [lostModalOpen, setLostModalOpen] = useState(false)
    const [acompteModalOpen, setAcompteModalOpen] = useState(false)
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
    const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)

    const handleEdit = (opportunity: Opportunity) => {
        setEditingOpportunity(opportunity)
    }

    const handleMarkAsWon = async (opportunity: Opportunity) => {
        try {
            setUpdatingId(opportunity.id)
            const token = localStorage.getItem('token')

            const response = await fetch(`/api/opportunities/${opportunity.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    statut: 'won',
                    pipelineStage: 'gagnee'
                }),
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour')
            }

            toast.success('Opportunité marquée comme gagnée!')
            onUpdate()
        } catch (error) {
            console.error('Error marking as won:', error)
            toast.error('Erreur lors de la mise à jour')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleMarkAsLost = (opportunity: Opportunity) => {
        setSelectedOpportunity(opportunity)
        setLostModalOpen(true)
    }

    const handleLostConfirm = async (reason: string) => {
        if (!selectedOpportunity) return

        try {
            setUpdatingId(selectedOpportunity.id)
            const token = localStorage.getItem('token')

            if (!token) {
                toast.error('Token d\'authentification manquant')
                return
            }

            const response = await fetch(`/api/opportunities/${selectedOpportunity.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    statut: 'lost',
                    pipelineStage: 'perdue',
                    notes: reason ? `Raison de perte: ${reason}` : undefined,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
                throw new Error(errorData.error || 'Erreur lors de la mise à jour')
            }

            toast.success('Opportunité marquée comme perdue')
            setLostModalOpen(false)
            setSelectedOpportunity(null)
            onUpdate()
        } catch (error) {
            console.error('Error marking as lost:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
            toast.error(errorMessage)
        } finally {
            setUpdatingId(null)
        }
    }

    const getPipelineDisplay = (stage: OpportunityPipelineStage) => {
        const stageConfig = {
            prise_de_besoin: {
                label: 'Prise de besoin',
                className: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
                icon: '📝'
            },
            projet_accepte: {
                label: 'Projet Accepté',
                className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
                icon: '✅'
            },
            acompte_recu: {
                label: 'Acompte Reçu',
                className: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
                icon: '💰'
            },
            gagnee: {
                label: 'Gagnée',
                className: 'bg-green-500/20 text-green-300 border-green-500/50',
                icon: '🎉'
            },
            perdue: {
                label: 'Perdue',
                className: 'bg-red-500/20 text-red-300 border-red-500/50',
                icon: '❌'
            },
        }

        const config = stageConfig[stage] || stageConfig.projet_accepte

        return (
            <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.className}`}>
                    {config.label}
                </span>
            </div>
        )
    }

    const getResultatDisplay = (statut: OpportunityStatus, pipelineStage: OpportunityPipelineStage) => {
        // If pipeline stage is acompte_recu or gagnee, show Gagnée
        // Acompte Reçu means the opportunity is won (deposit received)
        // Note: projet_accepte is NOT considered won - only acompte_recu and gagnee
        if (statut === 'won' || pipelineStage === 'acompte_recu' || pipelineStage === 'gagnee') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border bg-green-500/20 text-green-300 border-green-500/50">
                    Gagnée
                </span>
            )
        } else if (statut === 'lost' || pipelineStage === 'perdue') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border bg-red-500/20 text-red-300 border-red-500/50">
                    Perdue
                </span>
            )
        }
        return <span className="text-slate-500 text-xs">-</span>
    }

    const handleProjetAccepte = async (opportunity: Opportunity) => {
        try {
            setUpdatingId(opportunity.id)
            const token = localStorage.getItem('token')

            // Set pipeline stage to Projet Accepté AND mark as won
            const response = await fetch(`/api/opportunities/${opportunity.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pipelineStage: 'projet_accepte',
                    statut: 'won',
                }),
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour')
            }

            toast.success('Projet accepté et marqué comme gagné!')
            onUpdate()
        } catch (error) {
            console.error('Error updating:', error)
            toast.error('Erreur lors de la mise à jour')
        } finally {
            setUpdatingId(null)
        }
    }

    const handlePriseDeBesoin = async (opportunity: Opportunity) => {
        try {
            setUpdatingId(opportunity.id)
            const token = localStorage.getItem('token')

            // Set pipeline stage to Prise de besoin (Needs Assessment)
            const response = await fetch(`/api/opportunities/${opportunity.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pipelineStage: 'prise_de_besoin',
                }),
            })

            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour')
            }

            toast.success('Étape changée à Prise de besoin')
            onUpdate()
        } catch (error) {
            console.error('Error updating:', error)
            toast.error('Erreur lors de la mise à jour')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleAcompteRecu = (opportunity: Opportunity) => {
        // Open modal for Acompte Reçu
        setSelectedOpportunity(opportunity)
        setAcompteModalOpen(true)
    }

    const handleAcompteRecuSuccess = async () => {
        toast.success('Pipeline mis à jour avec succès')
        setAcompteModalOpen(false)
        setSelectedOpportunity(null)
        onUpdate()
    }

    const handlePerdu = (opportunity: Opportunity) => {
        // Mark as lost
        setSelectedOpportunity(opportunity)
        setLostModalOpen(true)
    }

    if (opportunities.length === 0) {
        return (
            <div className="glass rounded-2xl border border-slate-600/40 p-12 text-center">
                <p className="text-slate-300">Aucune opportunité trouvée</p>
            </div>
        )
    }

    return (
        <>
            <div className="glass rounded-2xl border border-slate-600/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-600/30 bg-slate-800/30">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Nom de l'opportunité
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Budget
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    État Pipeline
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Type de bien
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Architecte
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600/20">
                            {opportunities.map((opp, index) => {
                                const architectName = opp.architecteAssigne
                                    ? architectNameMap[opp.architecteAssigne] || opp.architecteAssigne
                                    : 'Non assigné'

                                return (
                                    <motion.tr
                                        key={opp.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-slate-700/20 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {updatingId === opp.id && (
                                                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                )}
                                                <span className="font-semibold text-white">{opp.titre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-emerald-400">
                                                {opp.budget ? `${opp.budget.toLocaleString()} DH` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getPipelineDisplay(opp.pipelineStage)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-300 capitalize">{opp.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-300">{architectName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-white"
                                                        disabled={updatingId === opp.id}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass border-slate-600/30 min-w-[200px]">
                                                    {/* Éditer - Always available */}
                                                    <DropdownMenuItem
                                                        className="text-slate-300 focus:text-white cursor-pointer"
                                                        onClick={() => handleEdit(opp)}
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-2" />
                                                        Éditer
                                                    </DropdownMenuItem>

                                                    {/* Pipeline Actions - Only show if status is "open" */}
                                                    {opp.statut === 'open' && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-slate-600/30" />
                                                            <DropdownMenuLabel className="text-xs text-slate-400 uppercase">
                                                                Actions Pipeline
                                                            </DropdownMenuLabel>
                                                            
                                                            {/* Prise de besoin */}
                                                            <DropdownMenuItem
                                                                className="text-purple-300 focus:text-purple-200 cursor-pointer"
                                                                onClick={() => handlePriseDeBesoin(opp)}
                                                            >
                                                                <FileText className="w-4 h-4 mr-2" />
                                                                Prise de besoin
                                                            </DropdownMenuItem>

                                                            {/* Projet Accepté - Sets pipeline and marks as won */}
                                                            <DropdownMenuItem
                                                                className="text-emerald-300 focus:text-emerald-200 cursor-pointer"
                                                                onClick={() => handleProjetAccepte(opp)}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                Projet Accepté
                                                            </DropdownMenuItem>
                                                            
                                                            {/* Acompte Reçu - Opens modal */}
                                                            <DropdownMenuItem
                                                                className="text-blue-300 focus:text-blue-200 cursor-pointer"
                                                                onClick={() => handleAcompteRecu(opp)}
                                                            >
                                                                <DollarSign className="w-4 h-4 mr-2" />
                                                                Acompte reçu
                                                            </DropdownMenuItem>
                                                            
                                                            {/* Perdu - Marks as lost */}
                                                            <DropdownMenuItem
                                                                className="text-red-400 focus:text-red-300 cursor-pointer"
                                                                onClick={() => handlePerdu(opp)}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Perdu
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {/* Show status info for won/lost opportunities */}
                                                    {opp.statut !== 'open' && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-slate-600/30" />
                                                            <div className="px-2 py-2 text-xs text-slate-500">
                                                                {opp.statut === 'won' ? '✅ Opportunité gagnée' : '❌ Opportunité perdue'}
                                                            </div>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </motion.tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mark as Lost Modal */}
            <MarkAsLostModal
                isOpen={lostModalOpen}
                onClose={() => {
                    setLostModalOpen(false)
                    setSelectedOpportunity(null)
                }}
                onConfirm={handleLostConfirm}
                opportunityName={selectedOpportunity?.titre || ''}
            />

            {/* Acompte Reçu Modal for Opportunities */}
            {selectedOpportunity && (
                <AcompteRecuOpportunityModal
                    isOpen={acompteModalOpen}
                    onClose={() => {
                        setAcompteModalOpen(false)
                        setSelectedOpportunity(null)
                    }}
                    opportunityId={selectedOpportunity.id}
                    onSuccess={handleAcompteRecuSuccess}
                />
            )}

            {/* Edit Opportunity Modal */}
            {editingOpportunity && (
                <EditOpportunityModal
                    isOpen={!!editingOpportunity}
                    onClose={() => setEditingOpportunity(null)}
                    opportunity={editingOpportunity}
                    contact={contact}
                    onSuccess={onUpdate}
                />
            )}
        </>
    )
}
