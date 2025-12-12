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
  refreshClients: () => Promise<void>
  fetchClients: () => Promise<void>
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: [],
  selectedClient: null,
  isLoading: false,
  lastUpdate: null,

  setClients: (clients) => {
    // Safety check: ensure clients is an array
    if (!Array.isArray(clients)) {
      console.error(`[Client Store] ❌ setClients called with non-array:`, typeof clients)
      return
    }
    
    // Remove duplicates by ID before setting
    const uniqueClients = clients.reduce((acc, client) => {
      // Safety check: ensure client has an ID
      if (!client || !client.id) {
        console.warn(`[Client Store] ⚠️ Skipping client without ID:`, client)
        return acc
      }
      
      const existingIndex = acc.findIndex(c => c.id === client.id)
      if (existingIndex === -1) {
        acc.push(client)
      } else {
        // If duplicate found, prefer the one with nomProjet set (opportunity-based)
        const existing = acc[existingIndex]
        const existingHasNomProjet = existing.nomProjet && existing.nomProjet.trim()
        const newHasNomProjet = client.nomProjet && client.nomProjet.trim()
        
        // Prefer opportunity-based client (has nomProjet) over legacy client
        if (newHasNomProjet && !existingHasNomProjet) {
          acc[existingIndex] = client
        } else if (!newHasNomProjet && existingHasNomProjet) {
          // Keep existing if it has nomProjet and new doesn't
          // Do nothing
        } else {
          // Both have or both don't have nomProjet - keep the one with more recent update
          const existingDate = new Date(existing.updatedAt || existing.derniereMaj || 0).getTime()
          const newDate = new Date(client.updatedAt || client.derniereMaj || 0).getTime()
          if (newDate > existingDate) {
            acc[existingIndex] = client
          }
        }
      }
      return acc
    }, [] as Client[])
    
    if (uniqueClients.length !== clients.length) {
      console.warn(`[Client Store] ⚠️ Removed ${clients.length - uniqueClients.length} duplicate clients`)
    }
    
    set({ 
      clients: uniqueClients, 
      lastUpdate: new Date().toISOString() 
    })
    console.log(`[Client Store] ✅ Set ${uniqueClients.length} unique clients in store`)
  },

  addClient: (client) => {
    const existingClients = get().clients
    // Check if client already exists
    const existingIndex = existingClients.findIndex(c => c.id === client.id)
    
    if (existingIndex !== -1) {
      console.warn(`[Client Store] ⚠️ Client ${client.id} already exists, updating instead of adding`)
      // Update instead of adding
      get().updateClient(client.id, client)
      return
    }
    
    const newClients = [...existingClients, client]
    set({ 
      clients: newClients,
      lastUpdate: new Date().toISOString()
    })
    console.log(`[Client Store] ✅ Added client: ${client.id}`)
  },

  updateClient: (id, updates) => {
    const now = new Date().toISOString()
    const existingClients = get().clients
    
    // Safety check: ensure we have an array
    if (!Array.isArray(existingClients)) {
      console.error(`[Client Store] ❌ Existing clients is not an array:`, typeof existingClients)
      return
    }
    
    // Safety check: ensure updates is an object
    if (!updates || typeof updates !== 'object') {
      console.error(`[Client Store] ❌ Updates is not an object:`, typeof updates)
      return
    }
    
    const clientIndex = existingClients.findIndex(c => c && c.id === id)
    
    if (clientIndex === -1) {
      console.warn(`[Client Store] ⚠️ Client not found: ${id}, adding to store (current count: ${existingClients.length})`)
      // If client doesn't exist, add it
      const newClient = { ...updates, id } as Client
      set({ 
        clients: [...existingClients, newClient],
        lastUpdate: now
      })
      console.log(`[Client Store] ✅ Added new client: ${id} (total: ${existingClients.length + 1})`)
      return
    }
    
    // Replace existing client at exact index to prevent duplicates
    const updatedClients = [...existingClients]
    const existingClient = updatedClients[clientIndex]
    
    if (!existingClient) {
      console.error(`[Client Store] ❌ Existing client at index ${clientIndex} is null/undefined`)
      return
    }
    
    // Merge updates, preserving all existing fields (only update defined fields)
    const mergedClient = {
      ...existingClient,
      ...Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      ),
      id: id, // Ensure ID is always correct
      derniereMaj: updates.derniereMaj || existingClient.derniereMaj || now,
      updatedAt: updates.updatedAt || existingClient.updatedAt || now,
    }
    
    updatedClients[clientIndex] = mergedClient
    
    // Update selected client if it's the one being updated
    if (get().selectedClient?.id === id) {
      set({ selectedClient: mergedClient })
    }
    
    set({ 
      clients: updatedClients,
      lastUpdate: now
    })
    console.log(`[Client Store] ✅ Updated client: ${id} (replaced at index ${clientIndex}, total clients: ${updatedClients.length})`)
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
    console.log(`[Client Store] ✅ Updated status for client: ${id} → ${status}`)
  },

  deleteClient: (id) => {
    const filteredClients = get().clients.filter(c => c.id !== id)
    set({ 
      clients: filteredClients,
      selectedClient: get().selectedClient?.id === id ? null : get().selectedClient,
      lastUpdate: new Date().toISOString()
    })
    console.log(`[Client Store] ✅ Deleted client: ${id}`)
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

  // Fetch clients from API (database)
  fetchClients: async () => {
    try {
      set({ isLoading: true })
      console.log('[Client Store] 📡 Fetching clients from database...')
      
      const response = await fetch('/api/clients', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }
      
      const result = await response.json()
      const clients = result.data || []
      
      // Safety check: if we get an empty array but had clients before, log a warning
      const existingCount = get().clients.length
      if (clients.length === 0 && existingCount > 0) {
        console.warn(`[Client Store] ⚠️ API returned 0 clients but we had ${existingCount} clients before. Keeping existing clients.`)
        set({ isLoading: false })
        return
      }
      
      // Use setClients to ensure proper deduplication
      get().setClients(clients)
      set({ 
        isLoading: false
      })
      
      console.log(`[Client Store] ✅ Loaded ${clients.length} clients from database`)
    } catch (error) {
      console.error('[Client Store] ❌ Error fetching clients:', error)
      set({ isLoading: false })
    }
  },

  refreshClients: async () => {
    await get().fetchClients()
  }
}))

