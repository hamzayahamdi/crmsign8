/**
 * Script to fix missing typeBien in contact timeline metadata
 * 
 * This script:
 * 1. Finds all contacts that have a leadId
 * 2. Checks if their conversion timeline event has typeBien in metadata
 * 3. If missing, fetches the lead's typeBien and updates the timeline metadata
 * 4. This ensures the contacts table can display "Type de projet" correctly
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixContactTypeBien() {
  console.log('🔧 Starting fix for contact typeBien...\n')

  try {
    // Find all contacts with leadId
    const contacts = await prisma.contact.findMany({
      where: {
        leadId: {
          not: null
        }
      },
      include: {
        timeline: {
          where: {
            eventType: 'contact_converted_from_lead'
          },
          take: 1
        },
        opportunities: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    console.log(`📊 Found ${contacts.length} contacts with leadId\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const contact of contacts) {
      try {
        const conversionEvent = contact.timeline?.[0]
        
        // Check if metadata already has typeBien
        const metadata = conversionEvent?.metadata as any
        const hasTypeBien = metadata?.typeBien || metadata?.leadTypeBien

        if (hasTypeBien) {
          console.log(`✅ Contact ${contact.nom} (${contact.id}): Already has typeBien: ${hasTypeBien}`)
          skipped++
          continue
        }

        // If timeline event exists but no typeBien, log it
        if (conversionEvent && !hasTypeBien) {
          console.log(`⚠️  Contact ${contact.nom} (${contact.id}): Timeline event exists but no typeBien in metadata`)
        }

        // Fetch lead to get typeBien
        if (!contact.leadId) {
          console.log(`⚠️  Contact ${contact.nom} (${contact.id}): No leadId`)
          skipped++
          continue
        }

        const lead = await prisma.lead.findUnique({
          where: { id: contact.leadId },
          select: { typeBien: true, source: true }
        })

        if (!lead) {
          // Lead is deleted, try to get typeBien from opportunities
          if (contact.opportunities && contact.opportunities.length > 0) {
            const oppType = contact.opportunities[0].type
            const typeBienMap: Record<string, string> = {
              'villa': 'Villa',
              'appartement': 'Appartement',
              'magasin': 'Magasin',
              'bureau': 'Bureau',
              'riad': 'Riad',
              'studio': 'Studio',
              'renovation': 'Rénovation',
              'autre': 'Autre'
            }
            const typeBien = typeBienMap[oppType] || oppType
            
            // Update timeline with typeBien from opportunity
            if (conversionEvent) {
              const updatedMetadata = {
                ...(metadata || {}),
                typeBien: typeBien,
                leadTypeBien: typeBien,
                source: metadata?.source,
                leadSource: metadata?.leadSource,
              }

              await prisma.timeline.update({
                where: { id: conversionEvent.id },
                data: {
                  metadata: updatedMetadata
                }
              })

              console.log(`✅ Contact ${contact.nom} (${contact.id}): Updated from opportunity type: ${typeBien}`)
              updated++
              continue
            }
          }
          
          console.log(`⚠️  Contact ${contact.nom} (${contact.id}): Lead ${contact.leadId} not found (may be deleted) and no opportunities`)
          skipped++
          continue
        }

        if (!lead.typeBien) {
          console.log(`⚠️  Contact ${contact.nom} (${contact.id}): Lead has no typeBien`)
          skipped++
          continue
        }

        // Update timeline metadata
        if (conversionEvent) {
          // Update existing timeline event
          const updatedMetadata = {
            ...(metadata || {}),
            typeBien: lead.typeBien,
            leadTypeBien: lead.typeBien,
            source: lead.source || metadata?.source,
            leadSource: lead.source || metadata?.leadSource,
          }

          await prisma.timeline.update({
            where: { id: conversionEvent.id },
            data: {
              metadata: updatedMetadata
            }
          })

          console.log(`✅ Contact ${contact.nom} (${contact.id}): Updated timeline metadata with typeBien: ${lead.typeBien}`)
          updated++
        } else {
          // Create new timeline event if it doesn't exist
          // This shouldn't happen, but handle it just in case
          const createdBy = contact.createdBy || 'system'
          
          await prisma.timeline.create({
            data: {
              contactId: contact.id,
              eventType: 'contact_converted_from_lead',
              title: 'Contact créé depuis Lead',
              description: `Lead "${contact.nom}" a été converti en Contact`,
              metadata: {
                leadId: contact.leadId,
                leadStatut: contact.leadStatus || 'qualifie',
                source: lead.source,
                typeBien: lead.typeBien,
                leadTypeBien: lead.typeBien,
                leadSource: lead.source,
                convertedByUserId: createdBy,
                convertedByUserName: 'System',
              },
              author: createdBy,
            }
          })

          console.log(`✅ Contact ${contact.nom} (${contact.id}): Created timeline event with typeBien: ${lead.typeBien}`)
          updated++
        }
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.nom} (${contact.id}):`, error)
        errors++
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📊 Total: ${contacts.length}`)
    console.log('\n✨ Fix completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixContactTypeBien()
  .then(() => {
    console.log('\n🎉 Script finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

