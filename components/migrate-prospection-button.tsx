"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"
import type { Client } from "@/types/client"

interface MigrateProspectionButtonProps {
  onMigrationComplete?: () => void
}

/**
 * Button component to migrate all "prospection" clients to "nouveau" status
 * This ensures all clients fit into the main workflow and maintains traceability
 */
export function MigrateProspectionButton({ onMigrationComplete }: MigrateProspectionButtonProps) {
  const { toast } = useToast()
  const [isMigrating, setIsMigrating] = useState(false)

  const handleMigration = () => {
    setIsMigrating(true)
    
    try {
      // Get clients from localStorage
      const clientsData = localStorage.getItem('signature8-clients')
      
      if (!clientsData) {
        toast({
          title: "Aucune donnée",
          description: "Aucun client trouvé dans le système",
        })
        setIsMigrating(false)
        return
      }
      
      const clients: Client[] = JSON.parse(clientsData)
      let migratedCount = 0
      const now = new Date().toISOString()
      
      // Update clients with prospection status
      const updatedClients = clients.map(client => {
        if (client.statutProjet === 'prospection') {
          migratedCount++
          
          return {
            ...client,
            statutProjet: 'nouveau' as const,
            derniereMaj: now,
            updatedAt: now,
            historique: [
              {
                id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: now,
                type: 'statut' as const,
                description: 'Statut migré de "Prospection" vers "Nouveau projet" (migration automatique)',
                auteur: 'Système'
              },
              ...(client.historique || [])
            ]
          }
        }
        return client
      })
      
      // Save updated clients
      if (migratedCount > 0) {
        localStorage.setItem('signature8-clients', JSON.stringify(updatedClients))
        
        toast({
          title: "✅ Migration réussie",
          description: `${migratedCount} client(s) migré(s) de "Prospection" vers "Nouveau projet"`,
        })
        
        // Trigger refresh
        onMigrationComplete?.()
      } else {
        toast({
          title: "Aucune migration nécessaire",
          description: "Aucun client avec le statut 'Prospection' trouvé",
        })
      }
    } catch (error) {
      console.error('Migration error:', error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la migration",
        variant: "destructive"
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <Button
      onClick={handleMigration}
      disabled={isMigrating}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
      {isMigrating ? 'Migration...' : 'Migrer Prospection → Nouveau'}
    </Button>
  )
}
