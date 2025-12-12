"use client"

import { Home, Users, LogOut, Settings, CalendarDays, Compass, Calendar, Briefcase, Bell, Menu, X, Target, ChevronLeft, ChevronRight } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
  Target,
}

const SidebarComponent = () => {
  const { isMobileMenuOpen, setMobileMenuOpen, isSidebarCollapsed, toggleSidebar } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Tasks badge state
  const [myPendingTasks, setMyPendingTasks] = useState<number>(0)
  const [myNewTasks, setMyNewTasks] = useState<number>(0)
  const [adminUpdatesCount, setAdminUpdatesCount] = useState<number>(0)
  
  const isArchitect = user?.role?.toLowerCase() === "architect"

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

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <>
      {/* Logo & Toggle Button */}
      <div className="relative border-b border-border/40 shrink-0" style={{ padding: isCollapsed ? '1.25rem 0.5rem' : '1.5rem', overflow: 'visible', zIndex: 10000, position: 'relative' }}>
        {/* Logo Container - Centered when collapsed, left-aligned when expanded */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "flex items-center transition-all duration-300 relative",
            isCollapsed ? "justify-center w-full" : "justify-start gap-2 md:gap-3"
          )}
        >
          {/* Logo - Always visible, properly centered when collapsed */}
          <motion.div
            animate={{
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            className={cn(
              "flex-shrink-0 z-10 flex items-center justify-center",
              isCollapsed ? "mx-auto" : ""
            )}
          >
            <Signature8Logo 
              size={isCollapsed ? 32 : 40} 
              className="block"
            />
          </motion.div>
          
          {/* Logo Text - Only when expanded */}
          <AnimatePresence mode="wait" initial={false}>
            {!isCollapsed && (
              <motion.div
                key="logo-text"
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -10, width: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                }}
                className="overflow-hidden"
              >
                <div>
                  <h1 className="text-sm md:text-base font-bold text-white tracking-tight whitespace-nowrap">Signature8</h1>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium whitespace-nowrap">CRM Tailor-Made</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Toggle Button - Positioned clearly outside logo area */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={toggleSidebar}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              className={cn(
                "absolute top-1/2 rounded-full bg-slate-800/95 border-2 border-sky-500/40 shadow-xl backdrop-blur-sm flex items-center justify-center text-sky-400 hover:text-sky-300 hover:bg-slate-700/95 transition-all duration-200",
                "hover:border-sky-400 hover:shadow-sky-500/30",
                isCollapsed ? "-right-3 w-6 h-6" : "-right-3.5 w-7 h-7"
              )}
              style={{
                transform: 'translateY(-50%)',
                pointerEvents: 'auto',
                zIndex: 10000,
                position: 'absolute',
              }}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 0 : 180 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                className="flex items-center justify-center"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-sky-400" />
                )}
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-sky-500/30 text-white">
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav className={cn(
        "flex-1 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-sky-500/30 scrollbar-track-transparent transition-all duration-300",
        isCollapsed ? "p-2" : "p-3 md:p-4"
      )}>
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
              if (role?.toLowerCase() === 'architect' && item.id === 'architectes') {
                displayLabel = "Architecte & Projet"
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
              <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <motion.button
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
                      transition={{ 
                        delay: index * 0.03, 
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full text-left block"
                      type="button"
                    >
                      <motion.div
                        layout
                        className={cn(
                          "relative flex items-center rounded-2xl group overflow-hidden",
                          isCollapsed 
                            ? "justify-center px-2 py-2.5 md:py-3" 
                            : "gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3.5",
                          isActive
                            ? "text-white"
                            : "text-white/70 hover:text-white"
                        )}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 30, 
                          mass: 0.8 
                        }}
                      >
                        {/* Hover background */}
                        {!isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl bg-white/5"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}

                        {/* Active gradient background */}
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-pill"
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              background: "linear-gradient(135deg, rgba(56,189,248,0.9) 0%, rgba(59,130,246,1) 100%)",
                              boxShadow: "0 4px 12px rgba(56,189,248,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 35,
                              mass: 0.6,
                            }}
                          />
                        )}

                        {/* Icon */}
                        <motion.div
                          animate={{
                            scale: isCollapsed ? 1.1 : 1,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                          }}
                          className="flex-shrink-0"
                        >
                          <item.icon
                            className={cn(
                              "relative z-10 transition-all duration-300",
                              isCollapsed ? "w-5 h-5" : "w-4 h-4 md:w-5 md:h-5",
                              isActive
                                ? "opacity-100"
                                : "opacity-70 group-hover:opacity-100"
                            )}
                          />
                        </motion.div>

                        {/* Text label */}
                        <AnimatePresence mode="wait" initial={false}>
                          {!isCollapsed && (
                            <motion.span
                              key="nav-text"
                              initial={{ opacity: 0, x: -10, width: 0 }}
                              animate={{ opacity: 1, x: 0, width: "auto" }}
                              exit={{ opacity: 0, x: -10, width: 0 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                                mass: 0.8,
                              }}
                              className={cn(
                                "relative z-10 flex-1 truncate text-[11px] md:text-xs font-semibold overflow-hidden whitespace-nowrap",
                                isActive ? "text-white" : "text-white/70 group-hover:text-white"
                              )}
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Task badges */}
                        {item.href === "/tasks" && !isCollapsed && (
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
                        
                        {/* Collapsed badge indicator */}
                        {item.href === "/tasks" && isCollapsed && (myPendingTasks > 0 || myNewTasks > 0 || adminUpdatesCount > 0) && (
                          <motion.span
                            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-slate-950 z-20"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                    </motion.button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="bg-slate-800 border-sky-500/30 text-white">
                      {item.name}
                      {item.href === "/tasks" && (myPendingTasks > 0 || myNewTasks > 0 || adminUpdatesCount > 0) && (
                        <span className="ml-2 text-xs">
                          {myPendingTasks > 0 && `${myPendingTasks} pending`}
                          {adminUpdatesCount > 0 && ` ${adminUpdatesCount} updates`}
                        </span>
                      )}
                    </TooltipContent>
                  )}
                </Tooltip>
            )
          })}
        </LayoutGroup>
      </nav>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="shrink-0 border-t border-border/40"
        >
          <div className={cn(
            "space-y-2 md:space-y-3 transition-all duration-300",
            isCollapsed ? "p-2" : "p-3 md:p-4"
          )}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "rounded-2xl bg-white/5 backdrop-blur-sm shadow-lg transition-all duration-300",
                    isCollapsed ? "p-2 flex justify-center" : "p-2 md:p-3 space-y-1.5"
                  )}>
                    <div className={cn(
                      "flex items-center transition-all duration-300",
                      isCollapsed ? "justify-center" : "gap-2 md:gap-3"
                    )}>
                      <motion.div
                        animate={{
                          width: isCollapsed ? 32 : 40,
                          height: isCollapsed ? 32 : 40,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          mass: 0.8,
                        }}
                        className="flex-shrink-0"
                      >
                        <Avatar className={cn(
                          "border-2 border-sky-400/50 ring-2 ring-sky-400/20",
                          isCollapsed ? "h-8 w-8" : "h-8 w-8 md:h-10 md:w-10"
                        )}>
                          <AvatarFallback className="bg-gradient-to-br from-sky-500 via-sky-400 to-sky-600 text-white font-bold text-xs md:text-sm">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      <AnimatePresence mode="wait" initial={false}>
                        {!isCollapsed && (
                          <motion.div
                            key="user-info"
                            initial={{ opacity: 0, x: -10, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: "auto" }}
                            exit={{ opacity: 0, x: -10, width: 0 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                              mass: 0.8,
                            }}
                            className="flex-1 min-w-0 overflow-hidden"
                          >
                            <p className="text-[11px] md:text-xs font-semibold text-foreground truncate whitespace-nowrap">
                              {user.name}
                            </p>
                            <p className="text-[9px] md:text-[10px] text-muted-foreground truncate whitespace-nowrap">
                              {user.email}
                            </p>
                            {user.role && (
                              <div className="flex items-center gap-2 mt-0.5 md:mt-1 flex-wrap">
                                {/* Role Tag - Only show "Architecte" for architects, styled as cyan/teal pill */}
                                {isArchitect ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-cyan-500/20 text-cyan-300 border-cyan-500/30 h-[22px] whitespace-nowrap">
                                    Architecte
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-medium px-1.5 md:px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 whitespace-nowrap">
                                    {getRoleLabel(user.role)}
                                  </span>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-slate-800 border-sky-500/30 text-white max-w-xs">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      {user.role && (
                        <p className="text-xs mt-1 text-sky-300">{getRoleLabel(user.role)}</p>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-9 md:h-11 text-xs md:text-sm border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200 group",
                            isCollapsed ? "w-full justify-center px-2" : "w-full justify-start gap-2"
                          )}
                        >
                          <LogOut className={cn(
                            "transition-transform group-hover:translate-x-0.5 flex-shrink-0",
                            isCollapsed ? "w-4 h-4" : "w-3.5 h-3.5 md:w-4 md:h-4"
                          )} />
                          {!isCollapsed && (
                            <span className="font-medium">Déconnexion</span>
                          )}
                        </Button>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="bg-slate-800 border-sky-500/30 text-white">
                          Déconnexion
                        </TooltipContent>
                      )}
                    </Tooltip>
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
            <SidebarContent isCollapsed={false} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Collapsible with smooth animations */}
      <div className="hidden lg:block fixed top-0 left-0" style={{ overflow: 'visible', zIndex: 9999 }}>
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarCollapsed ? 80 : 288, // 80px collapsed, 288px (w-72) expanded
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="glass border-r border-border/40 flex flex-col h-screen backdrop-blur-2xl bg-slate-950/95 relative"
          style={{ overflow: 'visible', zIndex: 9999 }}
        >
          <SidebarContent isCollapsed={isSidebarCollapsed} />
        </motion.aside>
      </div>

      {/* Spacer to offset fixed sidebar width in layouts - only on desktop */}
      <motion.div
        initial={false}
        animate={{
          width: isSidebarCollapsed ? 80 : 288,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        className="hidden lg:block shrink-0"
        aria-hidden="true"
      />
    </>
  )
}

// Export memoized version to prevent unnecessary re-renders
export const Sidebar = memo(SidebarComponent)
