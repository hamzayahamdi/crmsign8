/**
 * Backfill stage history for ALL clients from Supabase database
 * This creates stage history entries with estimated durations based on client creation date
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Lightweight .env loader (no dependency)
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    const content = fs.readFileSync(filePath, 'utf8')
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) {
        process.env[key] = val
      }
    })
  } catch (_) {
    // ignore
  }
}

// Try .env.local then .env
loadEnvFile(path.join(__dirname, '../.env.local'))
loadEnvFile(path.join(__dirname, '../.env'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Make sure .env.local has:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Stage order for the 11-stage pipeline
const STAGE_ORDER = [
  'qualifie',
  'acompte_recu',
  'conception',
  'devis_negociation',
  'accepte',
  'premier_depot',
  'projet_en_cours',
  'chantier',
  'facture_reglee',
  'livraison_termine'
]

// Estimated duration per stage in days (you can adjust these)
const ESTIMATED_DURATIONS = {
  'qualifie': 2,
  'acompte_recu': 1,
  'conception': 7,
  'devis_negociation': 5,
  'accepte': 1,
  'premier_depot': 2,
  'projet_en_cours': 14,
  'chantier': 21,
  'facture_reglee': 3,
  'livraison_termine': 7
}

async function backfillStageHistory() {
  console.log('🚀 Starting stage history backfill from database...\n')

  try {
    // Fetch all clients from localStorage table (if exists) or any client source
    console.log('📊 Fetching clients from localStorage...')
    
    // Try to read from localStorage backup or fetch from a clients table
    // Since you're using localStorage, we need to query it differently
    // Let's check if there's a clients table in Supabase
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    console.log('📋 Available tables:', tables?.map(t => t.table_name).join(', ') || 'none')
    
    // For now, let's create a manual entry for testing
    // You'll need to provide actual client IDs
    console.log('\n⚠️  This script needs actual client data.')
    console.log('   Since clients are in localStorage, please:')
    console.log('   1. Open browser DevTools')
    console.log('   2. Go to Application > Local Storage')
    console.log('   3. Find "signature8-clients"')
    console.log('   4. Copy the JSON data')
    console.log('   5. Save it to data/clients-backup.json')
    console.log('   6. Run this script again\n')
    
    // Try to read from backup file
    const backupPath = path.join(__dirname, '../data/clients-backup.json')
    if (!fs.existsSync(backupPath)) {
      console.log('❌ No clients-backup.json found')
      console.log('   Create it with your localStorage data and try again')
      process.exit(1)
    }
    
    const clientsData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    const clients = Array.isArray(clientsData) ? clientsData : (clientsData.clients || [])
    
    console.log(`📊 Found ${clients.length} clients\n`)

    let initialized = 0
    let skipped = 0
    let errors = 0

    for (const client of clients) {
      try {
        console.log(`\n🔄 Processing: ${client.nom} (${client.statutProjet})`)
        
        // Check if client already has stage history
        const { data: existingHistory, error: checkError } = await supabase
          .from('client_stage_history')
          .select('*')
          .eq('client_id', client.id)
          .order('started_at', { ascending: true })

        if (checkError) {
          console.error(`   ❌ Error checking history: ${checkError.message}`)
          errors++
          continue
        }

        if (existingHistory && existingHistory.length > 0) {
          console.log(`   ⏭️  Already has ${existingHistory.length} history entries`)
          skipped++
          continue
        }

        // Get current stage index
        const currentStageIndex = STAGE_ORDER.indexOf(client.statutProjet)
        if (currentStageIndex === -1) {
          console.log(`   ⚠️  Unknown stage: ${client.statutProjet}`)
          continue
        }

        // Create history entries for all completed stages + current stage
        const now = new Date()
        const clientCreatedAt = new Date(client.createdAt || client.derniereMaj || now)
        
        let currentDate = new Date(clientCreatedAt)
        const historyEntries = []

        // Create entries for all stages up to and including current
        for (let i = 0; i <= currentStageIndex; i++) {
          const stageName = STAGE_ORDER[i]
          const isCurrentStage = i === currentStageIndex
          const estimatedDays = ESTIMATED_DURATIONS[stageName] || 3
          
          const startedAt = new Date(currentDate)
          let endedAt = null
          let durationSeconds = null
          
          if (!isCurrentStage) {
            // Completed stage - add estimated duration
            endedAt = new Date(currentDate.getTime() + (estimatedDays * 24 * 60 * 60 * 1000))
            durationSeconds = Math.floor((endedAt - startedAt) / 1000)
            currentDate = endedAt
          }
          
          const id = (crypto.randomUUID && crypto.randomUUID()) || `csh_${Date.now()}_${Math.random().toString(36).slice(2)}`
          historyEntries.push({
            id,
            client_id: client.id,
            stage_name: stageName,
            started_at: startedAt.toISOString(),
            ended_at: endedAt ? endedAt.toISOString() : null,
            duration_seconds: durationSeconds,
            changed_by: 'System Backfill',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          
          console.log(`   ✅ ${stageName}: ${startedAt.toLocaleDateString('fr-FR')}${endedAt ? ` → ${endedAt.toLocaleDateString('fr-FR')} (${estimatedDays}j)` : ' (en cours)'}`)
        }

        // Insert all history entries
        const { error: insertError } = await supabase
          .from('client_stage_history')
          .insert(historyEntries)

        if (insertError) {
          console.error(`   ❌ Error inserting history: ${insertError.message}`)
          errors++
          continue
        }

        initialized++

      } catch (error) {
        console.error(`   ❌ Error processing ${client.nom}: ${error.message}`)
        errors++
      }
    }

    console.log('\n\n📈 Summary:')
    console.log(`   ✅ Initialized: ${initialized} clients`)
    console.log(`   ⏭️  Skipped: ${skipped} clients`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📊 Total: ${clients.length}`)
    console.log('\n✨ Done! Refresh your client details pages to see durations.\n')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

backfillStageHistory()
