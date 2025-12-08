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
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { AuthGuard } from '@/components/auth-guard'
import { ContactService } from '@/lib/contact-service'
import { Contact, OpportunityType, LeadStatus } from '@/types/contact'
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
  const isGestionnaire = user?.role?.toLowerCase() === 'gestionnaire'
  const isArchitect = user?.role?.toLowerCase() === 'architect'
  const canManageContacts = isAdmin || isGestionnaire // Admin and Gestionnaire can edit/delete

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all') // Filter by leadStatus
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

      // Filter by lead status
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.leadStatus === statusFilter)
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
      // IMPORTANT: Always include converted contacts even if tag filter is set
      if (isAdmin && pipelineFilter !== 'all') {
        filtered = filtered.filter(c => 
          c.tag === pipelineFilter || c.tag === 'converted' // Always show converted contacts
        )
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

  // Handle delete contact - called from ContactsTable after successful deletion
  const handleDeleteContact = async (contactId: string) => {
    console.log('[Contacts Page] Contact deleted, reloading list...')
    // Reload the contacts list to reflect the deletion
    await loadContacts(page)
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
            <div className="px-3 md:px-4 pt-3 md:pt-4 pb-1">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 md:gap-2"
              >
                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <h1 className="text-base md:text-lg font-bold text-white">Mes Contacts Assignés</h1>
                <span className="text-[10px] md:text-xs text-slate-400 ml-1">({total} contact{total !== 1 ? 's' : ''})</span>
              </motion.div>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 ml-5.5 md:ml-7">
                Tous les contacts qui vous ont été assignés
              </p>
            </div>
          )}

          {/* Stats Cards - ONLY 3 ESSENTIAL CARDS */}
          <div className="px-3 md:px-4 pt-2 md:pt-3 pb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {/* Total Contacts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-white leading-tight">{loading ? '...' : total}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Contacts</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      {loading ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <Users className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Contacts avec Opportunités */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Avec</p>
                    <p className="text-2xl font-bold text-white leading-tight">{loading ? '...' : contactsWithOpportunities}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Opportunités</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      {loading ? (
                        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      ) : (
                        <Briefcase className="w-5 h-5 text-orange-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Clients (with at least 1 won opportunity) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 p-3 hover:border-green-500/30 transition-all duration-300 sm:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 mb-0.5 uppercase tracking-wider">Clients</p>
                    <p className="text-2xl font-bold text-green-400 leading-tight">{loading ? '...' : clientsCount}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Clients</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      {loading ? (
                        <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-3 md:px-4 pb-2 mb-3">
            <div className="space-y-2">
              {/* Search Bar */}
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom, téléphone, email..."
                      className="pl-9 h-8 text-xs border-slate-600/30 bg-slate-800/50 text-white placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filters Section - Minimal & Clean */}
              <div className="glass rounded-lg border border-slate-600/30 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.65)]">
                <div className="flex items-center justify-between p-2 gap-2">
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-white">Filtres</span>
                    {hasActiveFilters && (
                      <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
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
                        "w-3 h-3 text-white transition-transform ml-auto",
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
                      className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3 h-3" />
                      <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                  )}
                </div>

                {isFiltersOpen && (
                  <div className="border-t border-slate-600/30 px-2.5 py-2.5 bg-slate-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {/* Status Filter (Lead Status) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Statut Lead</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all" className="text-white">Tous</SelectItem>
                            <SelectItem value="nouveau" className="text-white">Nouveau</SelectItem>
                            <SelectItem value="a_recontacter" className="text-white">À recontacter</SelectItem>
                            <SelectItem value="sans_reponse" className="text-white">Sans réponse</SelectItem>
                            <SelectItem value="non_interesse" className="text-white">Non intéressé</SelectItem>
                            <SelectItem value="qualifie" className="text-white">Qualifié</SelectItem>
                            <SelectItem value="refuse" className="text-white">Refusé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* City Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Ville
                        </label>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Type de projet
                        </label>
                        <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                          <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
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
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          Opportunités
                        </label>
                        <Select value={hasOpportunitiesFilter} onValueChange={setHasOpportunitiesFilter}>
                          <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
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
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            Architecte assigné
                          </label>
                          <Select value={selectedArchitect} onValueChange={setSelectedArchitect}>
                            <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
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
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Tag</label>
                          <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                            <SelectTrigger className="h-8 text-xs w-full bg-slate-700/60 border-slate-600/40 text-white hover:border-blue-400/40 hover:bg-slate-700/80 transition-all">
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
          <div className="flex-1 overflow-auto px-3 md:px-4 pb-3 mt-1">
            <ContactsTable
              contacts={contacts}
              onRowClick={handleContactClick}
              onEditContact={canManageContacts ? handleEditContact : undefined}
              onDeleteContact={canManageContacts ? handleDeleteContact : undefined}
              isLoading={loading}
            />

            {/* Pagination */}
            {!loading && contacts.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-2">
                <div className="text-[10px] md:text-xs text-slate-400">
                  Page {page} • {contacts.length} contact{contacts.length > 1 ? 's' : ''} affiché{contacts.length > 1 ? 's' : ''}
                </div>

                <div className="flex gap-1.5">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page - 1)}
                      className="gap-1 text-xs h-7 px-2.5 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      ← Précédent
                    </Button>
                  )}

                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page + 1)}
                      className="gap-1 text-xs h-7 px-2.5 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      Suivant →
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

      </div>
    </AuthGuard>
  )
}
