import { create } from 'zustand'
import type { Client, ProjectStatus } from '@/types/client'

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

// Auto-refresh on storage changes (sync across tabs)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'signature8-clients' && e.newValue) {
      const clients = JSON.parse(e.newValue)
      useClientStore.getState().setClients(clients)
    }
  })
}
