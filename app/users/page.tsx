"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { Users, Plus, Trash2, Edit, Mail, Shield, Calendar, Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"

interface User {
  id: string
  email: string
  name: string
  role: string
  magasin?: string
  ville?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "architect",
    magasin: "",
    ville: "",
    phone: "",
  })

  const [editFormData, setEditFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "architect",
    magasin: "",
    ville: "",
    phone: "",
  })

  const MAGASINS = ["Casa - Ain Diab", "Rabat", "Tanger", "Marrakech", "Bouskoura"]
  const VILLES = ["Casablanca", "Rabat", "Tanger", "MARRAKECH", "Fes", "Agadir", "Autre"]

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        toast.error("Erreur lors du chargement des utilisateurs")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  // Open edit dialog
  const openEditUser = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role as any,
      magasin: user.magasin || "",
      ville: user.ville || "",
      phone: user.phone || "",
    })
    setShowEditDialog(true)
  }

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editFormData.email,
          name: editFormData.name,
          role: editFormData.role,
          magasin: editFormData.role === "magasiner" ? editFormData.magasin : undefined,
          ville: editFormData.ville || undefined,
          phone: editFormData.phone || undefined,
          password: editFormData.password || undefined,
        }),
      })

      if (response.ok) {
        toast.success("Utilisateur mis à jour")
        setShowEditDialog(false)
        setSelectedUser(null)
        setEditFormData({ email: "", password: "", name: "", role: "architect", magasin: "", ville: "", phone: "" })
        fetchUsers()
      } else {
        const data = await response.json()
        toast.error(data.error || "Erreur lors de la mise à jour")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Erreur de connexion")
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (formData.role === "magasiner" && !formData.magasin) {
        toast.error("Veuillez sélectionner un magasin pour un magasiner")
        return
      }
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success("Utilisateur créé avec succès")
        setShowCreateDialog(false)
        setFormData({ email: "", password: "", name: "", role: "architect", magasin: "", ville: "", phone: "" })
        fetchUsers() // Refresh the list
      } else {
        const data = await response.json()
        toast.error(data.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Erreur de connexion")
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Utilisateur supprimé avec succès")
        setShowDeleteDialog(false)
        setSelectedUser(null)
        fetchUsers() // Refresh the list
      } else {
        toast.error("Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Erreur de connexion")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "architect":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "magasiner":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "operator":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "gestionnaire":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      case "commercial":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "chef_de_chantier":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "Administrateur"
      case "architect":
        return "Architecte"
      case "magasiner":
        return "Responsable magasinier"
      case "operator":
        return "Opérateur"
      case "gestionnaire":
        return "Gestionnaire de Projets"
      case "commercial":
        return "Commercial"
      case "chef_de_chantier":
        return "Chef de chantier"
      default:
        return role
    }
  }

  // Sorting functionality
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />
    }
    return sortOrder === 'asc' ?
      <ArrowUp className="w-3 h-3" /> :
      <ArrowDown className="w-3 h-3" />
  }

  // Sorted users
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date fields
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle string fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [users, sortField, sortOrder])

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['Admin', 'Operator']}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
              {/* Header */}
              <div className="glass border-b border-border/40 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-premium flex items-center justify-center glow">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white">Utilisateurs</h1>
                      <p className="text-muted-foreground">
                        {users.length} utilisateur{users.length !== 1 ? "s" : ""} au total
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-gradient-to-r from-primary to-premium hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel utilisateur
                  </Button>
                </div>
              </div>

              {/* Users Table */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Chargement des utilisateurs...</p>
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Aucun utilisateur</h3>
                      <p className="text-muted-foreground mb-4">Commencez par créer votre premier utilisateur</p>
                      <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-gradient-to-r from-primary to-premium"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un utilisateur
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-xl border border-border/40 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-border/40 bg-secondary/40 backdrop-blur supports-[backdrop-filter]:bg-secondary/30">
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-2">
                                Nom {getSortIcon('name')}
                              </div>
                            </th>
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => handleSort('email')}
                            >
                              <div className="flex items-center gap-2">
                                Email {getSortIcon('email')}
                              </div>
                            </th>
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide"
                            >
                              Téléphone
                            </th>
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => handleSort('role')}
                            >
                              <div className="flex items-center gap-2">
                                Rôle {getSortIcon('role')}
                              </div>
                            </th>
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => handleSort('createdAt')}
                            >
                              <div className="flex items-center gap-2">
                                Date de création {getSortIcon('createdAt')}
                              </div>
                            </th>
                            <th
                              className="text-left p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => handleSort('updatedAt')}
                            >
                              <div className="flex items-center gap-2">
                                Dernière mise à jour {getSortIcon('updatedAt')}
                              </div>
                            </th>
                            <th className="text-right p-4 text-xs md:text-sm font-semibold text-white/90 tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedUsers.map((user, index) => (
                            <motion.tr
                              key={user.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-border/10 hover:bg-secondary/20 transition-colors"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center text-white font-semibold">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-white font-medium">{user.name}</span>
                                    {user.role === "magasiner" && user.magasin && (
                                      <span className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                        <Building2 className="w-3 h-3" /> 📍 {user.magasin}
                                      </span>
                                    )}
                                    {user.role === "architect" && user.ville && (
                                      <span className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                        📍 {user.ville}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 text-foreground">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  {user.email}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="text-sm text-white/80">
                                  {user.phone || "-"}
                                </div>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                                    user.role
                                  )}`}
                                >
                                  <Shield className="w-3 h-3" />
                                  {getRoleLabel(user.role)}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(user.createdAt)}
                                </div>
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {formatDate(user.updatedAt)}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditUser(user)}
                                    className="hover:bg-blue-500/10"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setShowDeleteDialog(true)
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Create User Dialog */}
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="glass border-border/40">
                  <DialogHeader>
                    <DialogTitle className="text-white">Créer un nouvel utilisateur</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouvel utilisateur au système
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Nom complet</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          required
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-white">Téléphone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+212..."
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">Mot de passe</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-white">Rôle</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => setFormData({ ...formData, role: value })}
                        >
                          <SelectTrigger className="glass border-border/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass border-border/40">
                            <SelectGroup>
                              <SelectLabel>👑 Administration</SelectLabel>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="operator">Opérateur</SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>💼 Gestion & Ventes</SelectLabel>
                              <SelectItem value="gestionnaire">Gestionnaire de Projets</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>🏗️ Opérations</SelectLabel>
                              <SelectItem value="architect">Architecte</SelectItem>
                              <SelectItem value="magasiner">Responsable magasinier</SelectItem>
                              <SelectItem value="chef_de_chantier">Chef de chantier</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.role === "magasiner" && (
                        <div className="space-y-2">
                          <Label htmlFor="magasin" className="text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-400" />
                            Magasin <span className="text-red-400">*</span>
                          </Label>
                          <Select
                            value={formData.magasin}
                            onValueChange={(value) => setFormData({ ...formData, magasin: value })}
                          >
                            <SelectTrigger className="glass border-border/40">
                              <SelectValue placeholder="Sélectionner un magasin" />
                            </SelectTrigger>
                            <SelectContent className="glass border-border/40">
                              {MAGASINS.map((mag) => (
                                <SelectItem key={mag} value={mag}>
                                  📍 {mag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Le responsable magasinier ne pourra voir que les leads de ce magasin
                          </p>
                        </div>
                      )}
                      {formData.role === "architect" && (
                        <div className="space-y-2">
                          <Label htmlFor="ville" className="text-white flex items-center gap-2">
                            📍 Ville
                          </Label>
                          <Select
                            value={formData.ville}
                            onValueChange={(value) => setFormData({ ...formData, ville: value })}
                          >
                            <SelectTrigger className="glass border-border/40">
                              <SelectValue placeholder="Sélectionner une ville" />
                            </SelectTrigger>
                            <SelectContent className="glass border-border/40">
                              {VILLES.map((ville) => (
                                <SelectItem key={ville} value={ville}>
                                  📍 {ville}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            La ville de l'architecte sera affichée lors de l'assignation
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                        className="glass border-border/40"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-primary to-premium"
                      >
                        Créer
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="glass border-border/40">
                  <DialogHeader>
                    <DialogTitle className="text-white">Modifier l'utilisateur</DialogTitle>
                    <DialogDescription>
                      Mettez à jour les informations de l'utilisateur
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateUser}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-white">Nom complet</Label>
                        <Input
                          id="edit-name"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          placeholder="John Doe"
                          required
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-email" className="text-white">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone" className="text-white">Téléphone</Label>
                        <Input
                          id="edit-phone"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          placeholder="+212..."
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-password" className="text-white">Nouveau mot de passe (optionnel)</Label>
                        <Input
                          id="edit-password"
                          type="password"
                          value={editFormData.password}
                          onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                          placeholder="Laisser vide pour ne pas changer"
                          className="glass border-border/40"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-role" className="text-white">Rôle</Label>
                        <Select
                          value={editFormData.role}
                          onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
                        >
                          <SelectTrigger className="glass border-border/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass border-border/40">
                            <SelectGroup>
                              <SelectLabel>👑 Administration</SelectLabel>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="operator">Opérateur</SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>💼 Gestion & Ventes</SelectLabel>
                              <SelectItem value="gestionnaire">Gestionnaire de Projets</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>🏗️ Opérations</SelectLabel>
                              <SelectItem value="architect">Architecte</SelectItem>
                              <SelectItem value="magasiner">Responsable magasinier</SelectItem>
                              <SelectItem value="chef_de_chantier">Chef de chantier</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      {editFormData.role === "magasiner" && (
                        <div className="space-y-2">
                          <Label htmlFor="edit-magasin" className="text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-400" />
                            Magasin <span className="text-red-400">*</span>
                          </Label>
                          <Select
                            value={editFormData.magasin}
                            onValueChange={(value) => setEditFormData({ ...editFormData, magasin: value })}
                          >
                            <SelectTrigger className="glass border-border/40">
                              <SelectValue placeholder="Sélectionner un magasin" />
                            </SelectTrigger>
                            <SelectContent className="glass border-border/40">
                              {MAGASINS.map((mag) => (
                                <SelectItem key={mag} value={mag}>
                                  📍 {mag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Le magasiner ne pourra voir que les leads de ce magasin
                          </p>
                        </div>
                      )}
                      {editFormData.role === "architect" && (
                        <div className="space-y-2">
                          <Label htmlFor="edit-ville" className="text-white flex items-center gap-2">
                            📍 Ville
                          </Label>
                          <Select
                            value={editFormData.ville}
                            onValueChange={(value) => setEditFormData({ ...editFormData, ville: value })}
                          >
                            <SelectTrigger className="glass border-border/40">
                              <SelectValue placeholder="Sélectionner une ville" />
                            </SelectTrigger>
                            <SelectContent className="glass border-border/40">
                              {VILLES.map((ville) => (
                                <SelectItem key={ville} value={ville}>
                                  📍 {ville}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            La ville de l'architecte sera affichée lors de l'assignation
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowEditDialog(false)}
                        className="glass border-border/40"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-primary to-premium"
                      >
                        Enregistrer
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="glass border-border/40 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer l'utilisateur{" "}
                      <span className="font-semibold text-white">{selectedUser?.name}</span> ?
                      Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                      className="glass border-border/40"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteUser}
                    >
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </RoleGuard>
    </AuthGuard>
  )
}
