"use client"

import { Search, Plus, User, LogOut } from "lucide-react"
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
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"

interface HeaderProps {
  onCreateLead?: () => void
  searchQuery?: string
  onSearchChange?: (q: string) => void
}

export function Header({ onCreateLead, searchQuery = "", onSearchChange }: HeaderProps) {
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
    <header className="glass border-b border-border/40 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un lead..."
            value={localQuery}
            onChange={(e) => {
              const v = e.target.value
              setLocalQuery(v)
              onSearchChange?.(v)
            }}
            className="h-11 rounded-lg pl-10 glass border-border/40 focus:border-primary/50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user?.role?.toLowerCase() === "admin" && pathname === "/" && (
            <Button
              onClick={onCreateLead}
              className="bg-linear-to-r from-primary to-premium hover:opacity-90 transition-opacity glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau lead
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="glass hover:bg-secondary rounded-full relative group">
                <Avatar className="h-9 w-9 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <span className="text-xs text-primary font-medium">
                        {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout()} 
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
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
