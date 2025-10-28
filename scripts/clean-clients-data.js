/**
 * Clean Clients Data Script
 * 
 * This script removes ALL clients from localStorage that don't have a corresponding
 * CONVERTED lead (status: "converti") in the database.
 * 
 * Rules:
 * 1. Keep clients that have a leadId pointing to a converted lead
 * 2. Remove clients with no leadId (orphaned)
 * 3. Remove clients whose lead is not converted
 * 4. Remove clients whose lead doesn't exist
 * 
 * Usage: Copy and paste this entire script into your browser console
 */

async function cleanClientsData() {
  console.log('🧹 ========================================')
  console.log('🧹 STARTING CLIENTS DATA CLEANUP')
  console.log('🧹 ========================================\n')
  
  try {
    // Step 1: Get clients from localStorage
    const storedClients = localStorage.getItem('signature8-clients')
    if (!storedClients) {
      console.log('✅ No clients found in localStorage - nothing to clean')
      return
    }
    
    const clients = JSON.parse(storedClients)
    console.log(`📊 Found ${clients.length} clients in localStorage\n`)
    
    // Step 2: Get auth token
    const token = localStorage.getItem('token')
    if (!token) {
      console.error('❌ ERROR: No auth token found. Please login first.')
      return
    }
    
    // Step 3: Fetch ALL leads from database
    console.log('📡 Fetching all leads from database...')
    const response = await fetch('/api/leads?page=1&limit=10000', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      console.error('❌ ERROR: Failed to fetch leads:', response.statusText)
      return
    }
    
    const data = await response.json()
    const allLeads = data.leads || []
    console.log(`📊 Found ${allLeads.length} total leads in database\n`)
    
    // Step 4: Filter only CONVERTED leads
    const convertedLeads = allLeads.filter(lead => lead.statut === 'converti')
    console.log(`✅ Found ${convertedLeads.length} CONVERTED leads\n`)
    
    // Create a Set of valid converted lead IDs for fast lookup
    const validConvertedLeadIds = new Set(convertedLeads.map(lead => lead.id))
    
    console.log('🔍 Analyzing each client...\n')
    console.log('─────────────────────────────────────────\n')
    
    // Step 5: Analyze and filter clients
    const validClients = []
    const removedClients = []
    
    clients.forEach((client, index) => {
      const clientNum = index + 1
      console.log(`[${clientNum}/${clients.length}] Checking: "${client.nom}"`)
      
      // Case 1: Client has no leadId (orphaned - should not exist)
      if (!client.leadId) {
        console.log(`   ❌ REMOVE: No leadId (orphaned client)`)
        removedClients.push({ ...client, reason: 'No leadId' })
        console.log('')
        return
      }
      
      // Case 2: Check if lead exists and is converted
      if (validConvertedLeadIds.has(client.leadId)) {
        console.log(`   ✅ KEEP: Lead ${client.leadId.substring(0, 8)}... is CONVERTED`)
        validClients.push(client)
      } else {
        // Check if lead exists but is not converted
        const leadExists = allLeads.some(lead => lead.id === client.leadId)
        if (leadExists) {
          const lead = allLeads.find(lead => lead.id === client.leadId)
          console.log(`   ❌ REMOVE: Lead exists but status is "${lead.statut}" (not converted)`)
          removedClients.push({ ...client, reason: `Lead status: ${lead.statut}` })
        } else {
          console.log(`   ❌ REMOVE: Lead ${client.leadId.substring(0, 8)}... does NOT exist`)
          removedClients.push({ ...client, reason: 'Lead not found' })
        }
      }
      console.log('')
    })
    
    console.log('─────────────────────────────────────────\n')
    
    // Step 6: Show summary
    console.log('📊 CLEANUP SUMMARY:')
    console.log('─────────────────────────────────────────')
    console.log(`   Total clients analyzed: ${clients.length}`)
    console.log(`   ✅ Valid clients (keeping): ${validClients.length}`)
    console.log(`   ❌ Invalid clients (removing): ${removedClients.length}`)
    console.log('─────────────────────────────────────────\n')
    
    if (removedClients.length > 0) {
      console.log('🗑️  CLIENTS TO BE REMOVED:')
      console.log('─────────────────────────────────────────')
      removedClients.forEach((client, index) => {
        console.log(`   ${index + 1}. "${client.nom}" - ${client.reason}`)
      })
      console.log('─────────────────────────────────────────\n')
    }
    
    // Step 7: Ask for confirmation
    if (removedClients.length === 0) {
      console.log('✅ No invalid clients found. Data is already clean!')
      console.log('✅ Nothing to remove.\n')
      return
    }
    
    console.log('⚠️  WARNING: This will permanently remove the invalid clients!')
    console.log('⚠️  Make sure you have reviewed the list above.\n')
    
    const confirmed = confirm(
      `Are you sure you want to remove ${removedClients.length} invalid client(s)?\n\n` +
      `This action cannot be undone!\n\n` +
      `Click OK to proceed, or Cancel to abort.`
    )
    
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user.')
      return
    }
    
    // Step 8: Save cleaned data
    localStorage.setItem('signature8-clients', JSON.stringify(validClients))
    
    console.log('\n✅ ========================================')
    console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!')
    console.log('✅ ========================================\n')
    console.log(`   Removed: ${removedClients.length} invalid clients`)
    console.log(`   Kept: ${validClients.length} valid clients`)
    console.log('\n🔄 Refreshing page in 2 seconds...\n')
    
    // Step 9: Refresh page
    setTimeout(() => {
      location.reload()
    }, 2000)
    
  } catch (error) {
    console.error('\n❌ ========================================')
    console.error('❌ ERROR DURING CLEANUP:')
    console.error('❌ ========================================')
    console.error(error)
    console.error('\n⚠️  Cleanup failed. No changes were made.')
  }
}

// Auto-run the cleanup
console.log('\n🚀 Starting cleanup process...\n')
cleanClientsData()
