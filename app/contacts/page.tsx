"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Loader2,
  Users,
  Briefcase,
  X,
  ChevronDown,
  UserCheck,
  MapPin,
  Home,
  UserCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { AuthGuard } from '@/components/auth-guard'
import { ContactService } from '@/lib/contact-service'
import { Contact, OpportunityType } from '@/types/contact'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ContactsTable } from '@/components/contacts-table'
import { useAuth } from '@/contexts/auth-context'

/**
 * Contacts Page - CRM Best Practices
 * Clean, minimal, focused on opportunities management
 * Following Zoho CRM / HubSpot standards
 */
export default function ContactsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isArchitect = user?.role?.toLowerCase() === 'architect'

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all') // 'all', 'prospect', 'client'
  const [selectedArchitect, setSelectedArchitect] = useState<string>('all')
  const [hasOpportunitiesFilter, setHasOpportunitiesFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all')
  const [pipelineFilter, setPipelineFilter] = useState<string>('all') // Admin only

  // Architect data from API
  const [allArchitects, setAllArchitects] = useState<Array<{ id: string, name: string }>>([])

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const ITEMS_PER_PAGE = 20

  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Fetch architects from API
  useEffect(() => {
    const fetchArchitects = async () => {
      try {
        const response = await fetch('/api/architects')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setAllArchitects(result.data.map((arch: any) => ({
              id: arch.id,
              name: `${arch.prenom} ${arch.nom}`.trim() || arch.email
            })))
          }
        }
      } catch (error) {
        console.error('Error fetching architects:', error)
      }
    }
    fetchArchitects()
  }, [])

  useEffect(() => {
    setPage(1) // Reset to page 1 when filters change
    loadContacts(1)
  }, [searchQuery, statusFilter, selectedArchitect, hasOpportunitiesFilter, cityFilter, projectTypeFilter, pipelineFilter])

  const loadContacts = async (pageNum: number = page) => {
    try {
      setLoading(true)
      const offset = (pageNum - 1) * ITEMS_PER_PAGE

      const result = await ContactService.getContacts({
        search: searchQuery,
        architectId: selectedArchitect !== 'all' ? selectedArchitect : undefined,
        limit: ITEMS_PER_PAGE,
        offset,
      })

      // Apply client-side filters
      let filtered = result.data

      // Filter by status (workflow stage)
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter)
      }

      // Filter by opportunities
      if (hasOpportunitiesFilter !== 'all') {
        filtered = filtered.filter(c => {
          const hasOpps = (c as any).opportunities?.length > 0
          return hasOpportunitiesFilter === 'has' ? hasOpps : !hasOpps
        })
      }

      // Filter by city
      if (cityFilter !== 'all') {
        filtered = filtered.filter(c =>
          c.ville?.toLowerCase() === cityFilter.toLowerCase()
        )
      }

      // Filter by project type
      if (projectTypeFilter !== 'all') {
        filtered = filtered.filter(c => {
          const opportunities = (c as any).opportunities || []
          return opportunities.some((opp: any) => opp.type === projectTypeFilter)
        })
      }

      // Filter by tag (Admin only)
      if (isAdmin && pipelineFilter !== 'all') {
        filtered = filtered.filter(c => c.tag === pipelineFilter)
      }

      setContacts(filtered)
      setTotal(result.total)
      setHasMore(result.hasMore && filtered.length >= ITEMS_PER_PAGE)
      setPage(pageNum)
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Erreur lors du chargement des contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleContactClick = (contactId: string) => {
    router.push(`/contacts/${contactId}`)
  }

  const handleEditContact = (contactId: string) => {
    // TODO: Implement edit modal or navigate to edit page
    toast.info('Fonction de modification à venir')
  }

  const [contactToDelete, setContactToDelete] = useState<string | null>(null)

  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId)
  }

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return

    try {
      const response = await fetch(`/api/contacts/${contactToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      toast.success('Contact supprimé avec succès')
      setContactToDelete(null)
      loadContacts(page)
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Erreur lors de la suppression du contact')
      setContactToDelete(null)
    }
  }

  // Calculate statistics - ONLY what's needed
  const contactsWithOpportunities = contacts.filter(c => (c as any).opportunities?.length > 0).length
  const clientsCount = contacts.filter(c => c.tag === 'client').length

  // Get unique values for filters
  const architects = Array.from(new Set(
    contacts
      .filter(c => c.architecteAssigne)
      .map(c => c.architecteAssigne)
  )) as string[]

  const cities = Array.from(new Set(
    contacts
      .filter(c => c.ville)
      .map(c => c.ville)
  )) as string[]

  const projectTypes: OpportunityType[] = ['villa', 'appartement', 'magasin', 'bureau', 'riad', 'studio', 'renovation', 'autre']

  const hasActiveFilters = statusFilter !== 'all' || selectedArchitect !== 'all' || hasOpportunitiesFilter !== 'all' || cityFilter !== 'all' || projectTypeFilter !== 'all' || pipelineFilter !== 'all'

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)] w-full">
          <Header />

          {/* Page Title - Show "Mes Contacts Assignés" for Architects */}
          {isArchitect && (
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 md:gap-3"
              >
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold text-white">Mes Contacts Assignés</h1>
                <span className="text-xs md:text-sm text-slate-400 ml-1 md:ml-2">({total} contact{total !== 1 ? 's' : ''})</span>
              </motion.div>
              <p className="text-xs md:text-sm text-slate-400 mt-2 ml-7 md:ml-9">
                Tous les contacts qui vous ont été assignés
              </p>
            </div>
          )}

          {/* Stats Cards - ONLY 3 ESSENTIAL CARDS */}
          <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Total Contacts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass relative overflow-hidden rounded-lg md:rounded-xl px-3 md:px-4 py-3 md:py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(59,130,246,0.6)]"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-blue-400 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">Total Contacts</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{loading ? '...' : total}</p>
                  </div>
                </div>
              </motion.div>

              {/* Contacts avec Opportunités */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass relative overflow-hidden rounded-lg md:rounded-xl px-3 md:px-4 py-3 md:py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(249,115,22,0.55)]"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-orange-400 animate-spin" />
                    ) : (
                      <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">Avec Opportunités</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{loading ? '...' : contactsWithOpportunities}</p>
                  </div>
                </div>
              </motion.div>

              {/* Clients (with at least 1 won opportunity) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass relative overflow-hidden rounded-lg md:rounded-xl px-3 md:px-4 py-3 md:py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(34,197,94,0.55)] sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">Clients</p>
                    <p className="text-xl md:text-2xl font-bold text-white">{loading ? '...' : clientsCount}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-4 md:px-6 pb-3 md:pb-4 mb-6 md:mb-8">
            <div className="space-y-3 md:space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom, téléphone, email..."
                      className="pl-10 h-10 md:h-11 text-sm border-slate-600/30 bg-slate-800/50 text-white placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filters Section - Minimal & Clean */}
              <div className="glass rounded-lg md:rounded-xl border border-slate-600/30 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.65)]">
                <div className="flex items-center justify-between p-2.5 md:p-3 gap-2 md:gap-3">
                  <div
                    className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <Filter className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span className="text-sm md:text-base font-medium text-white">Filtres</span>
                    {hasActiveFilters && (
                      <span className="bg-primary/20 text-primary px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium">
                        {(statusFilter !== 'all' ? 1 : 0) +
                          (selectedArchitect !== 'all' ? 1 : 0) +
                          (hasOpportunitiesFilter !== 'all' ? 1 : 0) +
                          (cityFilter !== 'all' ? 1 : 0) +
                          (projectTypeFilter !== 'all' ? 1 : 0) +
                          (pipelineFilter !== 'all' ? 1 : 0)} actif{((statusFilter !== 'all' ? 1 : 0) + (selectedArchitect !== 'all' ? 1 : 0) + (hasOpportunitiesFilter !== 'all' ? 1 : 0) + (cityFilter !== 'all' ? 1 : 0) + (projectTypeFilter !== 'all' ? 1 : 0) + (pipelineFilter !== 'all' ? 1 : 0)) > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 md:w-4 md:h-4 text-white transition-transform ml-auto",
                        isFiltersOpen && "rotate-180"
                      )}
                    />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter('all')
                        setSelectedArchitect('all')
                        setHasOpportunitiesFilter('all')
                        setCityFilter('all')
                        setProjectTypeFilter('all')
                        setPipelineFilter('all')
                      }}
                      className="text-[10px] md:text-xs text-muted-foreground hover:text-white flex items-center gap-1 md:gap-1.5 transition-colors px-1.5 md:px-2 py-1 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  )}
                </div>

                {isFiltersOpen && (
                  <div className="border-t border-slate-600/30 px-3 md:px-4 py-3 md:py-4 bg-slate-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {/* Status Filter (Workflow Stage) */}
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-semibold text-slate-300 uppercase tracking-wider">Statut</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all" className="text-white">Tous</SelectItem>
                            <SelectItem value="qualifie" className="text-white">Qualifié</SelectItem>
                            <SelectItem value="prise_de_besoin" className="text-white">Prise de besoin</SelectItem>
                            <SelectItem value="acompte_recu" className="text-white">Acompte reçu</SelectItem>
                            <SelectItem value="perdu" className="text-white">Perdu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City Filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          Ville
                        </label>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600 max-h-72">
                            <SelectItem value="all" className="text-white">Toutes les villes</SelectItem>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city} className="text-white">
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Type de Projet Filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                          <Home className="w-3.5 h-3.5" />
                          Type de projet
                        </label>
                        <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                          <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all" className="text-white">Tous les types</SelectItem>
                            <SelectItem value="villa" className="text-white">Villa</SelectItem>
                            <SelectItem value="appartement" className="text-white">Appartement</SelectItem>
                            <SelectItem value="magasin" className="text-white">Magasin</SelectItem>
                            <SelectItem value="bureau" className="text-white">Bureau</SelectItem>
                            <SelectItem value="riad" className="text-white">Riad</SelectItem>
                            <SelectItem value="studio" className="text-white">Studio</SelectItem>
                            <SelectItem value="renovation" className="text-white">Rénovation</SelectItem>
                            <SelectItem value="autre" className="text-white">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Opportunities Filter */}
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                          <Briefcase className="w-3.5 h-3.5" />
                          Opportunités
                        </label>
                        <Select value={hasOpportunitiesFilter} onValueChange={setHasOpportunitiesFilter}>
                          <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all" className="text-white">Toutes</SelectItem>
                            <SelectItem value="has" className="text-white">1+ Opportunité</SelectItem>
                            <SelectItem value="no" className="text-white">Aucune</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Architect Filter - Show for all roles */}
                      {allArchitects.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] md:text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 md:gap-2">
                            <UserCircle className="w-3.5 h-3.5" />
                            Architecte assigné
                          </label>
                          <Select value={selectedArchitect} onValueChange={setSelectedArchitect}>
                            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 max-h-72">
                              <SelectItem value="all" className="text-white">Tous</SelectItem>
                              {allArchitects.map((architect) => (
                                <SelectItem key={architect.id} value={architect.name} className="text-white">
                                  {architect.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Tag Filter - Admin Only */}
                      {isAdmin && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tag</label>
                          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              <SelectItem value="all" className="text-white">Tous</SelectItem>
                              <SelectItem value="prospect" className="text-white">Prospect</SelectItem>
                              <SelectItem value="vip" className="text-white">VIP</SelectItem>
                              <SelectItem value="converted" className="text-white">Converti</SelectItem>
                              <SelectItem value="client" className="text-white">Client</SelectItem>
                              <SelectItem value="archived" className="text-white">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto px-4 md:px-6 pb-4 md:pb-6 mt-2">
            <ContactsTable
              contacts={contacts}
              onRowClick={handleContactClick}
              onEditContact={isAdmin ? handleEditContact : undefined}
              onDeleteContact={isAdmin ? handleDeleteContact : undefined}
              isLoading={loading}
            />

            {/* Pagination */}
            {!loading && contacts.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 md:mt-6">
                <div className="text-xs md:text-sm text-slate-400">
                  Page {page} • {contacts.length} contact{contacts.length > 1 ? 's' : ''} affiché{contacts.length > 1 ? 's' : ''}
                </div>

                <div className="flex gap-2">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page - 1)}
                      className="gap-1 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      ← Précédent
                    </Button>
                  )}

                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page + 1)}
                      className="gap-1 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      Suivant →
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={contactToDelete !== null} onOpenChange={(open) => !open && setContactToDelete(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-700/50 shadow-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  ⚠️
                </div>
                Supprimer ce contact ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300 text-sm leading-relaxed mt-2">
                Cette action est <span className="font-semibold text-red-400">irréversible</span>. Le contact et toutes ses données associées seront définitivement supprimés de la base de données.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-2">
              <AlertDialogCancel
                onClick={() => setContactToDelete(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white border-slate-600/50 transition-all"
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteContact}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-lg shadow-red-500/20"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  )
}
