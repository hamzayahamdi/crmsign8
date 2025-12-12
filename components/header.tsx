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
    <header className="bg-[rgb(13,17,28)]/90 backdrop-blur-xl border-b border-[rgb(30,41,59)] px-4 md:px-6 py-3 md:py-4 sticky top-0 z-20">
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
            className="h-12 w-full justify-start rounded-lg bg-[rgb(15,20,32)] border-[rgb(30,41,59)] text-slate-400 hover:bg-[rgb(20,25,37)] hover:border-blue-500/50 hover:text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all group"
          >
            <Search className="mr-3 h-5 w-5 shrink-0" />
            <span className="flex-1 text-left text-sm">Rechercher des pages, clients, contacts, tâches...</span>
            <div className="flex items-center gap-1 ml-3 shrink-0">
              <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded-md border border-slate-600/50 bg-[rgb(20,25,37)] px-2 font-mono text-[10px] font-medium text-slate-400 opacity-100 sm:flex shadow-sm">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/[0.05] rounded-full relative group bg-transparent h-9 w-9 md:h-10 md:w-10">
                <Avatar className="h-8 w-8 md:h-9 md:w-9 ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs md:text-sm">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
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
