"use client"

import { Home, Users, LogOut, Settings, CalendarDays, Compass, Calendar, Briefcase, Bell } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Signature8Logo } from "@/components/signature8-logo"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useMemo, useEffect, useState, useCallback, useTransition } from "react"
import { motion, LayoutGroup } from "framer-motion"
import { TasksService } from "@/lib/tasks-service"
import { toast } from "sonner"
import { getVisibleSidebarItems, getRoleLabel } from "@/lib/permissions"
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

// Icon mapping for sidebar items
const iconMap: Record<string, any> = {
  Home,
  Users,
  Briefcase,
  Compass,
  CalendarDays,
  Calendar,
  Bell,
  Settings,
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isPending, startTransition] = useTransition()

  // Tasks badge state
  const [myPendingTasks, setMyPendingTasks] = useState<number>(0)
  const [myNewTasks, setMyNewTasks] = useState<number>(0)
  const [adminUpdatesCount, setAdminUpdatesCount] = useState<number>(0)

  // Optimized navigation with prefetch and transition
  const handleNavigation = useCallback((href: string) => {
    // Prefetch the route
    router.prefetch(href)
    
    // Use startTransition for non-blocking updates
    startTransition(() => {
      router.push(href)
    })
  }, [router])

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
    <>
    <aside className="w-72 glass border-r border-border/40 flex flex-col h-screen fixed top-0 left-0 z-30 backdrop-blur-2xl bg-slate-950/95">
      {/* Logo */}
      <div className="p-6 border-b border-border/40 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <Signature8Logo size={48} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Signature8</h1>
            <p className="text-xs text-muted-foreground font-medium">CRM Tailor-Made</p>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/30 scrollbar-track-transparent">
        <LayoutGroup id="sidebar-nav">
        {useMemo(() => {
          const role = user?.role
          
          // Special case for commercial - they have their own dashboard
          if (role?.toLowerCase() === 'commercial') {
            return [
              { name: "Mes Leads", href: "/commercial", icon: Home },
            ]
          }
          
          // Use the permissions system for all other roles
          const visibleItems = getVisibleSidebarItems(role)
          
          return visibleItems.map(item => {
            // Customize label for architects
            let displayLabel = item.label
            if (role?.toLowerCase() === 'architect' && item.id === 'contacts') {
              displayLabel = "Mes Contacts Assignés"
            }
            
            return {
              name: displayLabel,
              href: item.href,
              icon: iconMap[item.icon] || Home
            }
          })
        }, [user?.role]).map((item, index) => {
          const isActive = pathname === item.href || (item.href === "/architectes" && pathname.startsWith("/architectes/"))
          return (
            <motion.button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              disabled={isPending}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-left block"
              style={{ cursor: isPending ? 'progress' : 'pointer' }}
            >
              <motion.div
                layout
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3.5 rounded-2xl group overflow-hidden transition-all duration-150",
                  isActive
                    ? "text-sky-50"
                    : "text-muted-foreground hover:text-foreground",
                  isPending && "opacity-60 pointer-events-none"
                )}
                transition={{ type: "spring", stiffness: 350, damping: 35, mass: 0.9 }}
              >
                {isActive && (
                  <>
                    {/* Background glow effect */}
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(56,189,248,0.85) 0%, rgba(59,130,246,0.95) 100%)",
                        boxShadow: "0 0 32px rgba(56,189,248,0.7), 0 0 64px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                      }}
                      transition={{ type: "spring", stiffness: 330, damping: 32, mass: 1 }}
                    />
                    
                    {/* Animated outer glow */}
                    <motion.div
                      layoutId="sidebar-active-glow-outer"
                      className="pointer-events-none absolute -inset-2 rounded-3xl blur-xl"
                      style={{
                        background: "radial-gradient(circle, rgba(56,189,248,0.6) 0%, rgba(59,130,246,0.3) 50%, transparent 100%)",
                      }}
                      animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    />
                    
                    {/* Inner shimmer glow */}
                    <motion.div
                      layoutId="sidebar-active-glow-inner"
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                      }}
                      animate={{ x: [-100, 100] }}
                      transition={{ duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    />
                  </>
                )}
                
                {/* Icon with enhanced glow */}
                <motion.div
                  className="relative z-10"
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: "mirror" }}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isActive
                        ? "drop-shadow-[0_0_20px_rgba(56,189,248,0.95)] drop-shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                        : "group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]",
                    )}
                  />
                </motion.div>

                {/* Text label */}
                <span className="relative z-10 flex-1 truncate text-sm font-semibold">{item.name}</span>

                {/* Task badges */}
                {item.href === "/tasks" && (
                  <span className="ml-auto inline-flex items-center gap-2 relative z-10">
                    {/* New Tasks - Red Pulse Dot */}
                    {myNewTasks > 0 && (
                      <motion.span
                        className="relative inline-flex h-3 w-3"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-lg shadow-red-500/70"></span>
                      </motion.span>
                    )}
                    {/* Pending Tasks - Badge */}
                    {myPendingTasks > 0 && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                          "min-w-[1.75rem] h-7 px-2.5 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-lg transition-all duration-200",
                          isActive
                            ? "bg-white text-primary shadow-white/30 font-extrabold"
                            : "bg-gradient-to-r from-primary to-blue-500 text-white shadow-primary/50 animate-pulse",
                        )}>
                        {myPendingTasks}
                      </motion.span>
                    )}
                    {/* Admin Updates - Toaster Style Badge */}
                    {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'operator') && adminUpdatesCount > 0 && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                          "min-w-[1.75rem] h-7 px-2.5 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-lg border-2 transition-all duration-200",
                          isActive
                            ? "bg-orange-500 border-orange-300 text-white shadow-orange-500/40 font-extrabold"
                            : "bg-gradient-to-r from-orange-400 to-amber-500 border-orange-300 text-white shadow-orange-500/50 animate-pulse",
                        )}>
                        {adminUpdatesCount}
                      </motion.span>
                    )}
                  </span>
                )}
              </motion.div>
            </motion.button>
          )
        })}
        </LayoutGroup>
      </nav>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="shrink-0 border-t border-border/40 bg-background/50 backdrop-blur-sm"
        >
          <div className="p-4 space-y-3">
            <div className="glass rounded-2xl p-3 space-y-1.5 border border-border/40 hover:border-border/60 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-sky-400/50 ring-2 ring-sky-400/20">
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 via-sky-400 to-sky-600 text-white font-bold text-sm">
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
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                      {getRoleLabel(user.role)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-11 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200 group"
                  >
                    <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    <span className="font-medium">Déconnexion</span>
                  </Button>
                </motion.div>
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
        </motion.div>
      )}
    </aside>
    {/* Spacer to offset fixed sidebar width in layouts */}
    <div className="w-72 shrink-0" aria-hidden />
    </>
  )
}

