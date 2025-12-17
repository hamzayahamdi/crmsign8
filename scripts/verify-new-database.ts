/**
 * Script to verify connection to the new database
 * 
 * This script tests the connection to the new database and verifies
 * that the schema can be applied.
 * 
 * Usage:
 *   tsx scripts/verify-new-database.ts
 */

import { PrismaClient } from '@prisma/client'

const DATABASE_URL = process.env.DATABASE_URL
const DIRECT_URL = process.env.DIRECT_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
})

async function verifyDatabase() {
  console.log('🔍 Verifying new database connection...\n')

  try {
    // Test connection
    console.log('1. Testing connection...')
    await prisma.$connect()
    console.log('   ✅ Successfully connected to database\n')

    // Test basic query - check if tables exist first
    console.log('2. Testing basic query...')
    let tablesExist = false
    let userCount = 0
    
    try {
      userCount = await prisma.user.count()
      tablesExist = true
      console.log(`   ✅ Query successful (found ${userCount} users)\n`)
    } catch (error: any) {
      if (error.code === 'P2021') {
        // Table doesn't exist - this is expected for a new database
        console.log('   ℹ️  Database is empty (no tables yet)\n')
        console.log('   📝 You need to create the schema first:')
        console.log('      Run: npx prisma generate')
        console.log('      Run: npx prisma db push\n')
      } else {
        throw error
      }
    }

    // Test all tables (only if they exist)
    if (tablesExist) {
      console.log('3. Checking database tables...')
      const tables = {
        users: await prisma.user.count(),
        leads: await prisma.lead.count(),
        contacts: await prisma.contact.count(),
        clients: await prisma.client.count(),
        opportunities: await prisma.opportunity.count(),
        tasks: await prisma.task.count(),
        notifications: await prisma.notification.count(),
        calendarEvents: await prisma.calendarEvent.count(),
        appointments: await prisma.appointment.count(),
      }

      console.log('   Table counts:')
      for (const [table, count] of Object.entries(tables)) {
        console.log(`      ${table.padEnd(20)}: ${count}`)
      }

      // Check if database is empty (for new migration)
      const totalRecords = Object.values(tables).reduce((a, b) => a + b, 0)
      if (totalRecords === 0) {
        console.log('\n   ℹ️  Database appears to be empty (ready for migration)')
      } else {
        console.log(`\n   ⚠️  Database contains ${totalRecords} records`)
        console.log('   Make sure you want to migrate to this database!')
      }
    } else {
      console.log('3. Skipping table checks (schema not created yet)')
    }

    // Test DIRECT_URL if provided
    if (DIRECT_URL) {
      console.log('\n4. Testing DIRECT_URL connection...')
      const directPrisma = new PrismaClient({
        datasources: {
          db: {
            url: DIRECT_URL,
          },
        },
      })
      await directPrisma.$connect()
      console.log('   ✅ DIRECT_URL connection successful')
      await directPrisma.$disconnect()
    } else {
      console.log('\n4. DIRECT_URL not set (optional for connection pooling)')
    }

    console.log('\n✨ Database verification completed successfully!')
    
    if (!tablesExist) {
      console.log('\n📝 Next steps:')
      console.log('   1. Create schema: npx prisma generate && npx prisma db push')
      console.log('   2. Then run the migration script to transfer data')
    } else {
      console.log('\n📝 Next steps:')
      console.log('   Database is ready! You can now run the migration script.')
    }

  } catch (error: any) {
    console.error('\n❌ Database verification failed:', error.message)
    if (error.code === 'P1001') {
      console.error('   This usually means the database URL is incorrect or the database is not accessible')
    } else if (error.code === 'P1003') {
      console.error('   This usually means the database does not exist')
    }
    console.error('\n   Error details:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

verifyDatabase().catch((error) => {
  console.error('❌ Unhandled error:', error)
  process.exit(1)
})
