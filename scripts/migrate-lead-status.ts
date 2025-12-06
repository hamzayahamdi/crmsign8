/**
 * Migration Script: Populate leadStatus for existing contacts
 * 
 * This script updates all contacts that were converted from leads
 * to have their leadStatus field populated with the original lead's status.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Starting migration: Populate leadStatus for existing contacts...\n')

    // Find all contacts that have a leadId (were converted from leads)
    const contactsFromLeads = await prisma.contact.findMany({
        where: {
            leadId: { not: null },
            leadStatus: null, // Only update contacts without leadStatus
        },
        select: {
            id: true,
            nom: true,
            leadId: true,
        },
    })

    console.log(`📊 Found ${contactsFromLeads.length} contacts to update\n`)

    let updated = 0
    let skipped = 0

    for (const contact of contactsFromLeads) {
        try {
            // Find the original lead
            const lead = await prisma.lead.findUnique({
                where: { id: contact.leadId! },
                select: { statut: true, nom: true },
            })

            if (lead && lead.statut) {
                // Update the contact with the lead's status
                await prisma.contact.update({
                    where: { id: contact.id },
                    data: { leadStatus: lead.statut },
                })

                console.log(`✅ Updated "${contact.nom}" → leadStatus: ${lead.statut}`)
                updated++
            } else {
                console.log(`⚠️  Skipped "${contact.nom}" - Lead not found or no status`)
                skipped++
            }
        } catch (error) {
            console.error(`❌ Error updating "${contact.nom}":`, error)
            skipped++
        }
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`   - Updated: ${updated} contacts`)
    console.log(`   - Skipped: ${skipped} contacts`)
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
