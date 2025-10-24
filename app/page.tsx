"use client"

import { useState } from "react"
import { KanbanBoard } from "@/components/kanban-board"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AuthGuard } from "@/components/auth-guard"

export default function HomePage() {
  const [search, setSearch] = useState("")
  const handleCreateLead = () => {
    // Trigger the create lead modal in KanbanBoard
    if (typeof window !== "undefined" && (window as any).__signature8CreateLead) {
      ;(window as any).__signature8CreateLead()
    }
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header onCreateLead={handleCreateLead} searchQuery={search} onSearchChange={setSearch} />
          <div className="flex-1 p-3">
            <KanbanBoard onCreateLead={handleCreateLead} searchQuery={search} />
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
