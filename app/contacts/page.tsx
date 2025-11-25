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
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [statusFilter, setStatusFilter] = useState<string>('') // '' = Tous, 'prospect' = Contact, 'client' = Client
  const [selectedArchitect, setSelectedArchitect] = useState<string>('')
  const [hasOpportunitiesFilter, setHasOpportunitiesFilter] = useState<'all' | 'has' | 'no'>('all')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('')
  const [pipelineFilter, setPipelineFilter] = useState<string>('') // Admin only
  
  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const ITEMS_PER_PAGE = 20
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

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
        tag: statusFilter || undefined,
        architectId: selectedArchitect || undefined,
        limit: ITEMS_PER_PAGE,
        offset,
      })

      // Apply client-side filters
      let filtered = result.data
      
      // Filter by opportunities
      if (hasOpportunitiesFilter !== 'all') {
        filtered = filtered.filter(c => {
          const hasOpps = (c as any).opportunities?.length > 0
          return hasOpportunitiesFilter === 'has' ? hasOpps : !hasOpps
        })
      }
      
      // Filter by city
      if (cityFilter) {
        filtered = filtered.filter(c => 
          c.ville?.toLowerCase() === cityFilter.toLowerCase()
        )
      }
      
      // Filter by project type
      if (projectTypeFilter) {
        filtered = filtered.filter(c => {
          const opportunities = (c as any).opportunities || []
          return opportunities.some((opp: any) => opp.type === projectTypeFilter)
        })
      }
      
      // Filter by pipeline (Admin only)
      if (isAdmin && pipelineFilter) {
        filtered = filtered.filter(c => c.status === pipelineFilter)
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

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return
    
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      toast.success('Contact supprimé avec succès')
      loadContacts(page)
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Erreur lors de la suppression du contact')
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

  const hasActiveFilters = statusFilter || selectedArchitect || hasOpportunitiesFilter !== 'all' || cityFilter || projectTypeFilter || pipelineFilter

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-x-hidden bg-linear-to-b from-[rgb(17,21,33)] via-[rgb(11,14,24)] to-[rgb(7,9,17)]">
          <Header />

          {/* Page Title - Show "Mes Contacts Assignés" for Architects */}
          {isArchitect && (
            <div className="px-6 pt-6 pb-2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <Briefcase className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-white">Mes Contacts Assignés</h1>
                <span className="text-sm text-slate-400 ml-2">({total} contact{total !== 1 ? 's' : ''})</span>
              </motion.div>
              <p className="text-sm text-slate-400 mt-2 ml-9">
                Tous les contacts qui vous ont été assignés
              </p>
            </div>
          )}

          {/* Stats Cards - ONLY 3 ESSENTIAL CARDS */}
          <div className="px-6 pt-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Contacts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(59,130,246,0.6)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    ) : (
                      <Users className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Total Contacts</p>
                    <p className="text-2xl font-bold text-white">{loading ? '...' : total}</p>
                  </div>
                </div>
              </motion.div>

              {/* Contacts avec Opportunités */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(249,115,22,0.55)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Avec Opportunités</p>
                    <p className="text-2xl font-bold text-white">{loading ? '...' : contactsWithOpportunities}</p>
                  </div>
                </div>
              </motion.div>

              {/* Clients (with at least 1 won opportunity) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass relative overflow-hidden rounded-xl px-4 py-4 border border-slate-600/40 shadow-[0_12px_35px_-20px_rgba(34,197,94,0.55)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    {loading ? (
                      <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Clients</p>
                    <p className="text-2xl font-bold text-white">{loading ? '...' : clientsCount}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 pb-4">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom, téléphone, email..."
                      className="pl-10 border-slate-600/30 bg-slate-800/50 text-white placeholder:text-slate-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filters Section - Minimal & Clean */}
              <div className="glass rounded-xl border border-slate-600/30 shadow-[0_18px_48px_-28px_rgba(59,130,246,0.65)]">
                <div className="flex items-center justify-between p-3 gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  >
                    <Filter className="w-5 h-5 text-primary" />
                    <span className="font-medium text-white">Filtres</span>
                    {hasActiveFilters && (
                      <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-medium">
                        {(statusFilter ? 1 : 0) + 
                         (selectedArchitect ? 1 : 0) + 
                         (hasOpportunitiesFilter !== 'all' ? 1 : 0) + 
                         (cityFilter ? 1 : 0) + 
                         (projectTypeFilter ? 1 : 0) + 
                         (pipelineFilter ? 1 : 0)} actif{((statusFilter ? 1 : 0) + (selectedArchitect ? 1 : 0) + (hasOpportunitiesFilter !== 'all' ? 1 : 0) + (cityFilter ? 1 : 0) + (projectTypeFilter ? 1 : 0) + (pipelineFilter ? 1 : 0)) > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-white transition-transform ml-auto",
                        isFiltersOpen && "rotate-180"
                      )}
                    />
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setStatusFilter('')
                        setSelectedArchitect('')
                        setHasOpportunitiesFilter('all')
                        setCityFilter('')
                        setProjectTypeFilter('')
                        setPipelineFilter('')
                      }}
                      className="text-xs text-muted-foreground hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Réinitialiser
                    </button>
                  )}
                </div>

                {isFiltersOpen && (
                  <div className="border-t border-slate-600/30 px-4 py-4 bg-slate-900/40 space-y-4">
                    {/* Status Filter */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Statut</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Tous', value: '' },
                          { label: 'Prospect', value: 'prospect' },
                          { label: 'Client', value: 'client' },
                        ].map((filter) => (
                          <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              statusFilter === filter.value
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* City Filter */}
                    {cities.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          Ville
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[100px] overflow-y-auto">
                          <button
                            onClick={() => setCityFilter('')}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              cityFilter === ''
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            Toutes
                          </button>
                          {cities.map((city) => (
                            <button
                              key={city}
                              onClick={() => setCityFilter(city)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 truncate",
                                cityFilter === city
                                  ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                              )}
                              title={city}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Type de Projet Filter */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Home className="w-3.5 h-3.5" />
                        Type de projet
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => setProjectTypeFilter('')}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            projectTypeFilter === ''
                              ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          )}
                        >
                          Tous
                        </button>
                        {projectTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setProjectTypeFilter(type)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize",
                              projectTypeFilter === type
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            {type === 'villa' ? 'Villa' :
                             type === 'appartement' ? 'Appartement' :
                             type === 'magasin' ? 'Magasin' :
                             type === 'bureau' ? 'Bureau' :
                             type === 'riad' ? 'Riad' :
                             type === 'studio' ? 'Studio' :
                             type === 'renovation' ? 'Rénovation' :
                             'Autre'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pipeline Filter - Admin Only */}
                    {isAdmin && (
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Pipeline Stage</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Tous', value: '' },
                            { label: 'Qualifié', value: 'qualifie' },
                            { label: 'Prise de besoin', value: 'prise_de_besoin' },
                            { label: 'Acompte reçu', value: 'acompte_recu' },
                            { label: 'Perdu', value: 'perdu' },
                          ].map((filter) => (
                            <button
                              key={filter.value}
                              onClick={() => setPipelineFilter(filter.value)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                pipelineFilter === filter.value
                                  ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Opportunities Filter */}
                    <div>
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" />
                        Opportunités
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Toutes', value: 'all' },
                          { label: '1+ Opportunité', value: 'has' },
                          { label: 'Aucune', value: 'no' },
                        ].map((filter) => (
                          <button
                            key={filter.value}
                            onClick={() => setHasOpportunitiesFilter(filter.value as any)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              hasOpportunitiesFilter === filter.value
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Architect Filter - Hidden for Architects */}
                    {!isAdmin && architects.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Architecte assigné</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto">
                          <button
                            onClick={() => setSelectedArchitect('')}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              selectedArchitect === ''
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            Tous
                          </button>
                          {architects.map((architect) => (
                            <button
                              key={architect}
                              onClick={() => setSelectedArchitect(architect)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 truncate",
                                selectedArchitect === architect
                                  ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                              )}
                              title={architect}
                            >
                              {architect}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show architect filter for Admin */}
                    {isAdmin && architects.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Architecte assigné</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[120px] overflow-y-auto">
                          <button
                            onClick={() => setSelectedArchitect('')}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                              selectedArchitect === ''
                                ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                            )}
                          >
                            Tous
                          </button>
                          {architects.map((architect) => (
                            <button
                              key={architect}
                              onClick={() => setSelectedArchitect(architect)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 truncate",
                                selectedArchitect === architect
                                  ? "bg-primary text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                              )}
                              title={architect}
                            >
                              {architect}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto px-6 pb-6">
            <ContactsTable
              contacts={contacts}
              onRowClick={handleContactClick}
              onEditContact={isAdmin ? handleEditContact : undefined}
              onDeleteContact={isAdmin ? handleDeleteContact : undefined}
              isLoading={loading}
            />

            {/* Pagination */}
            {!loading && contacts.length > 0 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-slate-400">
                  Page {page} • {contacts.length} contact{contacts.length > 1 ? 's' : ''} affiché{contacts.length > 1 ? 's' : ''}
                </div>
                
                <div className="flex gap-2">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page - 1)}
                      className="gap-2 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
                    >
                      ← Précédent
                    </Button>
                  )}
                  
                  {hasMore && (
                    <Button
                      variant="outline"
                      onClick={() => loadContacts(page + 1)}
                      className="gap-2 border-slate-600/30 text-slate-300 hover:text-white hover:bg-slate-700/50"
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
