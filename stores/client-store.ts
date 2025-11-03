import { create } from 'zustand'
import type { Client, ProjectStatus } from '@/types/client'
import { createClient } from '@supabase/supabase-js'

interface ClientStore {
  clients: Client[]
  selectedClient: Client | null
  isLoading: boolean
  lastUpdate: string | null
  
  // Actions
  setClients: (clients: Client[]) => void
  addClient: (client: Client) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  updateClientStatus: (id: string, status: ProjectStatus) => void
  deleteClient: (id: string) => void
  setSelectedClient: (client: Client | null) => void
  setLoading: (loading: boolean) => void
  
  // Helpers
  getClientById: (id: string) => Client | undefined
  getClientsByStatus: (status: ProjectStatus) => Client[]
  refreshClients: () => void
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  selectedClient: null,
  isLoading: false,
  lastUpdate: null,

  setClients: (clients) => {
    set({ 
      clients, 
      lastUpdate: new Date().toISOString() 
    })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('signature8-clients', JSON.stringify(clients))
    }
  },

  addClient: (client) => {
    const newClients = [...get().clients, client]
    set({ 
      clients: newClients,
      lastUpdate: new Date().toISOString()
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('signature8-clients', JSON.stringify(newClients))
    }
  },

  updateClient: (id, updates) => {
    const now = new Date().toISOString()
    const updatedClients = get().clients.map(client => {
      if (client.id === id) {
        const updatedClient = {
          ...client,
          ...updates,
          derniereMaj: now,
          updatedAt: now,
        }
        
        // Update selected client if it's the one being updated
        if (get().selectedClient?.id === id) {
          set({ selectedClient: updatedClient })
        }
        
        return updatedClient
      }
      return client
    })
    
    set({ 
      clients: updatedClients,
      lastUpdate: now
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('signature8-clients', JSON.stringify(updatedClients))
    }
  },

  updateClientStatus: (id, status) => {
    const now = new Date().toISOString()
    const updatedClients = get().clients.map(client => {
      if (client.id === id) {
        const updatedClient = {
          ...client,
          statutProjet: status,
          derniereMaj: now,
          updatedAt: now,
          historique: [
            {
              id: `hist-${Date.now()}`,
              date: now,
              type: 'statut' as const,
              description: `Statut changé à "${status}"`,
              auteur: 'Système'
            },
            ...(client.historique || [])
          ]
        }
        
        // Update selected client if it's the one being updated
        if (get().selectedClient?.id === id) {
          set({ selectedClient: updatedClient })
        }
        
        return updatedClient
      }
      return client
    })
    
    set({ 
      clients: updatedClients,
      lastUpdate: now
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('signature8-clients', JSON.stringify(updatedClients))
    }
  },

  deleteClient: (id) => {
    const filteredClients = get().clients.filter(c => c.id !== id)
    set({ 
      clients: filteredClients,
      selectedClient: get().selectedClient?.id === id ? null : get().selectedClient,
      lastUpdate: new Date().toISOString()
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('signature8-clients', JSON.stringify(filteredClients))
    }
  },

  setSelectedClient: (client) => {
    set({ selectedClient: client })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  getClientById: (id) => {
    return get().clients.find(c => c.id === id)
  },

  getClientsByStatus: (status) => {
    return get().clients.filter(c => c.statutProjet === status)
  },

  refreshClients: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('signature8-clients')
      if (stored) {
        const clients = JSON.parse(stored)
        set({ 
          clients,
          lastUpdate: new Date().toISOString()
        })
      }
    }
  }
}))

// Auto-refresh on storage changes (sync across tabs in same browser)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'signature8-clients' && e.newValue) {
      const clients = JSON.parse(e.newValue)
      useClientStore.getState().setClients(clients)
    }
  })
}

// Real-time sync across browsers via Supabase
if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('[Client Store] 🚀 Setting up comprehensive real-time sync')
    
    // 1. Subscribe to stage changes
    const stageChannel = supabase
      .channel('client-stage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_stage_history'
        },
        (payload) => {
          console.log('[Client Store] 📊 Stage change detected:', payload)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stageData = payload.new as any
            
            // Only process if this is the active stage (no end date)
            if (!stageData.ended_at) {
              const clientId = stageData.client_id
              const newStage = stageData.stage_name as ProjectStatus
              
              console.log(`[Client Store] Updating client ${clientId} to stage: ${newStage}`)
              
              // Update the client's stage in the store
              const store = useClientStore.getState()
              const client = store.clients.find(c => c.id === clientId)
              
              if (client && client.statutProjet !== newStage) {
                console.log(`[Client Store] ✅ Syncing stage change: ${client.statutProjet} → ${newStage}`)
                store.updateClientStatus(clientId, newStage)
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Stage subscription: ${status}`)
      })

    // 2. Subscribe to devis changes
    const devisChannel = supabase
      .channel('devis-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devis'
        },
        async (payload) => {
          console.log('[Client Store] 💰 Devis change detected:', payload)
          
          const devisData = payload.new as any
          const clientId = devisData?.client_id || (payload.old as any)?.client_id
          
          if (clientId) {
            console.log(`[Client Store] Refreshing devis for client: ${clientId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('devis-updated', {
              detail: { clientId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Devis subscription: ${status}`)
      })

    // 3. Subscribe to appointments changes
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          console.log('[Client Store] 📅 Appointment change detected:', payload)
          
          const appointmentData = payload.new as any
          const clientId = appointmentData?.client_id || (payload.old as any)?.client_id
          
          if (clientId) {
            console.log(`[Client Store] Refreshing appointments for client: ${clientId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('appointment-updated', {
              detail: { clientId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Appointments subscription: ${status}`)
      })

    // 4. Subscribe to historique changes (notes, activities)
    const historiqueChannel = supabase
      .channel('historique-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historique'
        },
        async (payload) => {
          console.log('[Client Store] 📝 Historique change detected:', payload)
          
          const historiqueData = payload.new as any
          const clientId = historiqueData?.client_id || (payload.old as any)?.client_id
          
          if (clientId) {
            console.log(`[Client Store] Refreshing historique for client: ${clientId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('historique-updated', {
              detail: { clientId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Historique subscription: ${status}`)
      })
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      supabase.removeChannel(stageChannel)
      supabase.removeChannel(devisChannel)
      supabase.removeChannel(appointmentsChannel)
      supabase.removeChannel(historiqueChannel)
    })

    console.log('[Client Store] ✅ All real-time subscriptions active')
  } else {
    console.warn('[Client Store] ⚠️ Supabase credentials missing - real-time sync disabled')
  }
}
