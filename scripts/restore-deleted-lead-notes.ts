/**
 * Restore Deleted Lead Notes from Backups
 * 
 * This script:
 * 1. Finds all contacts that were converted from leads (have leadId)
 * 2. Searches all backup files for the original lead notes
 * 3. Restores notes to unified Note table and links them to contacts
 * 4. Preserves full history and traceability
 * 
 * Run with: npx tsx scripts/restore-deleted-lead-notes.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface LeadBackupNote {
  content: string
  author: string
  createdAt: string
}

interface LeadBackup {
  id: string
  nom: string
  telephone: string
  ville: string
  notes: LeadBackupNote[]
  statutDetaille: string
  message: string | null
}

async function restoreDeletedLeadNotes() {
  console.log('🔄 Starting restoration of deleted lead notes...\n')

  try {
    // Step 1: Find all contacts that were converted from leads
    const contactsWithLeadId = await prisma.contact.findMany({
      where: {
        leadId: { not: null },
      },
      select: {
        id: true,
        nom: true,
        telephone: true,
        leadId: true,
      },
    })

    console.log(`📋 Found ${contactsWithLeadId.length} contacts converted from leads\n`)

    if (contactsWithLeadId.length === 0) {
      console.log('ℹ️  No contacts found with leadId. Nothing to restore.\n')
      return
    }

    // Step 2: Load all backup files
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      console.error('❌ Backups directory not found!')
      return
    }

    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith('leads-backup-') && file.endsWith('.json'))
      .sort()
      .reverse() // Start with most recent

    console.log(`📦 Found ${backupFiles.length} backup files\n`)

    if (backupFiles.length === 0) {
      console.error('❌ No backup files found!')
      return
    }

    // Step 3: Load all backups into memory
    const allBackups: Map<string, LeadBackup> = new Map()

    for (const backupFile of backupFiles) {
      const backupPath = path.join(backupDir, backupFile)
      try {
        const backupData: LeadBackup[] = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
        console.log(`  📄 Loaded ${backupData.length} leads from ${backupFile}`)

        // Merge backups (most recent takes precedence)
        for (const lead of backupData) {
          if (!allBackups.has(lead.id)) {
            allBackups.set(lead.id, lead)
          }
        }
      } catch (error) {
        console.error(`  ⚠️  Error reading ${backupFile}:`, error)
      }
    }

    console.log(`\n📊 Total unique leads in backups: ${allBackups.size}\n`)

    // Step 4: Restore notes for each contact
    let totalNotesRestored = 0
    let contactsProcessed = 0
    let contactsWithNotes = 0
    let errors = 0

    for (const contact of contactsWithLeadId) {
      if (!contact.leadId) continue

      try {
        let leadBackup = allBackups.get(contact.leadId)

        // If direct leadId match fails, try matching by name and phone
        if (!leadBackup) {
          // Try to find by name and phone (normalized)
          const normalizedContactPhone = contact.telephone.replace(/\s+/g, '').replace(/^0/, '')
          
          for (const [leadId, backup] of allBackups.entries()) {
            const normalizedBackupPhone = backup.telephone.replace(/\s+/g, '').replace(/^0/, '')
            
            // Match by name (case insensitive) and phone
            if (
              backup.nom.toLowerCase().trim() === contact.nom.toLowerCase().trim() &&
              normalizedBackupPhone === normalizedContactPhone
            ) {
              leadBackup = backup
              console.log(`  🔍 Matched by name/phone: "${contact.nom}" (leadId: ${leadId.substring(0, 8)}...)`)
              break
            }
          }
        }

        if (!leadBackup) {
          console.log(`  ⚠️  No backup found for lead ${contact.leadId.substring(0, 8)}... (contact: ${contact.nom}, phone: ${contact.telephone})`)
          continue
        }

        if (!leadBackup.notes || leadBackup.notes.length === 0) {
          console.log(`  ℹ️  No notes found for lead ${contact.leadId.substring(0, 8)}... (contact: ${contact.nom})`)
          continue
        }

        let notesRestoredForContact = 0

        for (const noteBackup of leadBackup.notes) {
          // Check if note already exists (avoid duplicates)
          const existing = await prisma.note.findFirst({
            where: {
              entityType: 'contact',
              entityId: contact.id,
              content: noteBackup.content,
              sourceType: 'lead',
              sourceId: contact.leadId,
              createdAt: new Date(noteBackup.createdAt),
            },
          })

          if (!existing) {
            try {
              await prisma.note.create({
                data: {
                  content: noteBackup.content,
                  author: noteBackup.author,
                  entityType: 'contact',
                  entityId: contact.id,
                  sourceType: 'lead', // Original source
                  sourceId: leadBackup.id, // Use the matched lead ID from backup
                  createdAt: new Date(noteBackup.createdAt), // Preserve original date
                },
              })

              notesRestoredForContact++
              totalNotesRestored++
            } catch (createError: any) {
              // If table doesn't exist, skip with warning
              if (createError.code === 'P2021' || createError.message?.includes('does not exist')) {
                console.log(`  ⚠️  Notes table does not exist. Please run: npx prisma db push`)
                return
              }
              throw createError
            }
          }
        }

        if (notesRestoredForContact > 0) {
          contactsWithNotes++
          console.log(
            `  ✅ Restored ${notesRestoredForContact} notes for contact "${contact.nom}" (lead: ${contact.leadId.substring(0, 8)}...)`
          )
        } else {
          console.log(`  ℹ️  All notes already exist for contact "${contact.nom}"`)
        }

        contactsProcessed++
      } catch (error) {
        errors++
        console.error(`  ✗ Error processing contact ${contact.id} (${contact.nom}):`, error)
      }
    }

    // Step 5: Summary
    console.log(`\n✅ Restoration completed!`)
    console.log(`   - Contacts processed: ${contactsProcessed}`)
    console.log(`   - Contacts with notes restored: ${contactsWithNotes}`)
    console.log(`   - Total notes restored: ${totalNotesRestored}`)
    console.log(`   - Errors: ${errors}\n`)

    // Step 6: Final statistics (with error handling)
    let totalContactNotes = 0
    try {
      totalContactNotes = await prisma.note.count({
        where: {
          entityType: 'contact',
          sourceType: 'lead',
        },
      })
    } catch (error) {
      console.log(`   ⚠️  Could not count notes (table may not exist yet)`)
    }

    console.log(`📊 Final Statistics:`)
    if (totalContactNotes > 0) {
      console.log(`   - Total lead notes linked to contacts: ${totalContactNotes}`)
    }
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Check the contact details page to verify notes appear`)
    console.log(`   2. Verify that lead notes show with "Lead" badge`)
    console.log(`   3. Test that notes are not deletable (historical records)`)
  } catch (error) {
    console.error('❌ Restoration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run restoration
restoreDeletedLeadNotes()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

