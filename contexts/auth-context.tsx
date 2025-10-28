"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  name: string
  role: string
  magasin?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token")
      
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        localStorage.removeItem("token")
        setUser(null)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      localStorage.removeItem("token")
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Login failed")
    }

    // Store token and set user
    localStorage.setItem("token", data.token)
    setUser(data.user)
    
    // Show success toast
    toast.success("Connexion réussie", {
      description: `Bienvenue ${data.user.name} !`,
    })
    
    // Small delay to show the success state before redirect
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Redirect to dashboard
    router.push("/")
    router.refresh()
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      
      toast.success("Déconnexion réussie", {
        description: "À bientôt !",
      })
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Erreur lors de la déconnexion")
    } finally {
      localStorage.removeItem("token")
      setUser(null)
      router.push("/login")
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
