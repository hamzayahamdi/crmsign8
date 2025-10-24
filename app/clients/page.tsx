"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Phone, MapPin, Calendar, TrendingUp } from "lucide-react"
import type { Lead } from "@/types/lead"

export default function ClientsPage() {
  const [clients, setClients] = useState<Lead[]>([])

  useEffect(() => {
    const storedLeads = localStorage.getItem("signature8-leads")
    if (storedLeads) {
      const allLeads: Lead[] = JSON.parse(storedLeads)
      const signedLeads = allLeads.filter((lead) => lead.statut === "signe")
      setClients(signedLeads)
    }
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-MA", {
      style: "currency",
      currency: "MAD",
    }).format(amount)
  }

  const totalRevenue = clients.reduce((sum, client) => sum + (client.budget || 0), 0)

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="glass border-b border-border/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Clients</h1>
            <p className="text-muted-foreground">
              {clients.length} client{clients.length !== 1 ? "s" : ""} actif
              {clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="glass rounded-lg px-6 py-3">
            <p className="text-sm text-muted-foreground mb-1">Revenu total</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {clients.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Aucun client pour le moment</h3>
              <p className="text-muted-foreground">Les leads signés apparaîtront ici automatiquement</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-xl p-6 hover:bg-secondary/50 transition-all duration-200 border border-border/40"
              >
                {/* Client Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center glow">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{client.nom}</h3>
                      <p className="text-sm text-muted-foreground">{client.typeBien}</p>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{client.ville}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">Dernière activité : {formatDate(client.derniereMaj)}</span>
                  </div>
                  {client.statutDetaille && (
                    <div className="text-sm text-muted-foreground italic mt-2">{client.statutDetaille}</div>
                  )}
                </div>

                {/* Budget */}
                {client.budget && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Budget</span>
                      <span className="text-lg font-semibold text-white">{formatCurrency(client.budget)}</span>
                    </div>
                  </div>
                )}

                {/* Assigned By */}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    {client.assignePar}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
