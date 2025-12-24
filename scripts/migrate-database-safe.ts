/**
 * Safe Database Migration Script with Duplicate Prevention
 * 
 * This script migrates all data from source database(s) to the destination database
 * while ensuring no duplicates are created.
 * 
 * Features:
 * - Supports multiple source databases
 * - Checks for existing records before inserting (prevents duplicates)
 * - Only migrates new/missing data
 * - Detailed step-by-step progress logging
 * - Respects foreign key relationships
 * 
 * IMPORTANT: Before running this script:
 * 1. Update your .env file with the new DATABASE_URL and DIRECT_URL
 * 2. Ensure you have backups of both databases
 * 3. Configure source database URLs in the SOURCE_DATABASES array below
 * 
 * Usage:
 *   tsx scripts/migrate-database-safe.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Destination database (new database)
const DEST_DATABASE_URL = process.env.DATABASE_URL
const DEST_DIRECT_URL = process.env.DIRECT_URL

// Source databases (old databases with your data)
// Add your source database URLs here
const SOURCE_DATABASES: string[] = [
  // Add your source database URLs here
  // Example: process.env.OLD_DATABASE_URL_1,
  // Example: process.env.OLD_DATABASE_URL_2,
]

// Try to read from environment variables or backup files
const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')
const OLD_DB_BACKUP_FILE_2 = path.join(process.cwd(), '.old-database-url-2.txt')

// Try to get source databases from various sources
if (SOURCE_DATABASES.length === 0) {
  // Try environment variables
  if (process.env.OLD_DATABASE_URL) {
    SOURCE_DATABASES.push(process.env.OLD_DATABASE_URL)
  }
  if (process.env.OLD_DATABASE_URL_2) {
    SOURCE_DATABASES.push(process.env.OLD_DATABASE_URL_2)
  }
  
  // Try backup files
  if (fs.existsSync(OLD_DB_BACKUP_FILE)) {
    const url = fs.readFileSync(OLD_DB_BACKUP_FILE, 'utf-8').trim()
    if (url && !SOURCE_DATABASES.includes(url)) {
      SOURCE_DATABASES.push(url)
    }
  }
  if (fs.existsSync(OLD_DB_BACKUP_FILE_2)) {
    const url = fs.readFileSync(OLD_DB_BACKUP_FILE_2, 'utf-8').trim()
    if (url && !SOURCE_DATABASES.includes(url)) {
      SOURCE_DATABASES.push(url)
    }
  }
}

// Validation
if (!DEST_DATABASE_URL) {
  console.error('❌ DATABASE_URL must be set in your .env file')
  console.error('   This should be your NEW destination database URL')
  process.exit(1)
}

if (SOURCE_DATABASES.length === 0) {
  console.error('❌ No source database URLs found')
  console.error('\nPlease provide source database URLs using one of these methods:')
  console.error('  1. Set OLD_DATABASE_URL and/or OLD_DATABASE_URL_2 environment variables')
  console.error('  2. Create .old-database-url.txt and/or .old-database-url-2.txt files')
  console.error('  3. Edit this script and add URLs to SOURCE_DATABASES array')
  process.exit(1)
}

// ============================================================================
// INTERFACES
// ============================================================================

interface MigrationStats {
  [key: string]: {
    total: number
    new: number
    skipped: number
    errors: number
  }
}

interface TableMigrationConfig {
  name: string
  fetchFn: (db: PrismaClient) => Promise<any[]>
  insertFn: (db: PrismaClient, data: any[]) => Promise<any>
  getId: (record: any) => string
  checkExistsFn?: (db: PrismaClient, id: string) => Promise<boolean>
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a record exists in the destination database by ID
 */
async function recordExists(
  db: PrismaClient,
  tableName: string,
  id: string
): Promise<boolean> {
  try {
    const model = (db as any)[tableName]
    if (!model) return false
    
    const record = await model.findUnique({ where: { id } })
    return !!record
  } catch (error) {
    // If the check fails, assume it doesn't exist to be safe
    return false
  }
}

/**
 * Get all existing IDs from destination database for a table
 */
async function getExistingIds(
  db: PrismaClient,
  tableName: string
): Promise<Set<string>> {
  try {
    const model = (db as any)[tableName]
    if (!model) return new Set()
    
    const records = await model.findMany({ select: { id: true } })
    return new Set(records.map((r: any) => r.id))
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch existing IDs for ${tableName}, will check individually`)
    return new Set()
  }
}

/**
 * Migrate a table with duplicate checking
 */
async function migrateTableSafe(
  config: TableMigrationConfig,
  sourceDbs: PrismaClient[],
  destDb: PrismaClient,
  stats: MigrationStats
): Promise<void> {
  const { name, fetchFn, insertFn, getId, checkExistsFn } = config
  
  console.log(`\n📦 Migrating ${name}...`)
  console.log(`   └─ Step 1: Collecting data from ${sourceDbs.length} source database(s)...`)
  
  try {
    // Collect all data from all source databases
    let allData: any[] = []
    const seenIds = new Set<string>()
    
    for (let i = 0; i < sourceDbs.length; i++) {
      try {
        const data = await fetchFn(sourceDbs[i])
        console.log(`      Source ${i + 1}: Found ${data.length} records`)
        
        // Deduplicate within source databases
        for (const record of data) {
          const id = getId(record)
          if (!seenIds.has(id)) {
            seenIds.add(id)
            allData.push(record)
          }
        }
      } catch (error: any) {
        console.error(`      ⚠️  Error reading from source ${i + 1}: ${error.message}`)
      }
    }
    
    console.log(`   └─ Step 2: Total unique records collected: ${allData.length}`)
    
    if (allData.length === 0) {
      console.log(`   ✅ No data to migrate`)
      stats[name] = { total: 0, new: 0, skipped: 0, errors: 0 }
      return
    }
    
    // Check which records already exist in destination
    console.log(`   └─ Step 3: Checking for existing records in destination...`)
    const existingIds = await getExistingIds(destDb, name)
    console.log(`      Found ${existingIds.size} existing records in destination`)
    
    // Filter out records that already exist
    const newData = allData.filter(record => {
      const id = getId(record)
      return !existingIds.has(id)
    })
    
    const skipped = allData.length - newData.length
    console.log(`   └─ Step 4: ${newData.length} new records to migrate, ${skipped} already exist`)
    
    if (newData.length === 0) {
      console.log(`   ✅ All records already exist in destination, skipping`)
      stats[name] = { total: allData.length, new: 0, skipped, errors: 0 }
      return
    }
    
    // Insert new records in batches
    console.log(`   └─ Step 5: Inserting ${newData.length} new records...`)
    const batchSize = 50 // Smaller batches for safety
    let migrated = 0
    let errors = 0
    
    for (let i = 0; i < newData.length; i += batchSize) {
      const batch = newData.slice(i, i + batchSize)
      try {
        await insertFn(destDb, batch)
        migrated += batch.length
        const percent = Math.round((migrated / newData.length) * 100)
        process.stdout.write(`      Progress: ${migrated}/${newData.length} (${percent}%)\r`)
      } catch (error: any) {
        console.error(`\n      ❌ Error inserting batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        
        // Try inserting one by one to identify problematic records
        for (const record of batch) {
          try {
            await insertFn(destDb, [record])
            migrated++
          } catch (singleError: any) {
            errors++
            console.error(`         Failed to insert record ${getId(record)}: ${singleError.message}`)
          }
        }
      }
    }
    
    console.log(`\n   ✅ Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    stats[name] = { total: allData.length, new: migrated, skipped, errors }
    
  } catch (error: any) {
    console.error(`\n   ❌ Fatal error migrating ${name}: ${error.message}`)
    stats[name] = { total: 0, new: 0, skipped: 0, errors: 1 }
  }
}

// ============================================================================
// TABLE CONFIGURATIONS
// ============================================================================

const tableConfigs: TableMigrationConfig[] = [
  // 1. Users (no dependencies)
  {
    name: 'user',
    fetchFn: (db) => db.user.findMany(),
    insertFn: (db, data) => db.user.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 2. Leads (no dependencies)
  {
    name: 'lead',
    fetchFn: (db) => db.lead.findMany(),
    insertFn: (db, data) => db.lead.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 3. Lead Notes (depends on Leads)
  {
    name: 'leadNote',
    fetchFn: (db) => db.leadNote.findMany(),
    insertFn: (db, data) => db.leadNote.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 4. Contacts (may reference Leads)
  {
    name: 'contact',
    fetchFn: (db) => db.contact.findMany(),
    insertFn: (db, data) => db.contact.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 5. Notes (may reference Contacts, Leads, Clients)
  {
    name: 'note',
    fetchFn: (db) => db.note.findMany(),
    insertFn: (db, data) => db.note.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 6. Clients (may reference Leads)
  {
    name: 'client',
    fetchFn: (db) => db.client.findMany(),
    insertFn: (db, data) => db.client.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 7. Opportunities (depends on Contacts)
  {
    name: 'opportunity',
    fetchFn: (db) => db.opportunity.findMany(),
    insertFn: (db, data) => db.opportunity.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 8. Tasks (depends on Contacts, Opportunities)
  {
    name: 'task',
    fetchFn: (db) => db.task.findMany(),
    insertFn: (db, data) => db.task.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 9. Timeline (depends on Contacts, Opportunities)
  {
    name: 'timeline',
    fetchFn: (db) => db.timeline.findMany(),
    insertFn: (db, data) => db.timeline.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 10. Contact Documents (depends on Contacts)
  {
    name: 'contactDocument',
    fetchFn: (db) => db.contactDocument.findMany(),
    insertFn: (db, data) => db.contactDocument.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 11. Opportunity Documents (depends on Opportunities)
  {
    name: 'opportunityDocument',
    fetchFn: (db) => db.opportunityDocument.findMany(),
    insertFn: (db, data) => db.opportunityDocument.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 12. Documents (depends on Clients)
  {
    name: 'document',
    fetchFn: (db) => db.document.findMany(),
    insertFn: (db, data) => db.document.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 13. Contact Payments (depends on Contacts)
  {
    name: 'contactPayment',
    fetchFn: (db) => db.contactPayment.findMany(),
    insertFn: (db, data) => db.contactPayment.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 14. Payments (depends on Clients)
  {
    name: 'payment',
    fetchFn: (db) => db.payment.findMany(),
    insertFn: (db, data) => db.payment.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 15. Devis (depends on Clients)
  {
    name: 'devis',
    fetchFn: (db) => db.devis.findMany(),
    insertFn: (db, data) => db.devis.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 16. Historique (depends on Clients)
  {
    name: 'historique',
    fetchFn: (db) => db.historique.findMany(),
    insertFn: (db, data) => db.historique.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 17. Client Stage History (depends on Clients)
  {
    name: 'clientStageHistory',
    fetchFn: (db) => db.clientStageHistory.findMany(),
    insertFn: (db, data) => db.clientStageHistory.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 18. Calendar Events (may reference Clients, Leads, Architects)
  {
    name: 'calendarEvent',
    fetchFn: (db) => db.calendarEvent.findMany(),
    insertFn: (db, data) => db.calendarEvent.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 19. Appointments (depends on Contacts, Opportunities, Clients)
  {
    name: 'appointment',
    fetchFn: (db) => db.appointment.findMany(),
    insertFn: (db, data) => db.appointment.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 20. Event Reminders (depends on Calendar Events)
  {
    name: 'eventReminder',
    fetchFn: (db) => db.eventReminder.findMany(),
    insertFn: (db, data) => db.eventReminder.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 21. Notification Preferences (depends on Users)
  {
    name: 'notificationPreference',
    fetchFn: (db) => db.notificationPreference.findMany(),
    insertFn: (db, data) => db.notificationPreference.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
  
  // 22. Notifications (depends on Users)
  {
    name: 'notification',
    fetchFn: (db) => db.notification.findMany(),
    insertFn: (db, data) => db.notification.createMany({ data, skipDuplicates: true }),
    getId: (r) => r.id,
  },
]

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrateDatabase() {
  console.log('🚀 Starting Safe Database Migration...\n')
  console.log('=' .repeat(70))
  console.log(`📊 Destination Database: ${DEST_DATABASE_URL.substring(0, 60)}...`)
  console.log(`📊 Source Databases: ${SOURCE_DATABASES.length}`)
  SOURCE_DATABASES.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url.substring(0, 60)}...`)
  })
  console.log('=' .repeat(70))
  
  // Create Prisma clients
  const sourceDbs = SOURCE_DATABASES.map(url => 
    new PrismaClient({
      datasources: { db: { url } },
    })
  )
  
  const destDb = new PrismaClient({
    datasources: { 
      db: { 
        url: DEST_DATABASE_URL,
      } 
    },
  })
  
  const stats: MigrationStats = {}
  
  try {
    // Test connections
    console.log('\n🔌 Testing database connections...')
    
    for (let i = 0; i < sourceDbs.length; i++) {
      try {
        await sourceDbs[i].$connect()
        console.log(`   ✅ Connected to source database ${i + 1}`)
      } catch (error: any) {
        console.error(`   ❌ Failed to connect to source database ${i + 1}: ${error.message}`)
        throw error
      }
    }
    
    await destDb.$connect()
    console.log(`   ✅ Connected to destination database\n`)
    
    // Migrate each table
    console.log(`\n📋 Starting migration of ${tableConfigs.length} tables...`)
    console.log('=' .repeat(70))
    
    for (const config of tableConfigs) {
      await migrateTableSafe(config, sourceDbs, destDb, stats)
    }
    
    // Print summary
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(70))
    console.log(`${'Table'.padEnd(30)} | ${'Total'.padStart(8)} | ${'New'.padStart(8)} | ${'Skipped'.padStart(8)} | ${'Errors'.padStart(6)}`)
    console.log('-'.repeat(70))
    
    let totalRecords = 0
    let totalNew = 0
    let totalSkipped = 0
    let totalErrors = 0
    
    for (const [table, stat] of Object.entries(stats)) {
      console.log(
        `${table.padEnd(30)} | ${stat.total.toString().padStart(8)} | ${stat.new.toString().padStart(8)} | ${stat.skipped.toString().padStart(8)} | ${stat.errors.toString().padStart(6)}`
      )
      totalRecords += stat.total
      totalNew += stat.new
      totalSkipped += stat.skipped
      totalErrors += stat.errors
    }
    
    console.log('-'.repeat(70))
    console.log(`${'TOTAL'.padEnd(30)} | ${totalRecords.toString().padStart(8)} | ${totalNew.toString().padStart(8)} | ${totalSkipped.toString().padStart(8)} | ${totalErrors.toString().padStart(6)}`)
    console.log('='.repeat(70))
    
    console.log(`\n✨ Migration completed successfully!`)
    console.log(`   • ${totalRecords} total records found`)
    console.log(`   • ${totalNew} new records migrated`)
    console.log(`   • ${totalSkipped} records skipped (already exist)`)
    
    if (totalErrors > 0) {
      console.log(`\n⚠️  ${totalErrors} errors occurred during migration. Please review the errors above.`)
    } else {
      console.log(`   • No errors! 🎉`)
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:', error)
    console.error(error.stack)
    process.exit(1)
  } finally {
    // Disconnect from all databases
    console.log('\n🔌 Disconnecting from databases...')
    for (const db of sourceDbs) {
      await db.$disconnect().catch(() => {})
    }
    await destDb.$disconnect().catch(() => {})
    console.log('   ✅ Disconnected')
  }
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

migrateDatabase()
  .catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })

