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
    <div className="bg-[#171B22] rounded-lg border border-white/5 p-4">
      <h2 className="text-xs font-light text-white/90 mb-4 tracking-wide uppercase">Informations Client</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
        {/* Contact Info */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Téléphone</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/90 font-light">{client.telephone}</p>
                <Button
                  size="sm"
                  onClick={handleWhatsApp}
                  className="h-5 px-2 bg-green-600/90 hover:bg-green-600 text-white text-[9px] font-light">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>

          {client.email && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Email</p>
                <p className="text-xs text-white/90 font-light truncate">{client.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Localisation</p>
              <p className="text-xs text-white/90 font-light">{client.ville}</p>
              {client.adresse && (
                <p className="text-[9px] text-white/50 mt-0.5 font-light">{client.adresse}</p>
              )}
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Architecte Assigné</p>
              <p className="text-xs text-white/90 font-light">{client.architecteAssigne}</p>
            </div>
          </div>

          {(() => {
            // Determine the correct commercial name
            // Priority: 1) commercialMagasin from leadData, 2) commercialAttribue from API, 3) fallback
            let commercialName = ''
            
            // Try to get leadData (could be object or JSON string)
            let leadData: any = null
            if (client.leadData) {
              if (typeof client.leadData === 'string') {
                try {
                  leadData = JSON.parse(client.leadData)
                } catch (e) {
                  console.error('[Client Overview] Failed to parse leadData:', e)
                }
              } else if (typeof client.leadData === 'object') {
                leadData = client.leadData
              }
            }
            
            // Check if this is a magasin lead
            const isMagasinLead = client.magasin || (leadData && leadData.source === 'magasin')
            
            // Priority 1: Use commercialMagasin from leadData (most accurate, especially for magasin leads)
            if (leadData && leadData.commercialMagasin && leadData.commercialMagasin.trim()) {
              commercialName = leadData.commercialMagasin.trim()
              console.log('[Client Overview] ✅ Using commercialMagasin from leadData:', commercialName)
            } 
            // Priority 2: Use commercialAttribue from API (which should already have the correct value from API logic)
            else if (client.commercialAttribue && client.commercialAttribue.trim()) {
              commercialName = client.commercialAttribue.trim()
              console.log('[Client Overview] Using commercialAttribue from client:', commercialName)
            }
            
            // Debug logging
            if (!commercialName) {
              console.log('[Client Overview] ⚠️ No commercial name found:', {
                hasLeadData: !!leadData,
                leadDataCommercialMagasin: leadData?.commercialMagasin,
                clientCommercialAttribue: client.commercialAttribue,
                isMagasinLead: isMagasinLead
              })
            }
            
            // Always show the field if there's a commercial name or if it's a magasin lead
            if (commercialName || isMagasinLead) {
              return (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Nom du commercial</p>
                    <p className="text-xs text-white/90 font-light truncate" title={commercialName}>
                      {commercialName || 'Non assigné'}
                    </p>
                  </div>
                </div>
              )
            }
            return null
          })()}

          {client.magasin && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Magasin</p>
                <p className="text-xs text-white/90 font-light">{client.magasin}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-pink-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white/35 mb-0.5 font-light uppercase tracking-wider">Date de création</p>
              <p className="text-xs text-white/90 font-light">{formatDate(client.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
