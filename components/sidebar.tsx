"use client"

import { Home, Users, LogOut, Settings, CalendarDays, Compass, Calendar, Briefcase, Bell, Menu, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Signature8Logo } from "@/components/signature8-logo"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useMemo, useEffect, useState, useCallback, memo } from "react"
import { motion, LayoutGroup, AnimatePresence } from "framer-motion"
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
import { useUIStore } from "@/stores/ui-store"

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

const SidebarComponent = () => {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore() // Changed to useUIStore
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Tasks badge state
  const [myPendingTasks, setMyPendingTasks] = useState<number>(0)
  const [myNewTasks, setMyNewTasks] = useState<number>(0)
  const [adminUpdatesCount, setAdminUpdatesCount] = useState<number>(0)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false) // Changed to setMobileMenuOpen
  }, [pathname, setMobileMenuOpen]) // Added setMobileMenuOpen to dependencies

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  // Optimized instant navigation - no loading states to prevent flicker
  const handleNavigation = useCallback((href: string) => {
    // Don't navigate if already on this page
    if (href === pathname) {
      return
    }

    // Instant navigation without any loading state
    router.push(href)
  }, [router, pathname])

  // Prefetch routes on mount for instant navigation
  useEffect(() => {
    const role = user?.role
    let routes: string[] = []

    if (role?.toLowerCase() === 'commercial') {
      routes = ['/commercial']
    } else {
      const visibleItems = getVisibleSidebarItems(role)
      routes = visibleItems.map(item => item.href)
    }

    // Prefetch all routes immediately
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [user?.role, router])

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

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-border/40 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2 md:gap-3"
        >
          <Signature8Logo size={40} className="md:w-12 md:h-12" />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Signature8</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground font-medium">CRM Tailor-Made</p>
          </div>
        </motion.div>
      </div>

      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/30 scrollbar-track-transparent">
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
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Immediate navigation without delay
                  if (item.href !== pathname) {
                    handleNavigation(item.href)
                  }
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left block"
                type="button"
              >
                <motion.div
                  layout
                  className={cn(
                    "relative flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl group overflow-hidden transition-all duration-150",
                    isActive
                      ? "text-sky-50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
                >
                  {isActive && (
                    <>
                      {/* Background glow effect with improved spring */}
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl md:rounded-2xl"
                        style={{
                          background: "linear-gradient(135deg, rgba(56,189,248,0.9) 0%, rgba(59,130,246,1) 100%)",
                          boxShadow: "0 0 40px rgba(56,189,248,0.8), 0 0 80px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                          mass: 0.6,
                          velocity: 2
                        }}
                      />

                      {/* Animated outer glow with smoother pulse */}
                      <motion.div
                        layoutId="sidebar-active-glow-outer"
                        className="pointer-events-none absolute -inset-2 rounded-3xl blur-xl"
                        style={{
                          background: "radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(59,130,246,0.4) 50%, transparent 100%)",
                        }}
                        animate={{ opacity: [0.6, 0.9, 0.6], scale: [0.96, 1.04, 0.96] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: [0.4, 0, 0.6, 1] // Custom cubic-bezier for smoother easing
                        }}
                      />

                      {/* Inner shimmer glow with faster, smoother animation */}
                      <motion.div
                        layoutId="sidebar-active-glow-inner"
                        className="pointer-events-none absolute inset-0 rounded-xl md:rounded-2xl"
                        style={{
                          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                        }}
                        animate={{ x: [-120, 120] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "mirror",
                          ease: [0.4, 0, 0.2, 1] // Smoother easing
                        }}
                      />
                    </>
                  )}

                  {/* Icon with enhanced glow and smoother pulse */}
                  <motion.div
                    className="relative z-10"
                    animate={isActive ? { scale: [1, 1.12, 1] } : {}}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: [0.4, 0, 0.6, 1]
                    }}
                  >
                    <item.icon
                      className={cn(
                        "w-4 h-4 md:w-5 md:h-5 transition-all duration-300",
                        isActive
                          ? "drop-shadow-[0_0_24px_rgba(56,189,248,1)] drop-shadow-[0_0_48px_rgba(59,130,246,0.6)]"
                          : "group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]",
                      )}
                    />
                  </motion.div>

                  {/* Text label */}
                  <span className="relative z-10 flex-1 truncate text-xs md:text-sm font-semibold">{item.name}</span>

                  {/* Task badges */}
                  {item.href === "/tasks" && (
                    <span className="ml-auto inline-flex items-center gap-1.5 md:gap-2 relative z-10">
                      {/* New Tasks - Red Pulse Dot */}
                      {myNewTasks > 0 && (
                        <motion.span
                          className="relative inline-flex h-2.5 w-2.5 md:h-3 md:w-3"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-red-500 shadow-lg shadow-red-500/70"></span>
                        </motion.span>
                      )}
                      {/* Pending Tasks - Badge */}
                      {myPendingTasks > 0 && (
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className={cn(
                            "min-w-[1.5rem] md:min-w-[1.75rem] h-5 md:h-7 px-1.5 md:px-2.5 inline-flex items-center justify-center rounded-full text-[10px] md:text-xs font-bold shadow-lg transition-all duration-200",
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
                            "min-w-[1.5rem] md:min-w-[1.75rem] h-5 md:h-7 px-1.5 md:px-2.5 inline-flex items-center justify-center rounded-full text-[10px] md:text-xs font-bold shadow-lg border-2 transition-all duration-200",
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
          <div className="p-3 md:p-4 space-y-2 md:space-y-3">
            <div className="glass rounded-xl md:rounded-2xl p-2 md:p-3 space-y-1.5 border border-border/40 hover:border-border/60 transition-all duration-300">
              <div className="flex items-center gap-2 md:gap-3">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-sky-400/50 ring-2 ring-sky-400/20">
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 via-sky-400 to-sky-600 text-white font-bold text-xs md:text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {user.role && (
                    <span className="inline-flex items-center gap-1 mt-0.5 md:mt-1 text-[9px] md:text-[10px] font-medium px-1.5 md:px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
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
                    className="w-full justify-start gap-2 h-9 md:h-11 text-xs md:text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200 group"
                  >
                    <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:translate-x-0.5" />
                    <span className="font-medium">Déconnexion</span>
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass border-border/40 max-w-[90vw] md:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg md:text-xl">Confirmer la déconnexion</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm md:text-base">
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
    </>
  )

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)} // Changed to setMobileMenuOpen
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="lg:hidden fixed top-0 left-0 w-72 h-screen glass border-r border-border/40 flex flex-col z-50 backdrop-blur-2xl bg-slate-950/95"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Always visible on large screens */}
      <aside className="hidden lg:flex w-72 glass border-r border-border/40 flex-col h-screen fixed top-0 left-0 z-30 backdrop-blur-2xl bg-slate-950/95">
        <SidebarContent />
      </aside>

      {/* Spacer to offset fixed sidebar width in layouts - only on desktop */}
      <div className="hidden lg:block w-72 shrink-0" aria-hidden="true" />
    </>
  )
}

// Export memoized version to prevent unnecessary re-renders
export const Sidebar = memo(SidebarComponent)
