"use client"

import { useState, useEffect, useRef } from "react"
import { Search, User, Shield, X, Loader2, Check, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface UserOption {
  id: string
  name: string
  email?: string
  role: string
}

interface UserAutocompleteProps {
  value?: string
  onValueChange: (userId: string) => void
  users: UserOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  admin: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-400/30" },
  architect: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-400/30" },
  commercial: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/30" },
  manager: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-400/30" },
  magasiner: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-400/30" },
}

const getRoleColor = (role: string) => {
  const normalizedRole = role.toLowerCase()
  return roleColors[normalizedRole] || { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-400/30" }
}

export function UserAutocomplete({
  value,
  onValueChange,
  users,
  placeholder = "Sélectionner un utilisateur...",
  className,
  disabled = false,
  isLoading = false,
}: UserAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedUser = users.find((u) => u.id === value)

  // Filter users based on search query, maintaining architect priority
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    
    let filtered: UserOption[] = []
    
    if (!query.trim()) {
      // When no search, show all users (already sorted by priority from parent)
      filtered = users.slice(0, 10)
    } else {
      // When searching, filter but maintain architect priority
      filtered = users
        .filter((user) => {
          const searchableText = [user.name, user.email || "", user.role].join(" ").toLowerCase()
          return searchableText.includes(query)
        })
        .slice(0, 10)
      
      // Re-sort to maintain priority: architects first, then admins
      filtered.sort((a, b) => {
        const roleA = (a.role || "").toLowerCase()
        const roleB = (b.role || "").toLowerCase()
        
        if (roleA === "architect" || roleA === "architecte") {
          if (roleB === "architect" || roleB === "architecte") return 0
          return -1
        }
        if (roleB === "architect" || roleB === "architecte") return 1
        if (roleA === "admin") {
          if (roleB === "admin") return 0
          return -1
        }
        if (roleB === "admin") return 1
        return 0
      })
    }

    setFilteredUsers(filtered)
    setSelectedIndex(-1)
  }, [searchQuery, users])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredUsers.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredUsers.length) {
          handleSelectUser(filteredUsers[selectedIndex])
        }
        break
      case "Escape":
        setIsOpen(false)
        setSearchQuery("")
        break
    }
  }

  const handleSelectUser = (user: UserOption) => {
    onValueChange(user.id)
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange("")
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (disabled || isLoading) return
    if (isOpen) {
      setIsOpen(false)
      setSearchQuery("")
    } else {
      setIsOpen(true)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const parts = text.split(new RegExp(`(${query})`, "gi"))
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-violet-500/30 text-violet-200 font-semibold">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    )
  }

  // Calculate dropdown position to avoid overflow
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: string; bottom?: string }>({})
  
  useEffect(() => {
    if (isOpen && dropdownRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const dropdownHeight = 320 // max height
      
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition({ bottom: "100%" })
      } else {
        setDropdownPosition({ top: "100%" })
      }
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Select Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled || isLoading}
          className={cn(
            "w-full h-11 px-3 pr-10 bg-white/10 border border-white/10 text-white rounded-lg",
            "flex items-center justify-between gap-2 transition-all",
            "hover:bg-white/15 hover:border-white/20",
            "focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50",
            disabled && "cursor-not-allowed opacity-80",
            isLoading && "cursor-wait"
          )}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <User className="h-4 w-4 text-violet-300 flex-shrink-0" />
            {selectedUser ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate">{selectedUser.name}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0", getRoleColor(selectedUser.role).bg, getRoleColor(selectedUser.role).text)}>
                  {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-300/60 truncate">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {selectedUser && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-violet-300 animate-spin" />
            ) : (
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            )}
          </div>
        </button>
      )}

      {/* Search Input (shown when open) */}
      {isOpen && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300 z-10 pointer-events-none" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un utilisateur..."
            disabled={disabled || isLoading}
            className={cn(
              "pl-10 pr-10 h-11 bg-white/10 border border-white/10 text-white placeholder:text-slate-300/60 rounded-lg text-sm",
              "focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/50 transition-all",
              disabled && "cursor-not-allowed opacity-80",
            )}
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              setSearchQuery("")
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={dropdownPosition}
              className={cn(
                "absolute left-0 right-0 z-[200] mt-1.5 rounded-lg border border-white/10 bg-slate-900/98 backdrop-blur-xl shadow-2xl overflow-hidden",
                dropdownPosition.bottom && "mb-1.5 mt-0 bottom-full"
              )}
            >
              {isLoading ? (
                <div className="p-6 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <span className="text-sm text-slate-300">Chargement des utilisateurs...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="p-1.5">
                    {filteredUsers.map((user, index) => {
                      const roleColor = getRoleColor(user.role)
                      const isSelected = user.id === value
                      return (
                        <motion.button
                          key={user.id}
                          type="button"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => handleSelectUser(user)}
                          className={cn(
                            "w-full px-3 py-2.5 rounded-lg text-left transition-all relative group",
                            "hover:bg-white/10 active:scale-[0.99]",
                            selectedIndex === index && "bg-white/10 ring-1 ring-violet-400/30",
                            isSelected && "bg-violet-500/20 border border-violet-400/30",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-sm font-medium text-white truncate">
                                {searchQuery ? highlightMatch(user.name, searchQuery) : user.name}
                              </span>
                              <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0 border", roleColor.bg, roleColor.text, roleColor.border)}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-slate-400">Aucun résultat pour "{searchQuery}"</p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
