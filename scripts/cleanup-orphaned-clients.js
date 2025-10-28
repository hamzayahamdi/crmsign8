/**
 * Cleanup Orphaned Clients Script
 * 
 * This script removes clients from localStorage that don't have a corresponding lead
 * in the database. Run this to fix data consistency issues.
 * 
 * Usage: Run this in the browser console on your CRM page
 */

async function cleanupOrphanedClients() {
  console.log('🧹 Starting cleanup of orphaned clients...')
  
  try {
    // Get clients from localStorage
    const storedClients = localStorage.getItem('signature8-clients')
    if (!storedClients) {
      console.log('✅ No clients found in localStorage')
      return
    }
    
    const clients = JSON.parse(storedClients)
    console.log(`📊 Found ${clients.length} clients in localStorage`)
    
    // Get auth token
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ No auth token found. Please login first.')
      return
    }
    
    // Fetch all leads from database
    console.log('📡 Fetching leads from database...')
    const response = await fetch('/api/leads?page=1&limit=1000', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      console.error('❌ Failed to fetch leads:', response.statusText)
      return
    }
    
    const data = await response.json()
    const leads = data.leads || []
    console.log(`📊 Found ${leads.length} leads in database`)
    
    // Create a Set of valid lead IDs for fast lookup
    const validLeadIds = new Set(leads.map(lead => lead.id))
    
    // Filter clients to keep only those with valid leadId
    const validClients = clients.filter(client => {
      // Keep clients without leadId (manually created)
      if (!client.leadId) {
        console.log(`✅ Keeping client "${client.nom}" (no leadId - manually created)`)
        return true
      }
      
      // Check if lead exists
      if (validLeadIds.has(client.leadId)) {
        console.log(`✅ Keeping client "${client.nom}" (lead exists)`)
        return true
      }
      
      // Orphaned client - lead doesn't exist
      console.log(`🗑️  Removing orphaned client "${client.nom}" (lead ${client.leadId} not found)`)
      return false
    })
    
    // Calculate results
    const removedCount = clients.length - validClients.length
    
    if (removedCount === 0) {
      console.log('✅ No orphaned clients found. Data is clean!')
      return
    }
    
    // Save cleaned clients back to localStorage
    localStorage.setItem('signature8-clients', JSON.stringify(validClients))
    
    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - Original clients: ${clients.length}`)
    console.log(`   - Valid clients: ${validClients.length}`)
    console.log(`   - Removed: ${removedCount}`)
    console.log(`\n🔄 Please refresh the page to see the changes.`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanupOrphanedClients()
