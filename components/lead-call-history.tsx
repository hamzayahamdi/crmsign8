"use client"

import { Phone, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface CallHistoryItem {
  id: string
  content: string
  author: string
  createdAt: string
}

interface LeadCallHistoryProps {
  notes: CallHistoryItem[]
  className?: string
}

export function LeadCallHistory({ notes, className }: LeadCallHistoryProps) {
  // Filter only call-related notes
  const callNotes = notes.filter(note => 
    note.content.includes('📞') || 
    note.content.toLowerCase().includes('appel')
  )

  if (callNotes.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
        <Phone className="h-4 w-4 text-purple-400" />
        Historique des appels
      </div>

      <div className="relative space-y-3 pl-4">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-purple-500/50 via-purple-500/30 to-transparent" />

        {callNotes.map((note, index) => {
          const isFirstCall = note.content.includes('Premier')
          const isSecondCall = note.content.includes('Deuxième')
          const isThirdCall = note.content.includes('Troisième')
          
          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-3"
            >
              {/* Timeline dot */}
              <div className={cn(
                "relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-[#0A0A0A]",
                isFirstCall && "border-green-500",
                isSecondCall && "border-blue-500",
                isThirdCall && "border-purple-500"
              )}>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isFirstCall && "bg-green-500",
                  isSecondCall && "bg-blue-500",
                  isThirdCall && "bg-purple-500"
                )} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "rounded-lg border p-3 transition-all hover:border-white/20",
                  isFirstCall && "bg-green-500/5 border-green-500/20",
                  isSecondCall && "bg-blue-500/5 border-blue-500/20",
                  isThirdCall && "bg-purple-500/5 border-purple-500/20",
                  !isFirstCall && !isSecondCall && !isThirdCall && "bg-white/5 border-white/10"
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        isFirstCall && "text-green-400",
                        isSecondCall && "text-blue-400",
                        isThirdCall && "text-purple-400",
                        !isFirstCall && !isSecondCall && !isThirdCall && "text-gray-400"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        isFirstCall && "text-green-400",
                        isSecondCall && "text-blue-400",
                        isThirdCall && "text-purple-400",
                        !isFirstCall && !isSecondCall && !isThirdCall && "text-gray-300"
                      )}>
                        {isFirstCall && "Premier appel"}
                        {isSecondCall && "Deuxième appel"}
                        {isThirdCall && "Troisième appel"}
                        {!isFirstCall && !isSecondCall && !isThirdCall && "Appel"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </div>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                    {note.content.replace('📞', '').trim()}
                  </p>
                  
                  {note.author && note.author !== 'Système Import' && (
                    <div className="mt-2 text-xs text-gray-500">
                      Par {note.author}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
