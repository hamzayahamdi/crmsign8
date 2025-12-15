/**
 * Cleanup Script: Remove Orphaned Dossiers
 * 
 * This script:
 * 1. Finds all opportunities that reference non-existent contacts (orphaned)
 * 2. Deletes those orphaned opportunities (cascade will handle related records)
 * 3. Reports statistics on what was cleaned up
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function cleanupOrphanedDossiers() {
  console.log('🚀 Starting cleanup of orphaned dossiers...\n')

  try {
    // Step 1: Find all opportunities
    const allOpportunities = await prisma.opportunity.findMany({
      select: {
        id: true,
        titre: true,
        contactId: true,
        architecteAssigne: true,
        createdAt: true
      }
    })

    console.log(`📊 Found ${allOpportunities.length} total opportunities\n`)

    // Step 2: Check which opportunities have valid contacts
    const orphanedOpportunities: Array<{ id: string; titre: string; contactId: string; architecteAssigne: string | null }> = []
    let validCount = 0

    for (const opportunity of allOpportunities) {
      try {
        // Try to find the contact
        const contact = await prisma.contact.findUnique({
          where: { id: opportunity.contactId },
          select: { id: true }
        })

        if (!contact) {
          // Contact doesn't exist - this is an orphaned opportunity
          orphanedOpportunities.push({
            id: opportunity.id,
            titre: opportunity.titre,
            contactId: opportunity.contactId,
            architecteAssigne: opportunity.architecteAssigne
          })
        } else {
          validCount++
        }
      } catch (error) {
        // If there's an error finding the contact, treat it as orphaned
        console.warn(`⚠️  Error checking contact ${opportunity.contactId} for opportunity ${opportunity.id}:`, error)
        orphanedOpportunities.push({
          id: opportunity.id,
          titre: opportunity.titre,
          contactId: opportunity.contactId,
          architecteAssigne: opportunity.architecteAssigne
        })
      }
    }

    console.log(`✅ Valid opportunities: ${validCount}`)
    console.log(`❌ Orphaned opportunities found: ${orphanedOpportunities.length}\n`)

    if (orphanedOpportunities.length === 0) {
      console.log('✨ No orphaned opportunities found. Database is clean!')
      console.log('')
    }

    // Step 3: Display orphaned opportunities before deletion
    console.log('📋 Orphaned opportunities to be deleted:')
    console.log('─'.repeat(80))
    orphanedOpportunities.forEach((opp, index) => {
      console.log(`${index + 1}. ID: ${opp.id}`)
      console.log(`   Title: ${opp.titre}`)
      console.log(`   Contact ID (missing): ${opp.contactId}`)
      console.log(`   Architect: ${opp.architecteAssigne || 'N/A'}`)
      console.log('')
    })
    console.log('─'.repeat(80))
    console.log('')

    // Step 4: Delete orphaned opportunities
    console.log('🗑️  Deleting orphaned opportunities...\n')

    let deletedCount = 0
    let errorCount = 0

    for (const orphaned of orphanedOpportunities) {
      try {
        // Delete the opportunity - Prisma cascade will handle related records
        await prisma.opportunity.delete({
          where: { id: orphaned.id }
        })
        deletedCount++
        console.log(`✅ Deleted opportunity: ${orphaned.titre} (${orphaned.id})`)
      } catch (error) {
        errorCount++
        console.error(`❌ Error deleting opportunity ${orphaned.id}:`, error)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 Cleanup Summary:')
    console.log('='.repeat(80))
    console.log(`Total opportunities checked: ${allOpportunities.length}`)
    console.log(`Valid opportunities: ${validCount}`)
    console.log(`Orphaned opportunities found: ${orphanedOpportunities.length}`)
    console.log(`Successfully deleted: ${deletedCount}`)
    console.log(`Errors: ${errorCount}`)
    console.log('='.repeat(80))

    if (deletedCount > 0) {
      console.log('\n✨ Cleanup completed successfully!')
      console.log(`🗑️  Removed ${deletedCount} orphaned opportunity(ies) and their related records.`)
    }

    // Step 5: Additional verification - Check for opportunities with architect assignment
    console.log('\n' + '='.repeat(80))
    console.log('🔍 Additional Verification:')
    console.log('='.repeat(80))
    
    const opportunitiesWithArchitect = await prisma.opportunity.findMany({
      where: {
        architecteAssigne: { not: null }
      },
      select: {
        id: true,
        titre: true,
        architecteAssigne: true,
        contact: {
          select: {
            id: true,
            nom: true
          }
        }
      }
    })

    console.log(`\n📊 Opportunities with architect assignment: ${opportunitiesWithArchitect.length}`)
    
    if (opportunitiesWithArchitect.length > 0) {
      console.log('\nOpportunities assigned to architects:')
      opportunitiesWithArchitect.forEach((opp, index) => {
        console.log(`${index + 1}. "${opp.titre}" (${opp.id})`)
        console.log(`   Architect: ${opp.architecteAssigne}`)
        console.log(`   Contact: ${opp.contact?.nom || 'MISSING'} (${opp.contact?.id || 'MISSING'})`)
        if (!opp.contact) {
          console.log(`   ⚠️  WARNING: This opportunity has no contact!`)
        }
        console.log('')
      })
    }

    // Check legacy clients (architecteAssigne is required, so all clients have it)
    const legacyClients = await prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        architecteAssigne: true
      },
      take: 10
    })

    console.log(`\n📊 Legacy clients with architect assignment (showing first 10): ${legacyClients.length}`)
    if (legacyClients.length > 0) {
      console.log('\nSample legacy clients:')
      legacyClients.forEach((client, index) => {
        console.log(`${index + 1}. "${client.nom}" (${client.id})`)
        console.log(`   Architect: ${client.architecteAssigne}`)
        console.log('')
      })
    }

    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupOrphanedDossiers()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

