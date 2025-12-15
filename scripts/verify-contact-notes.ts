/**
 * Quick script to verify notes for a specific contact
 * Usage: npx tsx scripts/verify-contact-notes.ts "Sanaa Boukouty"
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyContactNotes(contactName?: string) {
  try {
    const contacts = contactName
      ? await prisma.contact.findMany({
          where: {
            nom: { contains: contactName, mode: 'insensitive' },
          },
        })
      : await prisma.contact.findMany({
          where: {
            leadId: { not: null },
          },
          take: 10,
        })

    console.log(`Found ${contacts.length} contact(s)\n`)

    for (const contact of contacts) {
      const notes = await prisma.note.findMany({
        where: {
          entityType: 'contact',
          entityId: contact.id,
        },
        orderBy: { createdAt: 'desc' },
      })

      console.log(`Contact: ${contact.nom}`)
      console.log(`  ID: ${contact.id}`)
      console.log(`  Lead ID: ${contact.leadId || 'N/A'}`)
      console.log(`  Notes count: ${notes.length}`)
      
      if (notes.length > 0) {
        console.log(`  Notes:`)
        notes.forEach((note, i) => {
          console.log(`    ${i + 1}. [${note.sourceType || 'contact'}] ${note.content.substring(0, 50)}...`)
          console.log(`       Author: ${note.author}, Date: ${note.createdAt.toISOString()}`)
        })
      } else {
        console.log(`  ⚠️  No notes found in unified table`)
      }
      console.log('')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

const contactName = process.argv[2]
verifyContactNotes(contactName)





