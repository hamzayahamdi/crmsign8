/**
 * Verification Script: Check Architect Dossiers for Deleted Opportunities
 * 
 * This script:
 * 1. Checks all opportunities assigned to architects
 * 2. Verifies each opportunity still exists in the database
 * 3. Reports any inconsistencies
 * 4. Can optionally clean up orphaned references
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function verifyArchitectDossiers(architectId?: string) {
  console.log('🔍 Starting verification of architect dossiers...\n')

  try {
    // Get architect(s)
    const architects = architectId
      ? await prisma.user.findMany({
          where: { id: architectId, role: 'architect' },
          select: { id: true, name: true, email: true }
        })
      : await prisma.user.findMany({
          where: { role: 'architect' },
          select: { id: true, name: true, email: true }
        })

    if (architects.length === 0) {
      console.log('❌ No architects found')
      return
    }

    console.log(`📊 Found ${architects.length} architect(s) to verify\n`)

    for (const architect of architects) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`🏗️  Architect: ${architect.name} (${architect.id})`)
      console.log('='.repeat(80))

      // Fetch opportunities assigned to this architect (direct)
      const opportunities = await prisma.opportunity.findMany({
        where: {
          architecteAssigne: {
            in: [architect.id, architect.name]
          }
        },
        include: {
          contact: {
            select: {
              id: true,
              nom: true
            }
          }
        }
      })

      // Fetch contacts assigned to this architect (with their opportunities)
      const contacts = await prisma.contact.findMany({
        where: {
          architecteAssigne: {
            in: [architect.id, architect.name]
          }
        },
        include: {
          opportunities: {
            select: {
              id: true,
              titre: true,
              type: true,
              pipelineStage: true,
              budget: true
            }
          }
        }
      })

      // Fetch legacy clients assigned to this architect
      const legacyClients = await prisma.client.findMany({
        where: {
          architecteAssigne: {
            in: [architect.id, architect.name]
          }
        },
        select: {
          id: true,
          nom: true,
          typeProjet: true,
          statutProjet: true
        }
      })

      console.log(`\n📋 Found:`)
      console.log(`   - ${opportunities.length} direct opportunity(ies)`)
      console.log(`   - ${contacts.length} contact(s) with ${contacts.reduce((sum, c) => sum + c.opportunities.length, 0)} opportunity(ies)`)
      console.log(`   - ${legacyClients.length} legacy client(s)\n`)

      // Check contacts' opportunities
      const allContactOpportunities = contacts.flatMap(c => c.opportunities)
      const totalOpportunities = opportunities.length + allContactOpportunities.length

      if (totalOpportunities === 0 && legacyClients.length === 0) {
        console.log('✅ No dossiers found - nothing to verify')
        continue
      }

      // Verify direct opportunities
      let validCount = 0
      let invalidCount = 0
      const invalidOpportunities: Array<{ id: string; titre: string; contactId: string; source: string }> = []

      console.log('\n🔍 Verifying direct opportunities:')
      for (const opp of opportunities) {
        // Check if contact exists
        if (!opp.contact || !opp.contact.id) {
          invalidCount++
          invalidOpportunities.push({
            id: opp.id,
            titre: opp.titre,
            contactId: opp.contactId,
            source: 'direct'
          })
          console.log(`❌ Invalid: "${opp.titre}" (${opp.id})`)
          console.log(`   Contact ID ${opp.contactId} does not exist`)
        } else {
          validCount++
          console.log(`✅ Valid: "${opp.titre}" (${opp.id})`)
          console.log(`   Contact: ${opp.contact.nom} (${opp.contact.id})`)
        }
      }

      // Verify contact opportunities
      console.log('\n🔍 Verifying contact opportunities:')
      for (const contact of contacts) {
        for (const opp of contact.opportunities) {
          // Verify opportunity still exists in database
          const oppExists = await prisma.opportunity.findUnique({
            where: { id: opp.id },
            select: { id: true }
          })

          if (!oppExists) {
            invalidCount++
            invalidOpportunities.push({
              id: opp.id,
              titre: opp.titre || 'Unknown',
              contactId: contact.id,
              source: `contact: ${contact.nom}`
            })
            console.log(`❌ Invalid: "${opp.titre || 'Unknown'}" (${opp.id})`)
            console.log(`   Opportunity does not exist in database`)
            console.log(`   Contact: ${contact.nom} (${contact.id})`)
          } else {
            validCount++
            console.log(`✅ Valid: "${opp.titre || 'Unknown'}" (${opp.id})`)
            console.log(`   Contact: ${contact.nom} (${contact.id})`)
          }
        }
      }

      // Check legacy clients for composite IDs
      console.log('\n🔍 Verifying legacy clients:')
      const compositeIdClients = legacyClients.filter(c => c.id.includes('-') && c.id.split('-').length === 2)
      if (compositeIdClients.length > 0) {
        console.log(`   Found ${compositeIdClients.length} client(s) with composite IDs (opportunity-based)`)
        for (const client of compositeIdClients) {
          const [contactId, opportunityId] = client.id.split('-')
          const oppExists = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            select: { id: true }
          })

          if (!oppExists) {
            invalidCount++
            console.log(`❌ Invalid: "${client.nom}" (${client.id})`)
            console.log(`   Opportunity ${opportunityId} does not exist`)
          } else {
            validCount++
            console.log(`✅ Valid: "${client.nom}" (${client.id})`)
          }
        }
      } else {
        console.log(`   No composite ID clients found`)
      }

      if (legacyClients.length - compositeIdClients.length > 0) {
        console.log(`   ${legacyClients.length - compositeIdClients.length} regular legacy client(s) found`)
      }

      console.log(`\n📊 Summary for ${architect.name}:`)
      console.log(`   Valid opportunities: ${validCount}`)
      console.log(`   Invalid opportunities: ${invalidCount}`)

      if (invalidOpportunities.length > 0) {
        console.log(`\n⚠️  Found ${invalidOpportunities.length} invalid opportunity(ies):`)
        invalidOpportunities.forEach((opp, index) => {
          console.log(`   ${index + 1}. "${opp.titre}" (${opp.id})`)
          console.log(`      Contact ID: ${opp.contactId} (missing)`)
        })

        // Ask if user wants to delete (for now, just report)
        console.log(`\n💡 These opportunities should be deleted to clean up the architect's dossier list.`)
        console.log(`   Run the cleanup script to remove them.`)
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log('✅ Verification completed!')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error during verification:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Get architect ID from command line if provided
const architectId = process.argv[2]

verifyArchitectDossiers(architectId)
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

