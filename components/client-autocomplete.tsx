"use client"

import { useState, useEffect, useRef } from "react"
import { Search, User, Phone, MapPin, X, Loader2, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import type { Client } from "@/types/client"

interface ClientAutocompleteProps {
  onSelectClient: (client: Client) => void
  placeholder?: string
  className?: string
  clients: Client[]
  isLoading?: boolean
}

export function ClientAutocomplete({ 
  onSelectClient, 
  placeholder = "Rechercher un client par nom, ville, téléphone...",
  className,
  clients,
  isLoading = false
}: ClientAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients([])
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = clients.filter(client => {
      const searchableText = [
        client.nom,
        client.telephone,
        client.ville,
        client.typeProjet,
      ].join(' ').toLowerCase()
      
      return searchableText.includes(query)
    }).slice(0, 8) // Limit to 8 results

    setFilteredClients(filtered)
    setSelectedIndex(-1)
  }, [searchQuery, clients])

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
          prev < filteredClients.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredClients.length) {
          handleSelectClient(filteredClients[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelectClient = (client: Client) => {
    onSelectClient(client)
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchQuery("")
    setFilteredClients([])
    inputRef.current?.focus()
  }

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-primary/30 text-primary font-semibold">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    )
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
          onFocus={() => searchQuery.trim() && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-12 pr-10 h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        {isOpen && searchQuery.trim() && (
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
                <span className="text-sm text-slate-300">Chargement des clients...</span>
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {/* Client Results */}
                <div className="p-1.5">
                  <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Clients trouvés ({filteredClients.length})
                  </p>
                  {filteredClients.map((client, index) => (
                    <motion.button
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all",
                        "hover:bg-slate-800 active:scale-[0.98]",
                        selectedIndex === index && "bg-slate-800 ring-2 ring-primary/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-white">
                            {client.nom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white mb-1">
                            {highlightMatch(client.nom, searchQuery)}
                          </p>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              <Phone className="w-3 h-3" />
                              {highlightMatch(client.telephone, searchQuery)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              <MapPin className="w-3 h-3" />
                              {highlightMatch(client.ville, searchQuery)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600/20 text-blue-300 text-xs rounded-full">
                              <Building2 className="w-3 h-3" />
                              {client.typeProjet}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 text-xs rounded-full font-medium",
                              client.statutProjet === "termine" && "bg-green-600/20 text-green-300",
                              client.statutProjet === "livraison" && "bg-teal-600/20 text-teal-300",
                              client.statutProjet === "en_chantier" && "bg-purple-600/20 text-purple-300",
                              client.statutProjet === "en_conception" && "bg-blue-600/20 text-blue-300",
                              client.statutProjet === "acompte_verse" && "bg-orange-600/20 text-orange-300",
                              client.statutProjet === "nouveau" && "bg-slate-600/20 text-slate-300"
                            )}>
                              {client.statutProjet === "termine" ? "Terminé" : 
                               client.statutProjet === "livraison" ? "Livraison" :
                               client.statutProjet === "en_chantier" ? "En chantier" :
                               client.statutProjet === "en_conception" ? "En conception" :
                               client.statutProjet === "acompte_verse" ? "Acompte versé" : "Nouveau"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : searchQuery.trim() ? (
              <div className="p-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Aucun client trouvé</p>
                  <p className="text-xs text-slate-400">
                    Aucun résultat pour "{searchQuery}"
                  </p>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
