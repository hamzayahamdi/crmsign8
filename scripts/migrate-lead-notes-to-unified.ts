/**
 * Migration Script: Copy Lead Notes to Unified Notes Table
 * 
 * This script:
 * 1. Copies all lead notes to the unified notes table
 * 2. Links notes to contacts if the lead was converted to a contact
 * 3. Preserves full history and traceability
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateLeadNotes() {
  console.log('🚀 Starting migration of lead notes to unified notes table...\n')

  try {
    // Get all lead notes
    const leadNotes = await prisma.leadNote.findMany({
      orderBy: { createdAt: 'asc' },
    })

    console.log(`📝 Found ${leadNotes.length} lead notes to migrate\n`)

    let migratedCount = 0
    let linkedToContactCount = 0
    let errors = 0

    for (const leadNote of leadNotes) {
      try {
        // Check if this lead was converted to a contact
        const lead = await prisma.lead.findUnique({
          where: { id: leadNote.leadId },
          select: { convertedToContactId: true },
        })

        // Create note in unified table for the lead
        await prisma.note.create({
          data: {
            content: leadNote.content,
            author: leadNote.author,
            entityType: 'lead',
            entityId: leadNote.leadId,
            sourceType: 'lead',
            sourceId: leadNote.leadId,
            createdAt: leadNote.createdAt,
          },
        })

        migratedCount++

        // If lead was converted to contact, also link the note to the contact
        if (lead?.convertedToContactId) {
          // Check if contact exists
          const contact = await prisma.contact.findUnique({
            where: { id: lead.convertedToContactId },
          })

          if (contact) {
            // Create a note linked to the contact (preserving lead history)
            await prisma.note.create({
              data: {
                content: leadNote.content,
                author: leadNote.author,
                entityType: 'contact',
                entityId: lead.convertedToContactId,
                sourceType: 'lead', // Original source
                sourceId: leadNote.leadId, // Original lead ID
                createdAt: leadNote.createdAt, // Preserve original date
              },
            })

            linkedToContactCount++
            console.log(
              `  ✓ Migrated note from lead ${leadNote.leadId} → contact ${lead.convertedToContactId}`
            )
          }
        } else {
          console.log(`  ✓ Migrated note for lead ${leadNote.leadId}`)
        }
      } catch (error) {
        errors++
        console.error(`  ✗ Error migrating note ${leadNote.id}:`, error)
      }
    }

    console.log(`\n✅ Migration completed!`)
    console.log(`   - Total lead notes migrated: ${migratedCount}`)
    console.log(`   - Notes linked to contacts: ${linkedToContactCount}`)
    console.log(`   - Errors: ${errors}\n`)

    // Also migrate existing contact notes from JSON to unified table
    console.log('🔄 Migrating existing contact notes from JSON to unified table...\n')

    const contacts = await prisma.contact.findMany({
      where: {
        notes: { not: null },
      },
    })

    let contactNotesMigrated = 0

    for (const contact of contacts) {
      if (!contact.notes) continue

      try {
        let notesArray: any[] = []

        // Parse notes JSON
        try {
          const parsed = JSON.parse(contact.notes)
          if (Array.isArray(parsed)) {
            notesArray = parsed
          } else if (typeof parsed === 'string' && parsed.trim()) {
            notesArray = [
              {
                content: parsed,
                createdAt: contact.createdAt,
                createdBy: contact.createdBy,
              },
            ]
          }
        } catch (e) {
          // Plain string
          if (typeof contact.notes === 'string' && contact.notes.trim()) {
            notesArray = [
              {
                content: contact.notes,
                createdAt: contact.createdAt,
                createdBy: contact.createdBy,
              },
            ]
          }
        }

        // Create notes in unified table
        for (const note of notesArray) {
          // Check if note already exists (avoid duplicates)
          const existing = await prisma.note.findFirst({
            where: {
              entityType: 'contact',
              entityId: contact.id,
              content: note.content,
              createdAt: new Date(note.createdAt || contact.createdAt),
            },
          })

          if (!existing) {
            await prisma.note.create({
              data: {
                content: note.content,
                author: note.createdBy || note.author || contact.createdBy,
                entityType: 'contact',
                entityId: contact.id,
                sourceType: 'contact',
                sourceId: contact.id,
                createdAt: new Date(note.createdAt || contact.createdAt),
              },
            })
            contactNotesMigrated++
          }
        }
      } catch (error) {
        console.error(`  ✗ Error migrating notes for contact ${contact.id}:`, error)
      }
    }

    console.log(`✅ Migrated ${contactNotesMigrated} contact notes from JSON to unified table\n`)

    console.log('🎉 All migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateLeadNotes()
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

