"use client"

import { Home, Users, LogOut, Settings, CalendarDays } from "lucide-react"
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
  { name: "Clients & Projets", href: "/clients", icon: Users },
  { name: "Tâches & Rappels", href: "/tasks", icon: CalendarDays },
  { name: "Calendrier", href: "/calendar", icon: CalendarDays },
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
        if (updates > 0 && pathname !== '/tasks') {
          toast.info(`${updates} mise(s) à jour de tâches depuis votre dernière visite`, { duration: 3500 })
        }
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
              baseNav[2], // Tâches & Rappels
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
              <span className="font-medium text-sm flex-1">{item.name}</span>
              {item.href === "/tasks" && (
                <span className="ml-auto inline-flex items-center gap-2">
                  {myNewTasks > 0 && (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_0_3px_rgba(239,68,68,0.25)]" />
                  )}
                  {myPendingTasks > 0 && (
                    <span className={cn(
                      "min-w-[1.5rem] h-6 px-2 inline-flex items-center justify-center rounded-full text-xs font-semibold border",
                      isActive
                        ? "bg-white/15 border-white/30 text-white"
                        : "bg-primary/15 border-primary/30 text-primary"
                    )}>
                      {myPendingTasks}
                    </span>
                  )}
                  {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'operator') && adminUpdatesCount > 0 && (
                    <span className={cn(
                      "min-w-[1.5rem] h-6 px-2 inline-flex items-center justify-center rounded-full text-xs font-semibold border",
                      isActive
                        ? "bg-blue-400/20 border-blue-400/40 text-blue-100"
                        : "bg-blue-400/15 border-blue-400/30 text-blue-300"
                    )}>
                      {adminUpdatesCount}
                    </span>
                  )}
                </span>
              )}
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
