/**
 * Migration Script: Budget to Devis System
 * 
 * This script migrates existing clients with budget fields to the new devis system.
 * It creates an initial devis for each client based on their existing budget.
 * 
 * Usage:
 *   node scripts/migrate-budget-to-devis.js
 */

const fs = require('fs')
const path = require('path')

// Path to clients data (adjust if using different storage)
const DATA_DIR = path.join(__dirname, '../data')
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json')
const BACKUP_FILE = path.join(DATA_DIR, 'clients-backup-before-devis-migration.json')

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      console.log(`📁 Created data directory at ${DATA_DIR}`)
    }
    if (!fs.existsSync(CLIENTS_FILE)) {
      fs.writeFileSync(CLIENTS_FILE, '[]')
      console.log(`🆕 Created empty clients file at ${CLIENTS_FILE}`)
    }
  } catch (e) {
    console.error('❌ Failed to ensure data files:', e.message)
    process.exit(1)
  }
}

function migrateClients() {
  console.log('🚀 Starting Budget to Devis Migration...\n')

  // Ensure data dir and file exist
  ensureDataFiles()

  // Read existing clients
  let clients = []
  try {
    const data = fs.readFileSync(CLIENTS_FILE, 'utf8')
    clients = JSON.parse(data)
    console.log(`✅ Loaded ${clients.length} clients\n`)
  } catch (error) {
    console.warn('⚠️ Could not read clients file, proceeding with empty list:', error.message)
    clients = []
  }

  // Create backup
  try {
    // Ensure data dir exists before backup
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(clients, null, 2))
    console.log(`💾 Backup created: ${BACKUP_FILE}\n`)
  } catch (error) {
    console.warn('⚠️ Error creating backup, continuing without backup:', error.message)
  }

  let migratedCount = 0
  let skippedCount = 0

  // Migrate each client
  clients = clients.map(client => {
    // Skip if client already has devis
    if (client.devis && client.devis.length > 0) {
      console.log(`⏭️  Skipped: ${client.nom} (already has devis)`)
      skippedCount++
      return client
    }

    // Skip if no budget
    if (!client.budget || client.budget === 0) {
      console.log(`⏭️  Skipped: ${client.nom} (no budget)`)
      skippedCount++
      return client
    }

    // Create initial devis based on budget
    const now = new Date().toISOString()
    const initialDevis = {
      id: `devis-migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "Devis initial (migré depuis budget)",
      montant: client.budget,
      date: client.createdAt || now,
      statut: determineDevisStatus(client.statutProjet),
      facture_reglee: determinePaymentStatus(client),
      description: `Devis créé automatiquement lors de la migration du système budget vers devis. Montant original: ${client.budget} MAD`,
      createdBy: "Migration Script",
      createdAt: now,
      validatedAt: shouldBeValidated(client.statutProjet) ? now : undefined,
      notes: `Migré depuis le champ budget. Statut projet: ${client.statutProjet}`
    }

    // Add devis to client
    const updatedClient = {
      ...client,
      devis: [initialDevis],
      derniereMaj: now,
      updatedAt: now
    }

    console.log(`✅ Migrated: ${client.nom} - ${client.budget} MAD → Devis "${initialDevis.title}"`)
    migratedCount++

    return updatedClient
  })

  // Save migrated clients
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2))
    console.log(`\n💾 Saved migrated clients to ${CLIENTS_FILE}`)
  } catch (error) {
    console.error('❌ Error saving migrated clients:', error.message)
    return
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log('='.repeat(50))
  console.log(`Total clients: ${clients.length}`)
  console.log(`Migrated: ${migratedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log('='.repeat(50))
  console.log('\n✨ Migration completed successfully!')
  console.log(`\n📝 Backup saved at: ${BACKUP_FILE}`)
  console.log('💡 If something went wrong, restore from backup.\n')
}

/**
 * Determine devis status based on project status
 */
function determineDevisStatus(projectStatus) {
  const acceptedStatuses = [
    'accepte',
    'premier_depot',
    'projet_en_cours',
    'chantier',
    'facture_reglee',
    'livraison_termine',
    'termine',
    'acompte_verse',
    'en_conception',
    'en_validation',
    'en_chantier',
    'livraison'
  ]

  const refusedStatuses = [
    'refuse',
    'annule'
  ]

  if (acceptedStatuses.includes(projectStatus)) {
    return 'accepte'
  } else if (refusedStatuses.includes(projectStatus)) {
    return 'refuse'
  } else {
    return 'en_attente'
  }
}

/**
 * Determine if invoice should be marked as paid
 */
function determinePaymentStatus(client) {
  // Check if project is completed or in late stages
  const paidStatuses = [
    'facture_reglee',
    'livraison_termine',
    'termine'
  ]

  if (paidStatuses.includes(client.statutProjet)) {
    return true
  }

  // Check if payments exist and cover budget
  if (client.payments && client.payments.length > 0) {
    const totalPayments = client.payments.reduce((sum, p) => sum + p.amount, 0)
    const budget = client.budget || 0
    
    // If payments cover 90% or more of budget, consider it paid
    if (budget > 0 && (totalPayments / budget) >= 0.9) {
      return true
    }
  }

  return false
}

/**
 * Determine if devis should have validatedAt date
 */
function shouldBeValidated(projectStatus) {
  const validatedStatuses = [
    'accepte',
    'premier_depot',
    'projet_en_cours',
    'chantier',
    'facture_reglee',
    'livraison_termine',
    'termine',
    'refuse',
    'annule'
  ]

  return validatedStatuses.includes(projectStatus)
}

// Run migration
if (require.main === module) {
  migrateClients()
}

module.exports = { migrateClients }
