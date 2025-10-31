"use client"

import { Phone, Mail, MapPin, User, Building2, Calendar, MessageCircle } from "lucide-react"
import type { Client } from "@/types/client"
import { Button } from "@/components/ui/button"

interface ClientOverviewCardProps {
  client: Client
  onUpdate: (client: Client) => void
}

export function ClientOverviewCard({ client }: ClientOverviewCardProps) {
  const handleWhatsApp = () => {
    const phone = client.telephone.replace(/\s/g, '')
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-[#171B22] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Informations Client</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Téléphone</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium">{client.telephone}</p>
                <Button
                  size="sm"
                  onClick={handleWhatsApp}
                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>

          {client.email && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-1">Email</p>
                <p className="text-sm text-white font-medium truncate">{client.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Localisation</p>
              <p className="text-sm text-white font-medium">{client.ville}</p>
              {client.adresse && (
                <p className="text-xs text-white/60 mt-1">{client.adresse}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Architecte Assigné</p>
              <p className="text-sm text-white font-medium">{client.architecteAssigne}</p>
            </div>
          </div>

          {client.commercialAttribue && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-1">Commercial Attribué</p>
                <p className="text-sm text-white font-medium">{client.commercialAttribue}</p>
              </div>
            </div>
          )}

          {client.magasin && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 mb-1">Magasin</p>
                <p className="text-sm text-white font-medium">{client.magasin}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 mb-1">Date de création</p>
              <p className="text-sm text-white font-medium">{formatDate(client.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
