"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, User, Mail, Phone, MapPin, Briefcase, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ArchitectSpecialty, ArchitectStatus } from "@/types/architect"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AddArchitectModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (architectData: {
    userId: string
    telephone: string
    ville: string
    specialite: ArchitectSpecialty
    statut: ArchitectStatus
    bio?: string
  }) => void
}

export function AddArchitectModal({ isOpen, onClose, onAdd }: AddArchitectModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [telephone, setTelephone] = useState("")
  const [ville, setVille] = useState("")
  const [specialite, setSpecialite] = useState<ArchitectSpecialty>("residentiel")
  const [statut, setStatut] = useState<ArchitectStatus>("actif")
  const [bio, setBio] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch architect users from API
  useEffect(() => {
    if (isOpen) {
      fetchArchitectUsers()
    }
  }, [isOpen])

  const fetchArchitectUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const allUsers = await response.json()
        // Filter only architects
        const architects = allUsers.filter((u: User) => 
          u.role.toLowerCase() === "architect" || u.role.toLowerCase() === "architecte"
        )
        setUsers(architects)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUserId || !telephone || !ville) {
      return
    }

    onAdd({
      userId: selectedUserId,
      telephone,
      ville,
      specialite,
      statut,
      bio: bio || undefined,
    })

    // Reset form
    setSelectedUserId("")
    setTelephone("")
    setVille("")
    setSpecialite("residentiel")
    setStatut("actif")
    setBio("")
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl border border-slate-600/30 shadow-2xl z-50"
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Ajouter un architecte
                  </h2>
                  <p className="text-sm text-slate-400">
                    Sélectionnez un utilisateur architecte et complétez ses informations
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </motion.button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Utilisateur architecte
                  </Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="h-12 bg-slate-800/60 border-slate-600/60 text-white rounded-xl">
                      <SelectValue placeholder="Sélectionner un architecte..." />
                    </SelectTrigger>
                    <SelectContent className="glass border-slate-600/30">
                      {users.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">
                          Aucun utilisateur architecte trouvé
                        </div>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-white">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-primary" />
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-slate-400">{user.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="glass rounded-lg p-3 border border-green-500/30 bg-green-500/10"
                    >
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">{selectedUser.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400">{selectedUser.email}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Telephone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Téléphone
                    </Label>
                    <Input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+212 6XX XXX XXX"
                      className="h-12 bg-slate-800/60 border-slate-600/60 text-white placeholder:text-slate-500 rounded-xl"
                      required
                    />
                  </div>

                  {/* Ville */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Ville
                    </Label>
                    <Select value={ville} onValueChange={setVille}>
                      <SelectTrigger className="h-12 bg-slate-800/60 border-slate-600/60 text-white rounded-xl">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent className="glass border-slate-600/30">
                        <SelectItem value="Casablanca" className="text-white">Casablanca</SelectItem>
                        <SelectItem value="Rabat" className="text-white">Rabat</SelectItem>
                        <SelectItem value="Marrakech" className="text-white">Marrakech</SelectItem>
                        <SelectItem value="Tanger" className="text-white">Tanger</SelectItem>
                        <SelectItem value="Fès" className="text-white">Fès</SelectItem>
                        <SelectItem value="Agadir" className="text-white">Agadir</SelectItem>
                        <SelectItem value="Meknès" className="text-white">Meknès</SelectItem>
                        <SelectItem value="Oujda" className="text-white">Oujda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specialite */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Spécialité
                    </Label>
                    <Select value={specialite} onValueChange={(v) => setSpecialite(v as ArchitectSpecialty)}>
                      <SelectTrigger className="h-12 bg-slate-800/60 border-slate-600/60 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass border-slate-600/30">
                        <SelectItem value="residentiel" className="text-white">Résidentiel</SelectItem>
                        <SelectItem value="commercial" className="text-white">Commercial</SelectItem>
                        <SelectItem value="industriel" className="text-white">Industriel</SelectItem>
                        <SelectItem value="renovation" className="text-white">Rénovation</SelectItem>
                        <SelectItem value="luxe" className="text-white">Luxe</SelectItem>
                        <SelectItem value="mixte" className="text-white">Mixte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Statut */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Statut
                    </Label>
                    <Select value={statut} onValueChange={(v) => setStatut(v as ArchitectStatus)}>
                      <SelectTrigger className="h-12 bg-slate-800/60 border-slate-600/60 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass border-slate-600/30">
                        <SelectItem value="actif" className="text-white">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            Actif
                          </span>
                        </SelectItem>
                        <SelectItem value="inactif" className="text-white">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Inactif
                          </span>
                        </SelectItem>
                        <SelectItem value="conge" className="text-white">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            En congé
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bio (Optional) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white">
                    Bio (optionnel)
                  </Label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Description courte de l'architecte..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/60 border border-slate-600/60 text-white placeholder:text-slate-500 rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl border-slate-600/60 text-slate-300 hover:bg-slate-700/50"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={!selectedUserId || !telephone || !ville}
                    className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl font-medium shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter l'architecte
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