// Real-time sync across all browsers and tabs via Supabase
if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    console.log('[Client Store] 🚀 Setting up comprehensive real-time sync')
    
    // 1. Subscribe to CLIENTS table changes (MAIN SYNC - this fixes the issue!)
    const clientsChannel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          console.log('[Client Store] 👤 Client change detected:', payload)
          const store = useClientStore.getState()
          
          if (payload.eventType === 'INSERT') {
            const newClient = payload.new as any
            console.log(`[Client Store] ➕ New client added: ${newClient.id}`, {
              nom: newClient.nom,
              nom_projet: newClient.nom_projet,
              statut_projet: newClient.statut_projet
            })
            
            // Transform and add to store
            const transformedClient = {
              id: newClient.id,
              nom: newClient.nom,
              nomProjet: newClient.nom_projet || '', // CRITICAL: Map nom_projet to nomProjet
              telephone: newClient.telephone,
              ville: newClient.ville,
              typeProjet: newClient.type_projet,
              architecteAssigne: newClient.architecte_assigne,
              statutProjet: newClient.statut_projet,
              derniereMaj: newClient.derniere_maj,
              leadId: newClient.lead_id,
              email: newClient.email,
              adresse: newClient.adresse,
              budget: newClient.budget,
              notes: newClient.notes,
              magasin: newClient.magasin,
              commercialAttribue: newClient.commercial_attribue,
              createdAt: newClient.created_at,
              updatedAt: newClient.updated_at
            }
            
            // Only add if client has nomProjet (required for opportunities table)
            if (!transformedClient.nomProjet || !transformedClient.nomProjet.trim()) {
              console.warn(`[Client Store] ⚠️ Skipping client ${newClient.id} - missing nomProjet`)
              return
            }
            
            // Check if client already exists to prevent duplicates
            const existingClient = store.clients.find(c => c.id === newClient.id)
            if (!existingClient) {
              console.log(`[Client Store] ✅ Adding new client to store: ${newClient.id} (${transformedClient.nomProjet})`)
              store.addClient(transformedClient as any)
            } else {
              // Update existing client instead of adding duplicate
              console.log(`[Client Store] 🔄 Client ${newClient.id} already exists, updating instead`)
              store.updateClient(newClient.id, transformedClient as any)
            }
            
          } else if (payload.eventType === 'UPDATE') {
            const updatedClient = payload.new as any
            console.log(`[Client Store] 🔄 Client updated: ${updatedClient.id}`, {
              nom_projet: updatedClient.nom_projet,
              statut_projet: updatedClient.statut_projet
            })
            
            // Transform and update in store
            const transformedUpdates = {
              nom: updatedClient.nom,
              nomProjet: updatedClient.nom_projet || '', // CRITICAL: Map nom_projet to nomProjet
              telephone: updatedClient.telephone,
              ville: updatedClient.ville,
              typeProjet: updatedClient.type_projet,
              architecteAssigne: updatedClient.architecte_assigne,
              statutProjet: updatedClient.statut_projet,
              derniereMaj: updatedClient.derniere_maj,
              leadId: updatedClient.lead_id,
              email: updatedClient.email,
              adresse: updatedClient.adresse,
              budget: updatedClient.budget,
              notes: updatedClient.notes,
              magasin: updatedClient.magasin,
              commercialAttribue: updatedClient.commercial_attribue,
              updatedAt: updatedClient.updated_at
            }
            
            // Only update if client has nomProjet (required for opportunities table)
            // If nomProjet is missing, we might want to remove it from the store
            if (!transformedUpdates.nomProjet || !transformedUpdates.nomProjet.trim()) {
              const existingClient = store.clients.find(c => c.id === updatedClient.id)
              if (existingClient && existingClient.nomProjet) {
                // Keep existing nomProjet if update doesn't have it
                transformedUpdates.nomProjet = existingClient.nomProjet
              } else {
                console.warn(`[Client Store] ⚠️ Client ${updatedClient.id} update missing nomProjet`)
              }
            }
            
            store.updateClient(updatedClient.id, transformedUpdates)
            
          } else if (payload.eventType === 'DELETE') {
            const deletedClient = payload.old as any
            console.log(`[Client Store] ❌ Client deleted: ${deletedClient.id}`)
            store.deleteClient(deletedClient.id)
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Clients subscription: ${status}`)
      })
    
    // 2. Subscribe to stage changes (for status updates)
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

    // 5. Subscribe to payments changes
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        async (payload) => {
          console.log('[Client Store] 💳 Payment change detected:', payload)
          
          const paymentData = payload.new as any
          const clientId = paymentData?.client_id || (payload.old as any)?.client_id
          
          if (clientId) {
            console.log(`[Client Store] Refreshing payments for client: ${clientId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('payment-updated', {
              detail: { clientId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Payments subscription: ${status}`)
      })

    // 6. Subscribe to documents changes
    const documentsChannel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        async (payload) => {
          console.log('[Client Store] 📄 Document change detected:', payload)
          
          const documentData = payload.new as any
          const clientId = documentData?.client_id || (payload.old as any)?.client_id
          
          if (clientId) {
            console.log(`[Client Store] Refreshing documents for client: ${clientId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('document-updated', {
              detail: { clientId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Documents subscription: ${status}`)
      })

    // 7. Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        async (payload) => {
          console.log('[Client Store] ✅ Task change detected:', payload)
          
          const taskData = payload.new as any
          const linkedId = taskData?.linked_id || (payload.old as any)?.linked_id
          const linkedType = taskData?.linked_type || (payload.old as any)?.linked_type
          
          if (linkedId && linkedType === 'client') {
            console.log(`[Client Store] Refreshing tasks for client: ${linkedId}`)
            
            // Trigger a refresh event that components can listen to
            window.dispatchEvent(new CustomEvent('task-updated', {
              detail: { clientId: linkedId, eventType: payload.eventType }
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Client Store] Tasks subscription: ${status}`)
      })
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      supabase.removeChannel(clientsChannel)
      supabase.removeChannel(stageChannel)
      supabase.removeChannel(devisChannel)
      supabase.removeChannel(appointmentsChannel)
      supabase.removeChannel(historiqueChannel)
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(documentsChannel)
      supabase.removeChannel(tasksChannel)
    })

    console.log('[Client Store] ✅ All real-time subscriptions active (including clients table)')
  } else {
    console.warn('[Client Store] ⚠️ Supabase credentials missing - real-time sync disabled')
  }
}
