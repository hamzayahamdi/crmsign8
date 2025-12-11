/**
 * Complete Migration Script: Move ALL Notes to Unified Note Table
 * 
 * This script:
 * 1. Migrates all LeadNote records to unified Note table
 * 2. Links notes to contacts if leads were converted
 * 3. Migrates existing contact notes from JSON to unified table
 * 4. Ensures full traceability and history preservation
 * 
 * Run with: npx tsx scripts/migrate-all-notes-to-unified.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAllNotes() {
  console.log('🚀 Starting complete notes migration to unified table...\n')

  try {
    // Step 1: Migrate all lead notes
    console.log('📝 Step 1: Migrating lead notes...\n')
    const leadNotes = await prisma.leadNote.findMany({
      orderBy: { createdAt: 'asc' },
    })

    console.log(`Found ${leadNotes.length} lead notes to migrate\n`)

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

        // Check if note already exists (avoid duplicates)
        const existing = await prisma.note.findFirst({
          where: {
            entityType: 'lead',
            entityId: leadNote.leadId,
            content: leadNote.content,
            createdAt: leadNote.createdAt,
          },
        })

        if (!existing) {
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
        }

        // If lead was converted to contact, also link the note to the contact
        if (lead?.convertedToContactId) {
          const contact = await prisma.contact.findUnique({
            where: { id: lead.convertedToContactId },
          })

          if (contact) {
            // Check if note already linked to contact
            const existingContactNote = await prisma.note.findFirst({
              where: {
                entityType: 'contact',
                entityId: lead.convertedToContactId,
                content: leadNote.content,
                sourceType: 'lead',
                sourceId: leadNote.leadId,
                createdAt: leadNote.createdAt,
              },
            })

            if (!existingContactNote) {
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
                `  ✓ Linked note from lead ${leadNote.leadId.substring(0, 8)}... → contact ${lead.convertedToContactId.substring(0, 8)}...`
              )
            }
          }
        }
      } catch (error) {
        errors++
        console.error(`  ✗ Error migrating note ${leadNote.id}:`, error)
      }
    }

    console.log(`\n✅ Step 1 completed:`)
    console.log(`   - Lead notes migrated: ${migratedCount}`)
    console.log(`   - Notes linked to contacts: ${linkedToContactCount}`)
    console.log(`   - Errors: ${errors}\n`)

    // Step 2: Migrate existing contact notes from JSON to unified table
    console.log('🔄 Step 2: Migrating contact notes from JSON...\n')

    const contacts = await prisma.contact.findMany({
      where: {
        notes: { not: null },
      },
    })

    let contactNotesMigrated = 0
    let contactNotesSkipped = 0

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
          // Skip lead notes (they're already migrated)
          if (note.id?.startsWith('lead-note-') || note.type === 'lead_note' || note.source === 'lead') {
            contactNotesSkipped++
            continue
          }

          // Check if note already exists (avoid duplicates)
          const existing = await prisma.note.findFirst({
            where: {
              entityType: 'contact',
              entityId: contact.id,
              content: note.content || note.text || '',
              createdAt: new Date(note.createdAt || contact.createdAt),
            },
          })

          if (!existing) {
            await prisma.note.create({
              data: {
                content: note.content || note.text || '',
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

    console.log(`✅ Step 2 completed:`)
    console.log(`   - Contact notes migrated: ${contactNotesMigrated}`)
    console.log(`   - Lead notes skipped (already migrated): ${contactNotesSkipped}\n`)

    // Step 3: Summary
    const totalNotes = await prisma.note.count()
    const contactNotes = await prisma.note.count({
      where: { entityType: 'contact' },
    })
    const leadNotes = await prisma.note.count({
      where: { entityType: 'lead' },
    })

    console.log('📊 Final Statistics:')
    console.log(`   - Total notes in unified table: ${totalNotes}`)
    console.log(`   - Contact notes: ${contactNotes}`)
    console.log(`   - Lead notes: ${leadNotes}`)
    console.log(`\n🎉 All migrations completed successfully!`)
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Test the contact details page to verify notes appear correctly`)
    console.log(`   2. Verify that lead notes are visible for converted contacts`)
    console.log(`   3. Test adding new notes to ensure they're saved to unified table`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateAllNotes()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })



