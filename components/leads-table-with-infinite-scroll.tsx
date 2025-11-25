"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEnhancedInfiniteScroll } from '@/hooks/useEnhancedInfiniteScroll'
import { LeadsService } from '@/lib/leads-service'
import { LeadsTable } from '@/components/leads-table'
import { LeadModal } from '@/components/lead-modal'
import { ArchitectSelectionDialog } from '@/components/architect-selection-dialog-improved'
import type { Lead, LeadStatus, LeadPriority } from '@/types/lead'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LeadsTableWithInfiniteScrollProps {
  searchQuery?: string
  filters?: {
    status: 'all' | LeadStatus
    city: string
    type: string
    assigned: string
    priority: 'all' | LeadPriority
  }
}

export function LeadsTableWithInfiniteScroll({ 
  searchQuery = '',
  filters = {
    status: 'all',
    city: 'all',
    type: 'all',
    assigned: 'all',
    priority: 'all'
  }
}: LeadsTableWithInfiniteScrollProps) {
  const router = useRouter()
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isArchitectModalOpen, setIsArchitectModalOpen] = useState(false)
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null)

  // Use the enhanced infinite scroll hook with eager loading
  const {
    data: leads,
    loading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    currentPage,
    reset
  } = useEnhancedInfiniteScroll<Lead>(
    // Fetch function
    (params) => LeadsService.getLeads(params),
    
    // Initial params (can be extended with filters)
    {},
    
    // Page size - 50 items per page for optimal performance
    50,
    
    // Dependencies - triggers reset when filters change
    [filters.status, filters.city, filters.type, filters.assigned, filters.priority],
    
    // Enabled
    true,
    
    // Eager load - automatically fetch ALL data in background
    true
  )

  // Handle lead click
  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  // Handle lead deletion
  const handleDeleteLead = async (leadId: string) => {
    try {
      await LeadsService.deleteLead(leadId)
      // Reset and reload data after deletion
      reset()
    } catch (error) {
      console.error('Failed to delete lead:', error)
      alert('Failed to delete lead. Please try again.')
    }
  }

  // Handle modal close
  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setSelectedLead(null)
    }
  }

  // Handle lead save (create/update)
  const handleLeadSave = async () => {
    // Reset and reload data after save
    reset()
  }

  // Handle convert to client
  const handleConvertToClient = (lead: Lead) => {
    console.log('🔄 [Conversion] Opening architect selection modal for lead:', lead.id, lead.nom)
    setLeadToConvert(lead)
    setIsArchitectModalOpen(true)
  }

  // Handle architect selected
  const handleArchitectSelected = async (architectId: string) => {
    if (!leadToConvert) return

    console.log('🔄 [Conversion] Architect selected:', architectId || 'none', 'for lead:', leadToConvert.id)
    
    setIsArchitectModalOpen(false)
    const lead = leadToConvert
    setLeadToConvert(null)

    const loadingToast = toast.loading(`Conversion de ${lead.nom} en contact...`)

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.dismiss(loadingToast)
        toast.error("Non authentifié. Veuillez vous reconnecter.")
        return
      }

      const response = await fetch(`/api/contacts/convert-lead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          architectId: architectId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.dismiss(loadingToast)
        toast.error(errorData.error || "Échec de la conversion.")
        return
      }

      const data = await response.json()
      
      if (!data.contact || !data.contact.id) {
        toast.dismiss(loadingToast)
        toast.error("Conversion incomplète. Rechargez la page.")
        return
      }
      
      toast.dismiss(loadingToast)
      toast.success(`✨ ${lead.nom} a été converti en contact avec succès !`, {
        description: "Redirection vers le profil du contact...",
        duration: 2000,
      })
      
      // Reset and reload data
      reset()

      // Redirect to contact details page with conversion flag after a short delay
      const contactId = data.contact.id
      console.log('🔄 [Leads Table] Redirecting to:', `/contacts/${contactId}`)
      
      // Use setTimeout to ensure redirect happens after toast is shown
      // Use window.location.href for more reliable navigation
      setTimeout(() => {
        window.location.href = `/contacts/${contactId}?converted=true`
      }, 800)
      
    } catch (error) {
      console.error("❌ [Conversion] Error:", error)
      toast.dismiss(loadingToast)
      toast.error("Échec de la conversion. Veuillez réessayer.")
    }
  }

  // Loading state - first page
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={reset}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Loading indicator for background loading */}
      {isLoadingMore && (
        <div className="glass rounded-lg border border-blue-500/20 bg-blue-500/5 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-400">
                  Loading more data in background...
                </p>
                <p className="text-xs text-blue-300/70">
                  Page {currentPage} • {leads.length} of {totalCount} leads loaded
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-300/70">
                {Math.round((leads.length / totalCount) * 100)}% complete
              </p>
              <div className="w-32 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-300"
                  style={{ width: `${(leads.length / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success indicator when all data is loaded */}
      {!isLoadingMore && !hasMore && totalCount > 0 && (
        <div className="glass rounded-lg border border-green-500/20 bg-green-500/5 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">
                All data loaded successfully
              </p>
              <p className="text-xs text-green-300/70">
                {totalCount} leads ready to browse
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <LeadsTable
        leads={leads}
        onLeadClick={handleLeadClick}
        onDeleteLead={handleDeleteLead}
        onConvertToClient={handleConvertToClient}
        searchQuery={searchQuery}
        filters={filters}
      />

      {/* Lead Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          open={isModalOpen}
          onOpenChange={handleModalClose}
          onSave={handleLeadSave}
        />
      )}

      {/* Architect Selection Modal for Lead Conversion */}
      {leadToConvert && (
        <ArchitectSelectionDialog
          open={isArchitectModalOpen}
          onOpenChange={(open) => {
            setIsArchitectModalOpen(open)
            if (!open) {
              setLeadToConvert(null)
            }
          }}
          onBack={() => {
            setIsArchitectModalOpen(false)
            setLeadToConvert(null)
          }}
          onArchitectSelected={handleArchitectSelected}
          leadName={leadToConvert.nom}
        />
      )}
    </div>
  )
}
