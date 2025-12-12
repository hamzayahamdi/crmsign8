"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { KanbanBoard } from "@/components/kanban-board"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { ImportLeadsModal } from "@/components/import-leads-modal"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const [search, setSearch] = useState("")
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect users based on their role
  useEffect(() => {
    if (!isLoading && user?.role) {
      const role = user.role.toLowerCase()
      
      if (role === "architect") {
        router.push("/contacts")
      } else if (role === "commercial") {
        router.push("/commercial")
      } else if (role === "magasiner") {
        router.push("/magasiner")
      }
      // Gestionnaire can now access leads page
    }
  }, [user, isLoading, router])

  const handleCreateLead = () => {
    // Trigger the create lead modal in KanbanBoard
    if (typeof window !== "undefined" && (window as any).__signature8CreateLead) {
      ;(window as any).__signature8CreateLead()
    }
  }

  const handleCreateTask = () => {
    // Navigate to tasks page - users can create task there
    router.push("/tasks")
  }

  const handleImportLeads = () => {
    setIsImportModalOpen(true)
  }

  const handleImportComplete = () => {
    // Refresh the kanban board by updating the key
    setRefreshKey(prev => prev + 1)
    setIsImportModalOpen(false)
  }

  // Show loading while checking role
  const role = user?.role?.toLowerCase()
  if (isLoading || role === "architect" || role === "commercial" || role === "magasiner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[rgb(11,14,24)]">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header 
            onCreateLead={handleCreateLead}
            onCreateTask={handleCreateTask}
            onImportLeads={handleImportLeads}
            searchQuery={search} 
            onSearchChange={setSearch} 
          />
          <div className="flex-1 p-3">
            <KanbanBoard key={refreshKey} onCreateLead={handleCreateLead} searchQuery={search} />
          </div>
        </main>
      </div>

      {/* Import Modal */}
      <ImportLeadsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={handleImportComplete}
      />
    </AuthGuard>
  )
}
