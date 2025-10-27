"use client"

import { useState } from "react"
import { X, Building2, DollarSign, User, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { Client, ProjectStatus } from "@/types/client"

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onCreateProject: (project: NewProjectData) => void
}

export interface NewProjectData {
  type: string
  budget: number
  description: string
  status: ProjectStatus
  architect: string
}

export function NewProjectModal({
  isOpen,
  onClose,
  client,
  onCreateProject
}: NewProjectModalProps) {
  const [formData, setFormData] = useState<NewProjectData>({
    type: "",
    budget: 0,
    description: "",
    status: "nouveau",
    architect: client.architecteAssigne
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.type.trim()) return
    
    onCreateProject(formData)
    
    // Reset form
    setFormData({
      type: "",
      budget: 0,
      description: "",
      status: "nouveau",
      architect: client.architecteAssigne
    })
  }

  const projectTypes = [
    { value: "villa", label: "Villa" },
    { value: "appartement", label: "Appartement" },
    { value: "bureau", label: "Bureau" },
    { value: "commerce", label: "Commerce" },
    { value: "renovation", label: "Rénovation" },
    { value: "autre", label: "Autre" },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
      minimumFractionDigits: 0,
    }).format(amount)
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#171B22] rounded-2xl border border-white/10 shadow-2xl z-50 p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EAEAEA]">Nouveau projet</h2>
                  <p className="text-sm text-white/40">{client.nom}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-[#EAEAEA]" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Project Type */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Type de projet *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {projectTypes.map((type) => (
                    <motion.button
                      key={type.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={cn(
                        "h-11 rounded-xl font-medium text-sm transition-all border",
                        formData.type === type.value
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      )}
                    >
                      {type.label}
                    </motion.button>
                  ))}
                </div>
                {formData.type === "autre" && (
                  <Input
                    type="text"
                    placeholder="Spécifier le type..."
                    className="mt-2 h-11 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50"
                  />
                )}
              </div>

              {/* Budget */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Budget estimé
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="number"
                    value={formData.budget || ""}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    step="1000"
                    className="h-12 pl-10 pr-16 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                    MAD
                  </span>
                </div>
                {formData.budget > 0 && (
                  <p className="text-xs text-white/40 mt-1.5">
                    {formatCurrency(formData.budget)}
                  </p>
                )}
              </div>

              {/* Architect */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Architecte assigné
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    value={formData.architect}
                    onChange={(e) => setFormData({ ...formData, architect: e.target.value })}
                    placeholder="Nom de l'architecte"
                    className="h-11 pl-10 bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium text-white/70 mb-2 block">
                  Description du projet
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails, objectifs, spécifications..."
                  className="min-h-[100px] bg-white/5 border-white/10 text-[#EAEAEA] rounded-xl focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300/80">
                  <strong>Note:</strong> Le projet sera créé avec le statut "Nouveau" et pourra être suivi depuis le panel client.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!formData.type.trim()}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Créer le projet
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-6 bg-white/5 hover:bg-white/10 text-[#EAEAEA] rounded-xl border border-white/10"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
