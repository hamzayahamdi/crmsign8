"use client"

import { Home, Users, LogOut, Settings, CalendarDays, Compass, Calendar, Bell } from "lucide-react"
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
  Compass,
  CalendarDays,
  Calendar,
  Bell,
  Settings
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Tasks badge state
  const [myPendingTasks, setMyPendingTasks] = useState<number>(0)
  const [myNewTasks, setMyNewTasks] = useState<number>(0)
  const [adminUpdatesCount, setAdminUpdatesCount] = useState<number>(0)
  
  // Notifications badge state
  const [notificationCount, setNotificationCount] = useState<number>(0)

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
    
    // Load notification count
    const loadNotifications = async () => {
      if (!user?.id) return
      
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`/api/notifications?userId=${user.id}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
    
    loadNotifications()
  }, [user?.name, user?.id, pathname])

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
    <aside className="w-72 bg-[rgb(13,17,28)] border-r border-[rgb(30,41,59)] flex flex-col h-screen sticky top-0 z-30 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-[rgb(30,41,59)] shrink-0">
        <div className="flex items-center gap-3">
          <Signature8Logo size={48} />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Signature8</h1>
            <p className="text-xs text-gray-400 font-medium">CRM Tailor-Made</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {useMemo(() => {
          const role = (user?.role || '').toLowerCase()
          
          // Special handling for Commercial and Magasiner roles
          if (role === 'commercial') {
            return [{ name: "Mes Leads", href: "/commercial", icon: Home }]
          }
          if (role === 'magasiner') {
            return [{ name: "Mes Leads", href: "/magasiner", icon: Home }]
          }
          
          // Use permission-based sidebar items for other roles
          const visibleItems = getVisibleSidebarItems(user?.role)
          return visibleItems.map(item => ({
            name: item.label,
            href: item.href,
            icon: iconMap[item.icon] || Home
          }))
        }, [user?.role]).map((item) => {
          const isActive = pathname === item.href || (item.href === "/architectes" && pathname.startsWith("/architectes/"))
          return (
            <Link key={item.name} href={item.href} className="block">
              <div
                className={cn(
                  "relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg bg-blue-500/15 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.25),inset_0_0_20px_rgba(59,130,246,0.1)]"
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
              {item.href === "/notifications" && notificationCount > 0 && (
                <span className={cn(
                  "ml-auto min-w-[1.75rem] h-7 px-2.5 inline-flex items-center justify-center rounded-full text-xs font-bold shadow-lg relative z-[1]",
                  isActive
                    ? "bg-white text-primary shadow-white/20"
                    : "bg-gradient-to-r from-primary to-blue-500 text-white shadow-primary/30 animate-pulse"
                )}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
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
        <div className="shrink-0 border-t border-[rgb(30,41,59)] bg-[rgb(13,17,28)]">
          <div className="p-4 space-y-3">
            <div className="rounded-xl p-3 space-y-1.5 border border-[rgb(30,41,59)] bg-[rgb(15,20,32)]/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-blue-500/30 ring-2 ring-blue-500/10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white font-bold text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                  {user.role && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      {getRoleLabel(user.role)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-11 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 group bg-transparent"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span className="font-medium">Déconnexion</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[rgb(15,20,32)] border border-[rgb(30,41,59)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl text-white">Confirmer la déconnexion</AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-gray-400">
                    Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à nouveau au CRM.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="hover:bg-white/[0.05] bg-transparent border-[rgb(30,41,59)] text-white">Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-red-500 text-white hover:bg-red-600"
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
