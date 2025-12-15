/**
 * Cleanup Script: Remove Invalid Legacy Clients with Deleted Opportunities
 * 
 * This script:
 * 1. Finds legacy clients with composite IDs (contactId-opportunityId format)
 * 2. Verifies the opportunity still exists
 * 3. Deletes clients that reference deleted opportunities
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function cleanupInvalidLegacyClients() {
  console.log('🚀 Starting cleanup of invalid legacy clients...\n')

  try {
    // Find all clients with composite IDs
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        architecteAssigne: true
      }
    })

    console.log(`📊 Found ${allClients.length} total clients\n`)

    // Filter clients with composite IDs
    const compositeIdClients = allClients.filter(c => 
      c.id.includes('-') && c.id.split('-').length === 2
    )

    console.log(`📋 Found ${compositeIdClients.length} client(s) with composite IDs\n`)

    if (compositeIdClients.length === 0) {
      console.log('✨ No composite ID clients found. Nothing to clean up!')
      return
    }

    // Verify each composite ID client
    const invalidClients: Array<{ id: string; nom: string; opportunityId: string }> = []
    let validCount = 0

    for (const client of compositeIdClients) {
      const [contactId, opportunityId] = client.id.split('-')
      
      // Check if opportunity exists
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, titre: true }
      })

      if (!opportunity) {
        invalidClients.push({
          id: client.id,
          nom: client.nom,
          opportunityId: opportunityId
        })
        console.log(`❌ Invalid: "${client.nom}" (${client.id})`)
        console.log(`   Opportunity ${opportunityId} does not exist`)
      } else {
        validCount++
        console.log(`✅ Valid: "${client.nom}" (${client.id})`)
        console.log(`   Opportunity: "${opportunity.titre}" (${opportunity.id})`)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Valid composite clients: ${validCount}`)
    console.log(`   Invalid composite clients: ${invalidClients.length}\n`)

    if (invalidClients.length === 0) {
      console.log('✨ No invalid clients found. Database is clean!')
      return
    }

    // Display invalid clients
    console.log('📋 Invalid clients to be deleted:')
    console.log('─'.repeat(80))
    invalidClients.forEach((client, index) => {
      console.log(`${index + 1}. "${client.nom}" (${client.id})`)
      console.log(`   Opportunity ID: ${client.opportunityId} (deleted)`)
      console.log('')
    })
    console.log('─'.repeat(80))
    console.log('')

    // Delete invalid clients
    console.log('🗑️  Deleting invalid legacy clients...\n')

    let deletedCount = 0
    let errorCount = 0

    for (const invalid of invalidClients) {
      try {
        await prisma.client.delete({
          where: { id: invalid.id }
        })
        deletedCount++
        console.log(`✅ Deleted: "${invalid.nom}" (${invalid.id})`)
      } catch (error) {
        errorCount++
        console.error(`❌ Error deleting ${invalid.id}:`, error)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 Cleanup Summary:')
    console.log('='.repeat(80))
    console.log(`Total composite clients checked: ${compositeIdClients.length}`)
    console.log(`Valid clients: ${validCount}`)
    console.log(`Invalid clients found: ${invalidClients.length}`)
    console.log(`Successfully deleted: ${deletedCount}`)
    console.log(`Errors: ${errorCount}`)
    console.log('='.repeat(80))

    if (deletedCount > 0) {
      console.log('\n✨ Cleanup completed successfully!')
      console.log(`🗑️  Removed ${deletedCount} invalid legacy client(s).`)
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupInvalidLegacyClients()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

