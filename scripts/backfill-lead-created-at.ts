/**
 * Backfill script to populate leadCreatedAt for existing contacts
 * This script finds contacts that were converted from leads and sets their leadCreatedAt
 * based on the lead's createdAt date (if the lead still exists) or from timeline metadata
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillLeadCreatedAt() {
  console.log('🔄 Starting backfill of leadCreatedAt for contacts...\n')

  try {
    // Find all contacts that have a leadId or were converted (tag = 'converted')
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { leadId: { not: null } },
          { tag: 'converted' }
        ]
      },
      select: {
        id: true,
        nom: true,
        leadId: true,
        leadCreatedAt: true,
        tag: true,
        createdAt: true
      }
    })

    console.log(`📊 Found ${contacts.length} contacts to check\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const contact of contacts) {
      try {
        // Skip if already has leadCreatedAt
        if (contact.leadCreatedAt) {
          console.log(`⏭️  Skipping ${contact.nom} (${contact.id}) - already has leadCreatedAt`)
          skipped++
          continue
        }

        // Try to find the lead by leadId
        if (contact.leadId) {
          try {
            const lead = await prisma.lead.findUnique({
              where: { id: contact.leadId },
              select: { createdAt: true, id: true }
            })

            if (lead) {
              // Update contact with lead's createdAt
              await prisma.contact.update({
                where: { id: contact.id },
                data: { leadCreatedAt: lead.createdAt }
              })
              console.log(`✅ Updated ${contact.nom} (${contact.id}) with leadCreatedAt: ${lead.createdAt}`)
              updated++
              continue
            }
          } catch (err) {
            // Lead might be deleted, continue to next method
          }
        }

        // Try to find lead by convertedToContactId
        const leadByConverted = await prisma.lead.findFirst({
          where: { convertedToContactId: contact.id },
          select: { createdAt: true, id: true }
        })

        if (leadByConverted) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { leadCreatedAt: leadByConverted.createdAt }
          })
          console.log(`✅ Updated ${contact.nom} (${contact.id}) with leadCreatedAt from convertedToContactId: ${leadByConverted.createdAt}`)
          updated++
          continue
        }

        // If no lead found, check timeline for metadata
        const timeline = await prisma.timeline.findFirst({
          where: {
            contactId: contact.id,
            eventType: 'contact_converted_from_lead',
            metadata: { not: null }
          },
          select: { metadata: true }
        })

        if (timeline?.metadata) {
          const metadata = timeline.metadata as any
          if (metadata.leadCreatedAt || metadata.createdAt) {
            const leadDate = metadata.leadCreatedAt || metadata.createdAt
            await prisma.contact.update({
              where: { id: contact.id },
              data: { leadCreatedAt: new Date(leadDate) }
            })
            console.log(`✅ Updated ${contact.nom} (${contact.id}) with leadCreatedAt from timeline: ${leadDate}`)
            updated++
            continue
          }
        }

        // If contact was converted but we can't find the lead, use contact's createdAt as fallback
        // (This is not ideal but better than nothing)
        if (contact.tag === 'converted') {
          console.log(`⚠️  Could not find lead for ${contact.nom} (${contact.id}), using contact createdAt as fallback`)
          await prisma.contact.update({
            where: { id: contact.id },
            data: { leadCreatedAt: contact.createdAt }
          })
          updated++
        } else {
          console.log(`❌ Could not find lead data for ${contact.nom} (${contact.id})`)
          skipped++
        }

      } catch (error) {
        console.error(`❌ Error processing ${contact.nom} (${contact.id}):`, error)
        errors++
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`\n✨ Backfill completed!`)

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillLeadCreatedAt()
  .catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })

