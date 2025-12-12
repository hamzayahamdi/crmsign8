"use client"

import { useUIStore } from "@/stores/ui-store"
import { Search, Plus, User, LogOut, Upload, Menu, Command } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notification-bell"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { hasPermission } from "@/lib/permissions"
import { CommandMenu } from "@/components/command-menu"

interface HeaderProps {
  onCreateLead?: () => void
  onImportLeads?: () => void
  onCreateTask?: () => void
  onCreateContact?: () => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
}

export function Header({ 
  onCreateLead, 
  onImportLeads, 
  onCreateTask,
  onCreateContact,
  searchQuery = "", 
  onSearchChange 
}: HeaderProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const { toggleMobileMenu } = useUIStore()

  // Keyboard shortcut for command menu (Cmd/Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandMenuOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="bg-[rgb(13,17,28)]/90 backdrop-blur-xl border-b border-[rgb(30,41,59)] px-4 md:px-6 py-3 md:py-4 sticky top-0">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 -ml-2 mr-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Command Menu Trigger - Hidden on mobile, visible on md+ */}
        <div className="hidden md:flex flex-1 max-w-xl">
          <Button
            variant="outline"
            onClick={() => setCommandMenuOpen(true)}
            className="h-12 w-full justify-start rounded-xl bg-gradient-to-br from-[rgb(15,20,32)] to-[rgb(12,16,26)] text-slate-400 hover:text-white focus:text-white transition-all group relative overflow-hidden border-2 border-transparent bg-clip-padding"
            style={{
              background: 'linear-gradient(rgb(15, 20, 32), rgb(12, 16, 26)) padding-box, linear-gradient(135deg, rgba(56,189,248,0.3), rgba(139,92,246,0.3), rgba(59,130,246,0.3)) border-box',
            }}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
            
            <Search className="mr-3 h-5 w-5 shrink-0 relative z-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span className="flex-1 text-left text-sm relative z-10">Rechercher des pages, clients, contacts, tâches...</span>
            <div className="flex items-center gap-1 ml-3 shrink-0 relative z-10">
              <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded-md border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/10 px-2 font-mono text-[10px] font-medium text-blue-300 opacity-100 sm:flex shadow-lg shadow-blue-500/20 backdrop-blur-sm">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
          </Button>
        </div>

        {/* Spacer for mobile to push actions to the right */}
        <div className="flex-1 md:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {pathname === "/" && (
            <>
              {user?.role?.toLowerCase() === "admin" && onImportLeads && (
                <Button
                  onClick={onImportLeads}
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all bg-transparent h-8 md:h-9 text-[11px] md:text-xs"
                >
                  <Upload className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden md:inline">Importer</span>
                </Button>
              )}
              {hasPermission(user?.role, 'leads', 'create') && onCreateLead && (
                <Button
                  onClick={onCreateLead}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all shadow-lg shadow-blue-500/20 h-8 md:h-9 text-[11px] md:text-xs px-3 md:px-4"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden sm:inline">Nouveau lead</span>
                </Button>
              )}
            </>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Section - Stunning Display */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* User Name Display - Hidden on mobile, visible on md+ */}
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-semibold text-white leading-tight">
                {user?.name || "Utilisateur"}
              </p>
              {user?.role && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {user.role === "admin" ? "Administrateur" : 
                   user.role === "operator" ? "Opérateur" :
                   user.role === "gestionnaire" ? "Gestionnaire" :
                   user.role === "architect" ? "Architecte" : "Utilisateur"}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/[0.05] rounded-full relative group bg-transparent h-9 w-9 md:h-10 md:w-10 p-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8 md:h-9 md:w-9 ring-2 ring-transparent group-hover:ring-blue-500/40 transition-all shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white font-semibold text-xs md:text-sm">
                        {user ? getInitials(user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-[rgb(13,17,28)] shadow-lg" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 md:w-64 bg-[rgb(15,20,32)] border-[rgb(30,41,59)]">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2 md:gap-3 py-1 md:py-2">
                  <Avatar className="h-9 w-9 md:h-10 md:w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs md:text-sm">
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 flex-1 min-w-0">
                    <p className="text-[11px] md:text-xs font-semibold leading-none truncate text-white">{user?.name}</p>
                    <p className="text-[9px] md:text-[10px] leading-none text-gray-400 truncate">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <span className="text-[9px] md:text-[10px] text-blue-400 font-medium">
                        {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer text-xs md:text-sm"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Command Menu */}
      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        onCreateLead={onCreateLead}
        onCreateTask={onCreateTask}
        onCreateContact={onCreateContact}
      />
    </header>
  )
}
