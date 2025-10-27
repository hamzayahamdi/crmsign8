"use client"

import { useState, useEffect, useRef } from "react"
import { Search, User, Phone, MapPin, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { Lead } from "@/types/lead"

interface LeadAutocompleteProps {
  onSelectLead: (lead: Lead) => void
  onCreateNew: () => void
  placeholder?: string
  className?: string
}

export function LeadAutocomplete({ 
  onSelectLead, 
  onCreateNew, 
  placeholder = "Rechercher un lead existant...",
  className 
}: LeadAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load leads from API
  useEffect(() => {
    const loadLeads = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch('/api/leads?limit=1000', {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (response.ok) {
          const data = await response.json()
          setLeads(data.data || [])
        }
      } catch (error) {
        console.error('Error loading leads:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLeads()
  }, [])

  // Filter leads based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads([])
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = leads.filter(lead => {
      const searchableText = [
        lead.nom,
        lead.telephone,
        lead.ville,
        lead.typeBien,
      ].join(' ').toLowerCase()
      
      return searchableText.includes(query)
    }).slice(0, 8) // Limit to 8 results

    setFilteredLeads(filtered)
    setSelectedIndex(-1)
  }, [searchQuery, leads])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredLeads.length ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === -1 || selectedIndex === filteredLeads.length) {
          onCreateNew()
          setIsOpen(false)
        } else if (selectedIndex >= 0 && selectedIndex < filteredLeads.length) {
          handleSelectLead(filteredLeads[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelectLead = (lead: Lead) => {
    onSelectLead(lead)
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchQuery("")
    setFilteredLeads([])
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn("relative w-full isolate", isOpen && "z-[110]", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-12 pr-10 h-14 bg-slate-700/60 border-slate-500/50 text-white placeholder:text-slate-400 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (searchQuery.trim() || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[120] w-full mt-2 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          >
            {isLoading ? (
              <div className="p-6 flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-slate-300">Chargement des leads...</span>
              </div>
            ) : filteredLeads.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {/* Lead Results */}
                <div className="p-1.5">
                  <p className="px-3 py-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Leads trouvés ({filteredLeads.length})
                  </p>
                  {filteredLeads.map((lead, index) => (
                    <motion.button
                      key={lead.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleSelectLead(lead)}
                      className={cn(
                        "w-full p-2 rounded-lg text-left transition-all",
                        "hover:bg-slate-800 active:scale-[0.98]",
                        selectedIndex === index && "bg-slate-800 ring-2 ring-primary/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-white">
                            {lead.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{lead.nom}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              <Phone className="w-3 h-3" />
                              {lead.telephone}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              <MapPin className="w-3 h-3" />
                              {lead.ville}
                            </span>
                          </div>
                          {lead.typeBien && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-600/20 text-blue-300 text-xs rounded-full">
                              {lead.typeBien}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Create New Option */}
                <div className="border-t border-slate-700 p-2">
                  <button
                    onClick={() => {
                      onCreateNew()
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full p-2.5 rounded-lg text-left transition-all",
                      "hover:bg-slate-800 active:scale-[0.98]",
                      "border-2 border-dashed border-slate-700 hover:border-primary/50",
                      selectedIndex === filteredLeads.length && "bg-slate-800 border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">+ Ajouter un nouveau client</p>
                        <p className="text-xs text-slate-300">Créer un client manuellement</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : searchQuery.trim() ? (
              <div className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Aucun lead trouvé</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Aucun résultat pour "{searchQuery}"
                  </p>
                  <button
                    onClick={() => {
                      onCreateNew()
                      setIsOpen(false)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Créer un nouveau client
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
