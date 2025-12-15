"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { canAccessRoute } from "@/lib/permissions"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  fallbackPath?: string
}

/**
 * RoleGuard component - Protects routes based on user role
 * 
 * Usage:
 * <RoleGuard allowedRoles={['Admin', 'Operator']}>
 *   <ProtectedContent />
 * </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  allowedRoles,
  fallbackPath = "/" 
}: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    // If no user, let AuthGuard handle it
    if (!user) return

    // Check if user has access to current route
    const hasAccess = allowedRoles 
      ? allowedRoles.some(role => role.toLowerCase() === (user.role || '').toLowerCase())
      : canAccessRoute(user.role, pathname)

    if (!hasAccess) {
      console.warn(`[RoleGuard] Access denied for role "${user.role}" to path "${pathname}"`)
      // Special handling: If architect is trying to access their own detail page, allow it
      if (user.role?.toLowerCase() === 'architect' && pathname.startsWith('/architectes/')) {
        // Check if they're accessing their own profile
        const pathId = pathname.split('/architectes/')[1]?.split('/')[0]
        if (pathId === user.id) {
          // Allow access to own profile
          return
        }
      }
      router.push(fallbackPath)
    }
  }, [user, isLoading, pathname, allowedRoles, fallbackPath, router])

  // Show loading state
  if (isLoading) {
    return null
  }

  // If no user, return null (AuthGuard will handle redirect)
  if (!user) {
    return null
  }

  // Check access
  const hasAccess = allowedRoles 
    ? allowedRoles.some(role => role.toLowerCase() === (user.role || '').toLowerCase())
    : canAccessRoute(user.role, pathname)

  // If no access, show access denied message
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="glass rounded-2xl border border-border/40 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Accès refusé
          </h2>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <Button 
            onClick={() => router.push(fallbackPath)}
            className="w-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
