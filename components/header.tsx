"use client"

import { Search, Plus, User, LogOut, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { hasPermission } from "@/lib/permissions"

interface HeaderProps {
  onCreateLead?: () => void
  onImportLeads?: () => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
}

export function Header({ onCreateLead, onImportLeads, searchQuery = "", onSearchChange }: HeaderProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="bg-[rgb(13,17,28)]/90 backdrop-blur-xl border-b border-[rgb(30,41,59)] px-6 py-4 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Rechercher un lead..."
            value={localQuery}
            onChange={(e) => {
              const v = e.target.value
              setLocalQuery(v)
              onSearchChange?.(v)
            }}
            className="h-11 rounded-lg pl-10 bg-[rgb(15,20,32)] border-[rgb(30,41,59)] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {pathname === "/" && (
            <>
              {user?.role?.toLowerCase() === "admin" && onImportLeads && (
                <Button
                  onClick={onImportLeads}
                  variant="outline"
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 transition-all bg-transparent"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </Button>
              )}
              {hasPermission(user?.role, 'leads', 'create') && onCreateLead && (
                <Button
                  onClick={onCreateLead}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau lead
                </Button>
              )}
            </>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-white/[0.05] rounded-full relative group bg-transparent">
                <Avatar className="h-9 w-9 ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[rgb(15,20,32)] border-[rgb(30,41,59)]">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none truncate text-white">{user?.name}</p>
                    <p className="text-xs leading-none text-gray-400 truncate">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <span className="text-xs text-blue-400 font-medium">
                        {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout()} 
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
