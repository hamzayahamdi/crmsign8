/**
 * Script to remove all opportunities for specific contacts
 * Removes opportunities for: Omar Bouizargan and Karim Rahmoune
 * This will delete opportunities regardless of status (including "perdu"/"lost")
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Contacts to process
const CONTACT_NAMES = ['Omar Bouizargan', 'Karim Rahmoune']

async function removeOpportunitiesForContacts() {
  console.log('🔧 Starting removal of opportunities for contacts...\n')
  console.log(`📋 Target contacts: ${CONTACT_NAMES.join(', ')}\n`)

  try {
    // Find contacts by name (using contains for partial matching)
    // First try exact match, then try partial match
    const exactMatchContacts = await prisma.contact.findMany({
      where: {
        nom: {
          in: CONTACT_NAMES,
        },
      },
      include: {
        opportunities: true,
      },
    })

    // Also search for partial matches (in case of name variations)
    const partialMatchConditions = CONTACT_NAMES.map(name => ({
      nom: {
        contains: name.split(' ')[0], // First name
        mode: 'insensitive' as const,
      },
    }))

    const partialMatchContacts = await prisma.contact.findMany({
      where: {
        OR: partialMatchConditions,
        NOT: {
          id: {
            in: exactMatchContacts.map(c => c.id),
          },
        },
      },
      include: {
        opportunities: true,
      },
    })

    // Combine results
    const contacts = [...exactMatchContacts, ...partialMatchContacts]

    if (contacts.length === 0) {
      console.log('❌ No contacts found with the specified names')
      console.log(`   Searched for: ${CONTACT_NAMES.join(', ')}`)
      return
    }

    console.log(`✅ Found ${contacts.length} contact(s):`)
    contacts.forEach((contact) => {
      console.log(`   - ${contact.nom} (ID: ${contact.id})`)
      console.log(`     Opportunities: ${contact.opportunities.length}`)
    })
    console.log()

    let totalDeleted = 0
    let totalSupabaseDeleted = 0
    let totalPrismaClientDeleted = 0
    let errors: string[] = []

    // Process each contact
    for (const contact of contacts) {
      console.log(`\n📦 Processing contact: ${contact.nom} (${contact.id})`)
      console.log(`   Found ${contact.opportunities.length} opportunity/ies`)

      if (contact.opportunities.length === 0) {
        console.log('   ⏭️  No opportunities to delete')
        continue
      }

      // Process each opportunity
      for (const opportunity of contact.opportunities) {
        console.log(`\n   🎯 Processing opportunity: "${opportunity.titre}" (${opportunity.id})`)
        console.log(`      Status: ${opportunity.statut}, Pipeline Stage: ${opportunity.pipelineStage}`)

        try {
          // 1. Delete Supabase client record (if exists)
          // Composite ID format: contactId-opportunityId
          const compositeId = `${contact.id}-${opportunity.id}`
          
          if (supabaseUrl && supabaseServiceKey) {
            try {
              const supabase = createClient(supabaseUrl, supabaseServiceKey)
              
              // Delete from Supabase clients table
              const { error: supabaseError } = await supabase
                .from('clients')
                .delete()
                .eq('id', compositeId)

              if (supabaseError) {
                // It's okay if the record doesn't exist
                if (supabaseError.code !== 'PGRST116') {
                  console.log(`      ⚠️  Supabase client not found or already deleted: ${compositeId}`)
                }
              } else {
                console.log(`      ✅ Deleted Supabase client record: ${compositeId}`)
                totalSupabaseDeleted++

                // Also try to delete related historique entries
                try {
                  await supabase
                    .from('historique')
                    .delete()
                    .eq('client_id', compositeId)
                  console.log(`      ✅ Deleted Supabase historique entries for: ${compositeId}`)
                } catch (histErr) {
                  // Ignore errors for historique
                }

                // Also try to delete related stage history entries
                try {
                  await supabase
                    .from('client_stage_history')
                    .delete()
                    .eq('client_id', compositeId)
                  console.log(`      ✅ Deleted Supabase stage history entries for: ${compositeId}`)
                } catch (stageErr) {
                  // Ignore errors for stage history
                }
              }
            } catch (supabaseErr) {
              console.log(`      ⚠️  Error with Supabase operations: ${supabaseErr}`)
            }
          }

          // 2. Delete Prisma client record (if exists - legacy)
          try {
            const legacyClient = await prisma.client.findUnique({
              where: { id: compositeId },
            })

            if (legacyClient) {
              await prisma.client.delete({
                where: { id: compositeId },
              })
              console.log(`      ✅ Deleted Prisma client record: ${compositeId}`)
              totalPrismaClientDeleted++
            }
          } catch (clientErr: any) {
            // It's okay if the record doesn't exist
            if (clientErr.code !== 'P2025') {
              console.log(`      ⚠️  Prisma client not found or already deleted: ${compositeId}`)
            }
          }

          // 3. Delete the opportunity
          // Prisma cascade will handle related records (tasks, documents, timeline, appointments)
          await prisma.opportunity.delete({
            where: { id: opportunity.id },
          })

          console.log(`      ✅ Deleted opportunity: ${opportunity.id}`)
          totalDeleted++

          // 4. Log deletion to timeline (optional - might fail if opportunity is already deleted)
          try {
            // Find a user to use as author (or use a default)
            const adminUser = await prisma.user.findFirst({
              where: { role: 'admin' },
              select: { id: true },
            })

            if (adminUser) {
              await prisma.timeline.create({
                data: {
                  contactId: contact.id,
                  eventType: 'other',
                  title: 'Opportunité supprimée',
                  description: `L'opportunité "${opportunity.titre}" a été supprimée par script`,
                  author: adminUser.id,
                },
              })
              console.log(`      ✅ Created timeline entry for deletion`)
            }
          } catch (timelineErr) {
            // Ignore timeline errors
            console.log(`      ⚠️  Could not create timeline entry (this is okay)`)
          }

        } catch (error: any) {
          const errorMsg = `Error deleting opportunity ${opportunity.id}: ${error.message}`
          console.error(`      ❌ ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📈 SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Opportunities deleted: ${totalDeleted}`)
    console.log(`✅ Supabase client records deleted: ${totalSupabaseDeleted}`)
    console.log(`✅ Prisma client records deleted: ${totalPrismaClientDeleted}`)
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${errors.length}`)
      errors.forEach((err) => console.log(`   - ${err}`))
    } else {
      console.log('\n✨ All operations completed successfully!')
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
removeOpportunitiesForContacts()
  .then(() => {
    console.log('\n🎉 Script finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

