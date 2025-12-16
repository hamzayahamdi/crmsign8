/**
 * Script to fix status of contacts converted from leads
 * 
 * This script:
 * 1. Finds all contacts that have a leadId (converted from leads)
 * 2. Updates their status to 'qualifie' and leadStatus to 'qualifie'
 * 3. Ensures all converted contacts follow the business rule: status must be "Qualifié"
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function fixConvertedContactsStatus() {
  console.log('🔧 Starting fix for converted contacts status...\n')

  try {
    // Find all contacts with leadId (converted from leads)
    const contacts = await prisma.contact.findMany({
      where: {
        leadId: {
          not: null
        }
      },
      select: {
        id: true,
        nom: true,
        status: true,
        leadStatus: true,
        leadId: true,
      }
    })

    console.log(`📊 Found ${contacts.length} contacts converted from leads\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const contact of contacts) {
      try {
        const needsUpdate = 
          contact.status !== 'qualifie' || 
          contact.leadStatus !== 'qualifie'

        if (!needsUpdate) {
          console.log(`✅ ${contact.nom} (${contact.id}): Already has correct status`)
          skipped++
          continue
        }

        console.log(`🔄 Updating ${contact.nom} (${contact.id}):`)
        console.log(`   Current status: ${contact.status || 'null'}`)
        console.log(`   Current leadStatus: ${contact.leadStatus || 'null'}`)

        // Update contact status to 'qualifie'
        const updatedContact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            status: 'qualifie',
            leadStatus: 'qualifie'
          }
        })

        console.log(`   ✅ Updated to status: ${updatedContact.status}, leadStatus: ${updatedContact.leadStatus}\n`)
        updated++

      } catch (error) {
        console.error(`   ❌ Error updating contact ${contact.nom} (${contact.id}):`, error)
        errors++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Skipped (already correct): ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📝 Total processed: ${contacts.length}`)

    if (updated > 0) {
      console.log('\n✨ Successfully fixed converted contacts status!')
    } else {
      console.log('\n✨ All contacts already have correct status!')
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixConvertedContactsStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

