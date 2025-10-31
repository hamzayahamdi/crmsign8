"use client"

import { Calendar, Clock, MapPin, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Appointment } from "@/types/client"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface UpcomingRdvBannerProps {
  appointments: Appointment[]
  onDismiss?: (id: string) => void
}

export function UpcomingRdvBanner({ appointments, onDismiss }: UpcomingRdvBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Filter upcoming appointments (within next 48 hours)
  const now = new Date()
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  
  const upcomingRdv = appointments
    .filter(rdv => {
      const rdvDate = new Date(rdv.dateStart)
      return rdv.status === "upcoming" && 
             rdvDate > now && 
             rdvDate <= next48Hours &&
             !dismissedIds.includes(rdv.id)
    })
    .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id])
    onDismiss?.(id)
  }

  if (upcomingRdv.length === 0) return null

  return (
    <div className="px-8 pt-4">
      <AnimatePresence mode="popLayout">
        {upcomingRdv.map((rdv, index) => {
          const rdvDate = new Date(rdv.dateStart)
          const hoursUntil = Math.floor((rdvDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          const isSoon = hoursUntil <= 2
          const isToday = rdvDate.toDateString() === now.toDateString()
          const isTomorrow = rdvDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()

          let timeLabel = ""
          if (isSoon) {
            timeLabel = hoursUntil === 0 ? "Dans moins d'1h" : `Dans ${hoursUntil}h`
          } else if (isToday) {
            timeLabel = `Aujourd'hui à ${rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          } else if (isTomorrow) {
            timeLabel = `Demain à ${rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          }

          return (
            <motion.div
              key={rdv.id}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "mb-3 rounded-xl border p-4 backdrop-blur-sm",
                isSoon 
                  ? "bg-red-500/10 border-red-500/30" 
                  : "bg-blue-500/10 border-blue-500/30"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isSoon ? "bg-red-500/20" : "bg-blue-500/20"
                  )}>
                    <Calendar className={cn(
                      "w-5 h-5",
                      isSoon ? "text-red-400" : "text-blue-400"
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">
                        {rdv.title}
                      </h4>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        isSoon 
                          ? "bg-red-500/20 text-red-400" 
                          : "bg-blue-500/20 text-blue-400"
                      )}>
                        {timeLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                      {rdv.clientName && (
                        <div className="flex items-center gap-1.5">
                          <span>avec</span>
                          <span className="text-white/80 font-medium">{rdv.clientName}</span>
                        </div>
                      )}
                      
                      {rdv.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{rdv.location}</span>
                        </div>
                      )}
                    </div>

                    {rdv.notes && (
                      <p className="text-xs text-white/50 mt-2 italic">
                        {rdv.notes}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(rdv.id)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
