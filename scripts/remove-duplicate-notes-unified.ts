/**
 * Remove Duplicate Notes from Unified Note Table
 * 
 * This script removes duplicate notes based on:
 * - Same content (normalized)
 * - Same author
 * - Same creation date (within 1 second)
 * - Same entity (contact/lead/client)
 * 
 * Keeps the oldest note (first occurrence) and removes duplicates.
 * 
 * Run with: npx tsx scripts/remove-duplicate-notes-unified.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NoteGroup {
  content: string
  author: string
  createdAt: Date
  entityType: string
  entityId: string
  notes: any[]
}

async function removeDuplicateNotes() {
  console.log('🧹 Starting duplicate notes removal...\n')

  try {
    // Get all notes grouped by entity
    const allNotes = await prisma.note.findMany({
      orderBy: [
        { entityType: 'asc' },
        { entityId: 'asc' },
        { createdAt: 'asc' }, // Oldest first - we'll keep the first one
      ],
    })

    console.log(`📊 Total notes in database: ${allNotes.length}\n`)

    // Group notes by entity and find duplicates
    const noteGroups = new Map<string, NoteGroup>()
    let duplicatesFound = 0
    let notesToDelete: string[] = []

    for (const note of allNotes) {
      // Create a key for grouping: entityType + entityId + normalized content + author + date (rounded to nearest second)
      const normalizedContent = note.content.trim().toLowerCase()
      const dateKey = new Date(note.createdAt).setMilliseconds(0) // Round to nearest second
      const groupKey = `${note.entityType}:${note.entityId}:${normalizedContent}:${note.author}:${dateKey}`

      if (!noteGroups.has(groupKey)) {
        noteGroups.set(groupKey, {
          content: note.content,
          author: note.author,
          createdAt: note.createdAt,
          entityType: note.entityType,
          entityId: note.entityId,
          notes: [note],
        })
      } else {
        const group = noteGroups.get(groupKey)!
        group.notes.push(note)
        
        // If we have more than one note in this group, mark duplicates for deletion
        // Keep the first one (oldest), delete the rest
        if (group.notes.length > 1) {
          // Sort by createdAt to ensure we keep the oldest
          group.notes.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          
          // Mark all except the first one for deletion
          for (let i = 1; i < group.notes.length; i++) {
            notesToDelete.push(group.notes[i].id)
            duplicatesFound++
          }
        }
      }
    }

    console.log(`🔍 Analysis complete:`)
    console.log(`   - Unique note groups: ${noteGroups.size}`)
    console.log(`   - Duplicate notes found: ${duplicatesFound}\n`)

    if (duplicatesFound === 0) {
      console.log('✅ No duplicates found. Database is clean!\n')
      return
    }

    // Delete duplicates
    console.log(`🗑️  Deleting ${duplicatesFound} duplicate notes...\n`)

    let deletedCount = 0
    let errorCount = 0

    // Delete in batches to avoid overwhelming the database
    const batchSize = 50
    for (let i = 0; i < notesToDelete.length; i += batchSize) {
      const batch = notesToDelete.slice(i, i + batchSize)
      
      try {
        const result = await prisma.note.deleteMany({
          where: {
            id: { in: batch },
          },
        })
        deletedCount += result.count
        console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${result.count} notes`)
      } catch (error) {
        errorCount++
        console.error(`   ✗ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error)
      }
    }

    console.log(`\n✅ Cleanup completed!`)
    console.log(`   - Duplicates deleted: ${deletedCount}`)
    console.log(`   - Errors: ${errorCount}\n`)

    // Final statistics
    const remainingNotes = await prisma.note.count()
    console.log(`📊 Final Statistics:`)
    console.log(`   - Remaining notes: ${remainingNotes}`)
    console.log(`   - Notes removed: ${duplicatesFound}`)
    console.log(`\n💡 Database is now clean and deduplicated!`)
  } catch (error) {
    console.error('❌ Error removing duplicates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run cleanup
removeDuplicateNotes()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })



