/**
 * Database Migration Script
 * 
 * This script migrates all data from the old database to the new database.
 * 
 * IMPORTANT: Before running this script:
 * 1. Update your .env file with the new DATABASE_URL and DIRECT_URL
 * 2. Make sure the new database is empty or you're okay with data being added
 * 3. Ensure you have backups of both databases
 * 
 * Usage:
 *   OLD_DATABASE_URL="..." NEW_DATABASE_URL="..." tsx scripts/migrate-database.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

// Get database URLs from environment or command line
// Also try to read from backup file

const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')
let OLD_DATABASE_URL = process.env.OLD_DATABASE_URL
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL

// Try to read old URL from backup file if not provided
if (!OLD_DATABASE_URL && fs.existsSync(OLD_DB_BACKUP_FILE)) {
  OLD_DATABASE_URL = fs.readFileSync(OLD_DB_BACKUP_FILE, 'utf-8').trim()
}

if (!OLD_DATABASE_URL) {
  console.error('❌ OLD_DATABASE_URL is required')
  console.error('\nTo migrate data, you need to provide your OLD database URL.')
  console.error('\nOptions:')
  console.error('  1. Set environment variable: OLD_DATABASE_URL="..." npm run db:migrate')
  console.error('  2. Save it first: tsx scripts/save-old-db-url.ts "your-old-url"')
  console.error('  3. Or create .old-database-url.txt file with your old URL')
  process.exit(1)
}

if (!NEW_DATABASE_URL) {
  console.error('❌ NEW_DATABASE_URL or DATABASE_URL must be set')
  console.error('   Make sure your .env file has the new DATABASE_URL')
  console.error('   Example: NEW_DATABASE_URL="postgresql://..." tsx scripts/migrate-database.ts')
  process.exit(1)
}

// Create Prisma clients for old and new databases
const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: OLD_DATABASE_URL,
    },
  },
})

const newDb = new PrismaClient({
  datasources: {
    db: {
      url: NEW_DATABASE_URL,
    },
  },
})

interface MigrationStats {
  [key: string]: { total: number; migrated: number; errors: number }
}

const stats: MigrationStats = {}

async function migrateTable<T>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  insertFn: (data: T[]) => Promise<any>,
  transformFn?: (data: T) => any
) {
  console.log(`\n📦 Migrating ${tableName}...`)
  
  try {
    // Fetch all data from old database
    const data = await fetchFn()
    console.log(`   Found ${data.length} records`)
    
    if (data.length === 0) {
      console.log(`   ⏭️  No data to migrate`)
      stats[tableName] = { total: 0, migrated: 0, errors: 0 }
      return
    }

    // Transform data if needed
    const transformedData = transformFn 
      ? data.map(transformFn)
      : data

    // Insert in batches to avoid memory issues
    const batchSize = 100
    let migrated = 0
    let errors = 0

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)
      try {
        await insertFn(batch)
        migrated += batch.length
        process.stdout.write(`   Progress: ${migrated}/${data.length}\r`)
      } catch (error: any) {
        console.error(`\n   ❌ Error inserting batch ${i / batchSize + 1}:`, error.message)
        errors += batch.length
      }
    }

    console.log(`\n   ✅ Migrated ${migrated} records (${errors} errors)`)
    stats[tableName] = { total: data.length, migrated, errors }
  } catch (error: any) {
    console.error(`\n   ❌ Error migrating ${tableName}:`, error.message)
    stats[tableName] = { total: 0, migrated: 0, errors: 1 }
  }
}

async function migrateDatabase() {
  console.log('🚀 Starting database migration...\n')
  console.log(`📊 Old Database: ${OLD_DATABASE_URL.substring(0, 50)}...`)
  console.log(`📊 New Database: ${NEW_DATABASE_URL.substring(0, 50)}...\n`)

  try {
    // Test connections
    console.log('🔌 Testing database connections...')
    await oldDb.$connect()
    console.log('   ✅ Connected to old database')
    
    await newDb.$connect()
    console.log('   ✅ Connected to new database\n')

    // Migrate in order respecting foreign key constraints
    // 1. Users (no dependencies)
    await migrateTable(
      'users',
      () => oldDb.user.findMany(),
      (data) => newDb.user.createMany({ data, skipDuplicates: true })
    )

    // 2. Leads (no dependencies on other tables)
    await migrateTable(
      'leads',
      () => oldDb.lead.findMany(),
      (data) => newDb.lead.createMany({ data, skipDuplicates: true })
    )

    // 3. Lead Notes (depends on Leads)
    await migrateTable(
      'lead_notes',
      () => oldDb.leadNote.findMany(),
      (data) => newDb.leadNote.createMany({ data, skipDuplicates: true })
    )

    // 4. Contacts (may reference Leads)
    await migrateTable(
      'contacts',
      () => oldDb.contact.findMany(),
      (data) => newDb.contact.createMany({ data, skipDuplicates: true })
    )

    // 5. Notes (may reference Contacts, Leads, Clients)
    await migrateTable(
      'notes',
      () => oldDb.note.findMany(),
      (data) => newDb.note.createMany({ data, skipDuplicates: true })
    )

    // 6. Clients (may reference Leads)
    await migrateTable(
      'clients',
      () => oldDb.client.findMany(),
      (data) => newDb.client.createMany({ data, skipDuplicates: true })
    )

    // 7. Opportunities (depends on Contacts)
    await migrateTable(
      'opportunities',
      () => oldDb.opportunity.findMany(),
      (data) => newDb.opportunity.createMany({ data, skipDuplicates: true })
    )

    // 8. Tasks (depends on Contacts, Opportunities)
    await migrateTable(
      'tasks',
      () => oldDb.task.findMany(),
      (data) => newDb.task.createMany({ data, skipDuplicates: true })
    )

    // 9. Timeline (depends on Contacts, Opportunities)
    await migrateTable(
      'timeline',
      () => oldDb.timeline.findMany(),
      (data) => newDb.timeline.createMany({ data, skipDuplicates: true })
    )

    // 10. Contact Documents (depends on Contacts)
    await migrateTable(
      'contact_documents',
      () => oldDb.contactDocument.findMany(),
      (data) => newDb.contactDocument.createMany({ data, skipDuplicates: true })
    )

    // 11. Opportunity Documents (depends on Opportunities)
    await migrateTable(
      'opportunity_documents',
      () => oldDb.opportunityDocument.findMany(),
      (data) => newDb.opportunityDocument.createMany({ data, skipDuplicates: true })
    )

    // 12. Documents (depends on Clients)
    await migrateTable(
      'documents',
      () => oldDb.document.findMany(),
      (data) => newDb.document.createMany({ data, skipDuplicates: true })
    )

    // 13. Contact Payments (depends on Contacts)
    await migrateTable(
      'contact_payments',
      () => oldDb.contactPayment.findMany(),
      (data) => newDb.contactPayment.createMany({ data, skipDuplicates: true })
    )

    // 14. Payments (depends on Clients)
    await migrateTable(
      'payments',
      () => oldDb.payment.findMany(),
      (data) => newDb.payment.createMany({ data, skipDuplicates: true })
    )

    // 15. Devis (depends on Clients)
    await migrateTable(
      'devis',
      () => oldDb.devis.findMany(),
      (data) => newDb.devis.createMany({ data, skipDuplicates: true })
    )

    // 16. Historique (depends on Clients)
    await migrateTable(
      'historique',
      () => oldDb.historique.findMany(),
      (data) => newDb.historique.createMany({ data, skipDuplicates: true })
    )

    // 17. Client Stage History (depends on Clients)
    await migrateTable(
      'client_stage_history',
      () => oldDb.clientStageHistory.findMany(),
      (data) => newDb.clientStageHistory.createMany({ data, skipDuplicates: true })
    )

    // 18. Calendar Events (may reference Clients, Leads, Architects)
    await migrateTable(
      'calendar_events',
      () => oldDb.calendarEvent.findMany(),
      (data) => newDb.calendarEvent.createMany({ data, skipDuplicates: true })
    )

    // 19. Appointments (depends on Contacts, Opportunities, Clients)
    await migrateTable(
      'appointments',
      () => oldDb.appointment.findMany(),
      (data) => newDb.appointment.createMany({ data, skipDuplicates: true })
    )

    // 20. Event Reminders (depends on Calendar Events)
    await migrateTable(
      'event_reminders',
      () => oldDb.eventReminder.findMany(),
      (data) => newDb.eventReminder.createMany({ data, skipDuplicates: true })
    )

    // 21. Notification Preferences (depends on Users)
    await migrateTable(
      'notification_preferences',
      () => oldDb.notificationPreference.findMany(),
      (data) => newDb.notificationPreference.createMany({ data, skipDuplicates: true })
    )

    // 22. Notifications (depends on Users)
    await migrateTable(
      'notifications',
      () => oldDb.notification.findMany(),
      (data) => newDb.notification.createMany({ data, skipDuplicates: true })
    )

    // Print summary
    console.log('\n\n📊 Migration Summary:')
    console.log('=' .repeat(60))
    
    let totalRecords = 0
    let totalMigrated = 0
    let totalErrors = 0

    for (const [table, stat] of Object.entries(stats)) {
      console.log(`${table.padEnd(30)} | Total: ${stat.total.toString().padStart(6)} | Migrated: ${stat.migrated.toString().padStart(6)} | Errors: ${stat.errors.toString().padStart(4)}`)
      totalRecords += stat.total
      totalMigrated += stat.migrated
      totalErrors += stat.errors
    }

    console.log('='.repeat(60))
    console.log(`Total Records: ${totalRecords}`)
    console.log(`Total Migrated: ${totalMigrated}`)
    console.log(`Total Errors: ${totalErrors}`)
    console.log(`\n✨ Migration completed!`)

    if (totalErrors > 0) {
      console.log(`\n⚠️  Some records failed to migrate. Please review the errors above.`)
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error during migration:', error)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await oldDb.$disconnect()
    await newDb.$disconnect()
    console.log('\n🔌 Disconnected from databases')
  }
}

// Run migration
migrateDatabase()
  .catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })

