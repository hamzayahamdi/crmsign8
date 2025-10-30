"use client"

import { Home, Users, LogOut, Settings, CalendarDays, Compass, Calendar } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Signature8Logo } from "@/components/signature8-logo"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useMemo, useEffect, useState } from "react"
import { TasksService } from "@/lib/tasks-service"
import { toast } from "sonner"
import { motion } from "framer-motion"
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

const baseNav = [
  { name: "Tableau des Leads", href: "/", icon: Home },
  { name: "Clients & Opportunités", href: "/clients", icon: Users },
  { name: "Architectes", href: "/architectes", icon: Compass },
  { name: "Tâches & Rappels", href: "/tasks", icon: CalendarDays },
  { name: "Calendrier", href: "/calendrier", icon: Calendar },
] as const

const adminOperatorExtras = [
  { name: "Utilisateurs", href: "/users", icon: Users },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Tasks badge state
  const [myPendingTasks, setMyPendingTasks] = useState<number>(0)
  const [myNewTasks, setMyNewTasks] = useState<number>(0)
  const [adminUpdatesCount, setAdminUpdatesCount] = useState<number>(0)

  // Load tasks count for the signed-in user and compute new tasks since last seen
  useEffect(() => {
    const loadMyTasks = async () => {
      if (!user?.name) return

      // If user is on tasks page, mark as seen
      const lastSeenKey = `tasks_last_seen_${user.name}`
      if (pathname === "/tasks") {
        localStorage.setItem(lastSeenKey, new Date().toISOString())
      }

      try {
        const tasks = await TasksService.getMyTasks(user.name)
        const pending = tasks.filter(t => t.status !== "termine").length
        setMyPendingTasks(pending)

        const lastSeenStr = localStorage.getItem(lastSeenKey)
        const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0)
        const newlyCreated = tasks.filter(t => new Date(t.createdAt) > lastSeen).length
        setMyNewTasks(newlyCreated)
      } catch (e) {
        setMyPendingTasks(0)
        setMyNewTasks(0)
      }
    }

    loadMyTasks()

    // Admin/operator: compute tasks updated since last seen, and toast
    const loadAdminUpdates = async () => {
      const role = (user?.role || '').toLowerCase()
      if (role !== 'admin' && role !== 'operator') {
        setAdminUpdatesCount(0)
        return
      }

      const adminSeenKey = `tasks_admin_last_seen`
      if (pathname === '/tasks') {
        localStorage.setItem(adminSeenKey, new Date().toISOString())
      }

      try {
        const allTasks = await TasksService.getTasks()
        const lastSeenStr = localStorage.getItem(adminSeenKey)
        const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(0)
        const updates = allTasks.filter(t => new Date(t.updatedAt) > lastSeen).length
        setAdminUpdatesCount(updates)
        // Removed toast notification - using sidebar badge instead
      } catch {
        setAdminUpdatesCount(0)
      }
    }

    loadAdminUpdates()
  }, [user?.name, pathname])

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
              baseNav[0], // Tableau des Leads
              baseNav[1], // Clients & Projets
              baseNav[3], // Tâches & Rappels
              baseNav[4], // Calendrier
            ]
          }
          if (role === 'commercial') {
            return [
              { name: "Mes Leads", href: "/commercial", icon: Home },
            ]
          }
          if (role === 'magasiner') {
            return [
              { name: "Mes Leads", href: "/magasiner", icon: Home },
            ]
          }
          if (role === 'admin' || role === 'operator') {
            return [
              ...baseNav,
              ...adminOperatorExtras,
              ...(role === 'admin' ? [{ name: 'Paramètres', href: '/settings', icon: Settings }] : []),
            ]
          }
          return [baseNav[0]]
        }, [user?.role]).map((item) => {
          const isActive = pathname === item.href || (item.href === "/architectes" && pathname.startsWith("/architectes/"))
          return (
            <Link key={item.name} href={item.href} className="block">
              <div
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 group",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/25 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
                    transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-200 relative z-[1]",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )} />
                <span className="font-medium text-sm flex-1 relative z-[1] truncate">
                  {item.name}
                </span>
              {item.href === "/tasks" && (
                <span className="ml-auto inline-flex items-center gap-2 relative z-[1]">
                  {/* New Tasks - Red Pulse Dot */}
                  {myNewTasks > 0 && (
                    <span className="relative inline-flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-lg shadow-red-500/50"></span>
                    </span>
                  )}
                  {/* Pending Tasks - Badge */}
                  {myPendingTasks > 0 && (
                    <span className={cn(
                      "min-w-[1.75rem] h-7 px-2.5 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-lg",
                      isActive
                        ? "bg-white text-primary shadow-white/20"
                        : "bg-gradient-to-r from-primary to-blue-500 text-white shadow-primary/30 animate-pulse"
                    )}>
                      {myPendingTasks}
                    </span>
                  )}
                  {/* Admin Updates - Toaster Style Badge */}
                  {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'operator') && adminUpdatesCount > 0 && (
                    <span className={cn(
                      "min-w-[1.75rem] h-7 px-2.5 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-lg border-2",
                      isActive
                        ? "bg-orange-500 border-orange-300 text-white shadow-orange-500/30"
                        : "bg-gradient-to-r from-orange-400 to-amber-500 border-orange-300 text-white shadow-orange-500/40 animate-pulse"
                    )}>
                      {adminUpdatesCount}
                    </span>
                  )}
                </span>
              )}
              </div>
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
                      {(user.role || '').toLowerCase() === 'admin' ? 'Administrateur' : (user.role || '').toLowerCase() === 'operator' ? 'Opérateur' : (user.role || '').toLowerCase() === 'commercial' ? 'Commercial' : (user.role || '').toLowerCase() === 'magasiner' ? 'Magasiner' : 'Architecte'}
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
