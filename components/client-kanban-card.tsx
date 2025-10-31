"use client"

import type { Client, ProjectStatus } from "@/types/client"
import { MapPin, User, DollarSign, TrendingUp, Building2, CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Progress } from "@/components/ui/progress"

interface ClientKanbanCardProps {
  client: Client
  onClick: (client: Client) => void
  isNewlyAdded?: boolean
}

export function ClientKanbanCard({ client, onClick, isNewlyAdded }: ClientKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today.getTime() - compareDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Aujourd'hui"
    if (diffDays === 1) return "Hier"
    if (diffDays > 0 && diffDays < 7) return `Il y a ${diffDays}j`
    if (diffDays < 0 && diffDays > -2) return "Aujourd'hui"
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    })
  }

  const getStatusBadge = (status: ProjectStatus) => {
    const config: Record<ProjectStatus, { label: string; className: string }> = {
      nouveau: { label: "Nouveau", className: "bg-green-500/20 text-green-400 border-green-500/40" },
      acompte_verse: { label: "Acompte versé", className: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
      en_conception: { label: "En conception", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
      en_validation: { label: "En validation", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
      en_chantier: { label: "En chantier", className: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
      livraison: { label: "Livraison", className: "bg-teal-500/20 text-teal-400 border-teal-500/40" },
      termine: { label: "Terminé", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
      annule: { label: "Annulé", className: "bg-red-500/20 text-red-400 border-red-500/40" },
      suspendu: { label: "Suspendu", className: "bg-slate-500/20 text-slate-400 border-slate-500/40" },
    }
    return config[status] || { label: status, className: "bg-gray-500/20 text-gray-400 border-gray-500/40" }
  }

  const totalPayments = client.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const budget = client.budget || 0
  const progressPercentage = budget > 0 ? Math.round((totalPayments / budget) * 100) : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const acceptedDevis = client.devis?.filter(d => d.statut === "accepte").length || 0
  const refusedDevis = client.devis?.filter(d => d.statut === "refuse").length || 0
  const pendingDevis = client.devis?.filter(d => d.statut === "en_attente").length || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(client)}
      className={cn(
        "bg-[#171B22] border border-white/10 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:bg-[#1C2128] hover:border-white/20 hover:shadow-xl transition-all duration-200",
        isDragging && "opacity-50 shadow-2xl border-2 border-blue-500/60 scale-105 rotate-2",
        isNewlyAdded && "ring-2 ring-blue-500/50 animate-pulse"
      )}
    >
      {/* Header - Client Name & Magasin */}
      <div className="mb-3">
        <h4 className="font-bold text-white text-base mb-2 line-clamp-1">{client.nom}</h4>
        <div className="flex items-center gap-2">
          {client.magasin && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">{client.magasin}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md">
            <MapPin className="w-3 h-3 text-white/60" />
            <span className="text-xs text-white/60">{client.ville}</span>
          </div>
        </div>
      </div>

      {/* Budget & Progress */}
      {budget > 0 && (
        <div className="mb-3 p-3 bg-white/5 border border-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-white">{formatCurrency(budget)}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-bold text-blue-300">{progressPercentage}%</span>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
      )}

      {/* Devis Indicators */}
      {(acceptedDevis > 0 || refusedDevis > 0 || pendingDevis > 0) && (
        <div className="flex items-center gap-2 mb-3">
          {acceptedDevis > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-md">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span className="text-xs font-medium text-green-300">{acceptedDevis}</span>
            </div>
          )}
          {pendingDevis > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
              <Clock className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-300">{pendingDevis}</span>
            </div>
          )}
          {refusedDevis > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-md">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs font-medium text-red-300">{refusedDevis}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer - Commercial & Last Update */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/60 truncate max-w-[120px]">
            {client.commercialAttribue || client.architecteAssigne}
          </span>
        </div>
        <span className="text-[10px] text-white/40">{formatRelativeDate(client.derniereMaj)}</span>
      </div>
    </div>
  )
}
