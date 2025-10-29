/**
 * Migration Script: Convert Prospection Status to Nouveau
 * 
 * This script migrates all clients with "prospection" status to "nouveau" status
 * for better workflow consistency and traceability.
 * 
 * Run this script once to update your existing data:
 * node scripts/migrate-prospection-to-nouveau.js
 */

function migrateProspectionToNouveau() {
  console.log('🔄 Starting migration: Prospection → Nouveau projet...\n')
  
  // Get clients from localStorage
  const clientsData = localStorage.getItem('signature8-clients')
  
  if (!clientsData) {
    console.log('ℹ️  No clients found in localStorage')
    return
  }
  
  const clients = JSON.parse(clientsData)
  let migratedCount = 0
  const now = new Date().toISOString()
  
  // Update clients with prospection status
  const updatedClients = clients.map(client => {
    if (client.statutProjet === 'prospection') {
      migratedCount++
      console.log(`  ✓ Migrating client: ${client.nom} (${client.id})`)
      
      return {
        ...client,
        statutProjet: 'nouveau',
        derniereMaj: now,
        updatedAt: now,
        historique: [
          {
            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: now,
            type: 'statut',
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
    console.log(`\n✅ Migration completed: ${migratedCount} client(s) migrated`)
    console.log('   All "prospection" clients are now "nouveau" with full traceability')
  } else {
    console.log('\n✅ No migration needed - no clients with "prospection" status found')
  }
}

// Browser environment check
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  migrateProspectionToNouveau()
} else {
  console.log('⚠️  This script must be run in a browser environment with localStorage access')
  console.log('   Open your browser console and paste this script, or run it from the app')
}
