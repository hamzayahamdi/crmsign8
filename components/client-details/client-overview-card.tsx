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
    <div className="bg-[#171B22] rounded-xl md:rounded-xl border border-white/10 p-4 md:p-4">
      <h2 className="text-base md:text-base font-bold text-white mb-4 md:mb-4">Informations Client</h2>

      <div className="grid grid-cols-1 gap-x-4 md:gap-x-6 gap-y-4 md:gap-y-3">
        {/* Contact Info */}
        <div className="space-y-4 md:space-y-3">
          <div className="flex items-center gap-3 md:gap-2.5">
            <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Téléphone</p>
              <div className="flex items-center gap-2 md:gap-2">
                <p className="text-sm md:text-sm text-white font-medium">{client.telephone}</p>
                <Button
                  size="sm"
                  onClick={handleWhatsApp}
                  className="h-6 md:h-6 px-2 md:px-2 bg-green-600 hover:bg-green-700 text-white text-[10px] md:text-[10px]">
                  <MessageCircle className="w-3 h-3 md:w-3 md:h-3 mr-1 md:mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>

          {client.email && (
            <div className="flex items-center gap-3 md:gap-2.5">
              <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Email</p>
                <p className="text-sm md:text-sm text-white font-medium truncate">{client.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 md:gap-2.5">
            <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Localisation</p>
              <p className="text-sm md:text-sm text-white font-medium">{client.ville}</p>
              {client.adresse && (
                <p className="text-[10px] md:text-xs text-white/60 mt-1">{client.adresse}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="space-y-4 md:space-y-3">
          <div className="flex items-center gap-3 md:gap-2.5">
            <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Architecte Assigné</p>
              <p className="text-sm md:text-sm text-white font-medium">{client.architecteAssigne}</p>
            </div>
          </div>

          {client.commercialAttribue && (
            <div className="flex items-center gap-3 md:gap-2.5">
              <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Commercial Attribué</p>
                <p className="text-sm md:text-sm text-white font-medium truncate" title={client.commercialAttribue}>
                  {client.commercialAttribue || 'Non assigné'}
                </p>
              </div>
            </div>
          )}

          {client.magasin && (
            <div className="flex items-center gap-3 md:gap-2.5">
              <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Magasin</p>
                <p className="text-sm md:text-sm text-white font-medium">{client.magasin}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 md:gap-2.5">
            <div className="w-8 h-8 md:w-8 md:h-8 rounded-lg md:rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-[10px] text-white/40 mb-1">Date de création</p>
              <p className="text-sm md:text-sm text-white font-medium">{formatDate(client.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
