"use client"

import { Home, Users, LogOut, UserCog } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Signature8Logo } from "@/components/signature8-logo"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const navigation = [
  { name: "Leads", href: "/", icon: Home },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Utilisateurs", href: "/users", icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="w-72 glass border-r border-border/40 flex flex-col h-screen sticky top-0 z-30 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Signature8Logo size={48} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Signature8</h1>
            <p className="text-xs text-muted-foreground font-medium">CRM Tailor-Made</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {useMemo(() => {
          const role = (user?.role || '').toLowerCase()
          if (role === 'architect') {
            return [
              { name: 'Mes Leads', href: '/', icon: Home },
              { name: 'Clients', href: '/clients', icon: Users },
            ]
          }
          if (role === 'admin' || role === 'operator') {
            return navigation
          }
          return [
            { name: 'Leads', href: '/', icon: Home },
          ]
        }, [user?.role]).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {user && (
        <div className="shrink-0 border-t border-border/40 bg-background/50 backdrop-blur-sm">
          <div className="p-4 space-y-3">
            <div className="glass rounded-xl p-3 space-y-1.5 border border-border/40">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/30 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground font-bold text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {user.role && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {(user.role || '').toLowerCase() === 'admin' ? 'Administrateur' : (user.role || '').toLowerCase() === 'operator' ? 'Opérateur' : 'Architecte'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-11 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200 group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span className="font-medium">Déconnexion</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/40">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">Confirmer la déconnexion</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à nouveau au CRM.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="hover:bg-accent">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Se déconnecter
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </aside>
  )
}
