/**
 * Script: List All Removed Leads
 * 
 * This script shows all leads that were converted to contacts and removed from the leads table
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listRemovedLeads() {
  console.log('🔍 Finding all leads that were converted and removed...\n')
  console.log('='.repeat(70) + '\n')

  try {
    // Find all contacts that were converted from leads
    const convertedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { tag: 'converted' },
          { leadId: { not: null } }
        ]
      },
      select: {
        id: true,
        nom: true,
        telephone: true,
        email: true,
        ville: true,
        tag: true,
        leadId: true,
        architecteAssigne: true,
        leadStatus: true,
        createdAt: true,
        convertedBy: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Found ${convertedContacts.length} converted contacts\n`)

    if (convertedContacts.length === 0) {
      console.log('⚠️  No converted contacts found.\n')
      return
    }

    // Get all lead IDs that were converted
    const convertedLeadIds = convertedContacts
      .map(c => c.leadId)
      .filter((id): id is string => id !== null)

    console.log(`📋 Checking if these leads still exist in leads table...\n`)

    // Check which leads still exist (they shouldn't)
    const existingLeads = await prisma.lead.findMany({
      where: {
        id: { in: convertedLeadIds }
      },
      select: {
        id: true,
        nom: true,
        telephone: true,
        ville: true,
        typeBien: true,
        source: true,
        statut: true,
        assignePar: true,
        convertedToContactId: true,
        createdAt: true,
      }
    })

    console.log(`\n📋 LIST OF ALL REMOVED LEADS (Converted to Contacts):\n`)
    console.log('='.repeat(70) + '\n')

    let index = 1
    convertedContacts.forEach((contact) => {
      const existingLead = existingLeads.find(l => l.id === contact.leadId)
      const status = existingLead ? '⚠️  STILL EXISTS (should be deleted)' : '✅ REMOVED'

      console.log(`${index}. ${status}`)
      console.log(`   Lead Name: "${contact.nom}"`)
      console.log(`   Lead ID: ${contact.leadId || 'N/A'}`)
      console.log(`   Phone: ${contact.telephone}`)
      console.log(`   Email: ${contact.email || 'N/A'}`)
      console.log(`   City: ${contact.ville || 'N/A'}`)
      console.log(`   Lead Status: ${contact.leadStatus || 'N/A'}`)
      console.log(`   Architect Assigned: ${contact.architecteAssigne || 'Non assigné'}`)
      console.log(`   Converted Date: ${contact.createdAt.toISOString()}`)
      console.log(`   Contact ID: ${contact.id}`)
      console.log(`   Contact Tag: ${contact.tag}`)
      
      if (existingLead) {
        console.log(`   ⚠️  Lead still exists with:`)
        console.log(`      - Type Bien: ${existingLead.typeBien}`)
        console.log(`      - Source: ${existingLead.source}`)
        console.log(`      - Statut: ${existingLead.statut}`)
        console.log(`      - Assigned To: ${existingLead.assignePar}`)
        console.log(`      - convertedToContactId: ${existingLead.convertedToContactId || 'null'}`)
      }
      
      console.log('')
      index++
    })

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 SUMMARY:\n')
    console.log(`   Total converted contacts: ${convertedContacts.length}`)
    console.log(`   Leads properly removed: ${convertedContacts.length - existingLeads.length}`)
    console.log(`   Leads still in table (should be deleted): ${existingLeads.length}`)
    
    if (existingLeads.length > 0) {
      console.log(`\n⚠️  WARNING: ${existingLeads.length} leads still exist and should be removed!`)
      console.log(`   Run: npm run cleanup:converted-leads\n`)
    } else {
      console.log(`\n✅ All converted leads have been properly removed from leads table!\n`)
    }

    // Export to CSV format
    console.log('\n📄 CSV Format (for export):\n')
    console.log('Lead Name,Phone,City,Lead Status,Architect,Contact ID,Converted Date,Status')
    convertedContacts.forEach((contact) => {
      const existingLead = existingLeads.find(l => l.id === contact.leadId)
      const status = existingLead ? 'STILL EXISTS' : 'REMOVED'
      const date = contact.createdAt.toISOString().split('T')[0]
      console.log(
        `"${contact.nom}","${contact.telephone}","${contact.ville || ''}","${contact.leadStatus || ''}","${contact.architecteAssigne || ''}","${contact.id}","${date}","${status}"`
      )
    })

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

listRemovedLeads()
  .then(() => {
    console.log('\n✅ Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })


