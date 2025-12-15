"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { Toaster } from "@/components/ui/sonner"
import { Toaster as ShadcnToaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/next"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <Toaster position="top-right" richColors />
        <ShadcnToaster />
        <Analytics />
      </NotificationProvider>
    </AuthProvider>
  )
}




