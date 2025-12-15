"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { SettingsIcon, User, Database, Download, Upload, Trash2, Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { RoleGuard } from "@/components/role-guard"
import { toast } from "sonner"

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isCleaningCalendar, setIsCleaningCalendar] = useState(false)

  const handleExportData = () => {
    const storedLeads = localStorage.getItem("signature8-leads")
    if (storedLeads) {
      const dataStr = JSON.stringify(JSON.parse(storedLeads), null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `signature8-leads-${new Date().toISOString().split("T")[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImportData = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string)
            localStorage.setItem("signature8-leads", JSON.stringify(data))
            window.location.reload()
          } catch (error) {
            alert("Erreur lors de l'importation des données")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleClearData = () => {
    if (showConfirm) {
      localStorage.removeItem("signature8-leads")
      window.location.reload()
    } else {
      setShowConfirm(true)
      setTimeout(() => setShowConfirm(false), 5000)
    }
  }

  const handleCleanupCalendar = async () => {
    if (isCleaningCalendar) return

    setIsCleaningCalendar(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      
      const response = await fetch('/api/calendar/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du nettoyage')
      }

      if (data.deletedCount === 0) {
        toast.success('Aucun événement orphelin trouvé. Le calendrier est propre !')
      } else {
        toast.success(
          `Nettoyage terminé : ${data.deletedCount} événement(s) orphelin(s) supprimé(s) du calendrier`
        )
      }
    } catch (error) {
      console.error('Error cleaning up calendar:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur lors du nettoyage du calendrier'
      )
    } finally {
      setIsCleaningCalendar(false)
    }
  }

  const settingsSections = [
    {
      title: "Profil",
      icon: User,
      description: "Informations du compte",
      items: [
        { label: "Nom d'utilisateur", value: "Admin Signature8" },
        { label: "Email", value: "admin@signature8.com" },
        { label: "Rôle", value: "Administrateur" },
      ],
    },
  ]

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['Admin']}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            {/* Header */}
            <div className="glass border-b border-border/40 p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-primary to-premium flex items-center justify-center glow shrink-0">
                  <SettingsIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold text-white">Paramètres</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">Gérer les préférences de votre CRM</p>
                </div>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                {/* Settings Sections */}
                {settingsSections.map((section, index) => (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass rounded-lg md:rounded-xl p-4 md:p-6 border border-border/40"
                  >
                    <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <section.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      <div>
                        <h2 className="text-lg md:text-xl font-semibold text-white">{section.title}</h2>
                        <p className="text-xs md:text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      {section.items.map((item) => (
                        <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1 sm:gap-0">
                          <span className="text-sm md:text-base text-foreground font-medium sm:font-normal">{item.label}</span>
                          <span className="text-sm md:text-base text-muted-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Calendar Cleanup */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass rounded-lg md:rounded-xl p-4 md:p-6 border border-border/40"
                >
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-white">Nettoyage du calendrier</h2>
                      <p className="text-xs md:text-sm text-muted-foreground">Supprimer les événements orphelins du calendrier (événements liés à des tâches supprimées)</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={handleCleanupCalendar}
                      disabled={isCleaningCalendar}
                      className="w-full justify-start gap-2 bg-transparent h-10 md:h-11 text-sm md:text-base"
                      variant="outline"
                    >
                      {isCleaningCalendar ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Nettoyage en cours...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          Nettoyer le calendrier
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>

                {/* Data Management */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass rounded-lg md:rounded-xl p-4 md:p-6 border border-border/40"
                >
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <Database className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-white">Gestion des données</h2>
                      <p className="text-xs md:text-sm text-muted-foreground">Exporter, importer ou supprimer vos données</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={handleExportData}
                      className="w-full justify-start gap-2 bg-transparent h-10 md:h-11 text-sm md:text-base"
                      variant="outline"
                    >
                      <Download className="w-4 h-4" />
                      Exporter les données
                    </Button>
                    <Button
                      onClick={handleImportData}
                      className="w-full justify-start gap-2 bg-transparent h-10 md:h-11 text-sm md:text-base"
                      variant="outline"
                    >
                      <Upload className="w-4 h-4" />
                      Importer les données
                    </Button>
                    <Button
                      onClick={handleClearData}
                      className="w-full justify-start gap-2 h-10 md:h-11 text-sm md:text-base"
                      variant={showConfirm ? "destructive" : "outline"}
                    >
                      <Trash2 className="w-4 h-4" />
                      {showConfirm ? "Cliquer à nouveau pour confirmer" : "Supprimer toutes les données"}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </main>
        </div>
      </RoleGuard>
    </AuthGuard>
  )
}
