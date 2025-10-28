/**
 * Sync Converted Leads to Clients
 * 
 * This script finds all leads with status "converti" and creates
 * corresponding client records in localStorage if they don't exist.
 * 
 * Run this in browser console on the leads page:
 * node scripts/sync-converted-leads.js
 */

async function syncConvertedLeads() {
  try {
    console.log('🔄 Starting sync of converted leads...')
    
    // Get auth token
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ No auth token found. Please login first.')
      return
    }

    // Fetch all leads
    console.log('📥 Fetching leads from API...')
    const response = await fetch('/api/leads', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch leads')
    }

    const leads = await response.json()
    console.log(`📊 Found ${leads.length} total leads`)

    // Filter converted leads
    const convertedLeads = leads.filter(lead => lead.statut === 'converti')
    console.log(`✅ Found ${convertedLeads.length} converted leads`)

    if (convertedLeads.length === 0) {
      console.log('✨ No converted leads to sync')
      return
    }

    // Get existing clients
    const existingClients = localStorage.getItem('signature8-clients')
    const clients = existingClients ? JSON.parse(existingClients) : []
    console.log(`📋 Found ${clients.length} existing clients`)

    // Get existing client lead IDs to avoid duplicates
    const existingLeadIds = new Set(clients.map(c => c.leadId).filter(Boolean))

    // Create clients from converted leads
    let syncedCount = 0
    const now = new Date().toISOString()

    for (const lead of convertedLeads) {
      // Skip if client already exists for this lead
      if (existingLeadIds.has(lead.id)) {
        console.log(`⏭️  Skipping ${lead.nom} - client already exists`)
        continue
      }

      // Create client object
      const newClient = {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nom: lead.nom,
        telephone: lead.telephone,
        email: lead.email || '',
        ville: lead.ville,
        typeProjet: lead.typeBien,
        statutProjet: 'prospection',
        architecte: lead.assignePar,
        budget: '',
        surface: '',
        adresse: '',
        notes: lead.message || '',
        createdAt: lead.createdAt || now,
        updatedAt: now,
        derniereMaj: now,
        leadId: lead.id,
      }

      clients.unshift(newClient)
      syncedCount++
      console.log(`✅ Created client for: ${lead.nom}`)
    }

    // Save updated clients to localStorage
    if (syncedCount > 0) {
      localStorage.setItem('signature8-clients', JSON.stringify(clients))
      console.log(`\n🎉 Successfully synced ${syncedCount} converted leads to clients!`)
      console.log('💾 Clients saved to localStorage')
      console.log('\n📊 Summary:')
      console.log(`   - Total converted leads: ${convertedLeads.length}`)
      console.log(`   - Already synced: ${convertedLeads.length - syncedCount}`)
      console.log(`   - Newly synced: ${syncedCount}`)
      console.log(`   - Total clients now: ${clients.length}`)
      console.log('\n✨ Refresh the Clients page to see the new clients!')
    } else {
      console.log('\n✨ All converted leads are already synced!')
    }

  } catch (error) {
    console.error('❌ Error syncing converted leads:', error)
  }
}

// Run the sync
syncConvertedLeads()
