"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { SettingsIcon, User, Database, Download, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { AuthGuard } from "@/components/auth-guard"

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)

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
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="glass border-b border-border/40 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-premium flex items-center justify-center glow">
                <SettingsIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Paramètres</h1>
                <p className="text-muted-foreground">Gérer les préférences de votre CRM</p>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
          {/* Settings Sections */}
          {settingsSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-xl p-6 border border-border/40"
            >
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <span className="text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

              {/* Data Management */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-xl p-6 border border-border/40"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Gestion des données</h2>
                    <p className="text-sm text-muted-foreground">Exporter, importer ou supprimer vos données</p>
                  </div>
                </div>
                <div className="space-y-3">
              <Button
                onClick={handleExportData}
                className="w-full justify-start gap-2 bg-transparent"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Exporter les données
              </Button>
              <Button
                onClick={handleImportData}
                className="w-full justify-start gap-2 bg-transparent"
                variant="outline"
              >
                <Upload className="w-4 h-4" />
                Importer les données
              </Button>
              <Button
                onClick={handleClearData}
                className="w-full justify-start gap-2"
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
    </AuthGuard>
  )
}
