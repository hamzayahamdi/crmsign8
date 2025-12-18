/**
 * Script to fix commercial names for existing clients and opportunities
 * This script updates commercial_attribue from leadData.commercialMagasin
 * for clients that were converted from magasin leads
 */

const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCommercialNames() {
  console.log('🚀 Starting commercial name fix script...\n')

  try {
    // Fetch all clients from Supabase
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, nom, commercial_attribue, lead_data, magasin, lead_id')

    if (fetchError) {
      throw new Error(`Failed to fetch clients: ${fetchError.message}`)
    }

    if (!clients || clients.length === 0) {
      console.log('ℹ️  No clients found')
      return
    }

    console.log(`📊 Found ${clients.length} clients to check\n`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const client of clients) {
      try {
        // Skip if no lead_data
        if (!client.lead_data) {
          skippedCount++
          continue
        }

        // Parse lead_data
        let leadData = null
        try {
          leadData = typeof client.lead_data === 'string' 
            ? JSON.parse(client.lead_data) 
            : client.lead_data
        } catch (parseError) {
          console.log(`⚠️  Failed to parse lead_data for client ${client.id}: ${client.nom}`)
          skippedCount++
          continue
        }

        // Check if this is a magasin lead
        const isMagasinLead = client.magasin || (leadData && leadData.source === 'magasin')
        
        // Get commercialMagasin from leadData
        const commercialMagasin = leadData?.commercialMagasin

        // Only update if:
        // 1. It's a magasin lead AND has commercialMagasin
        // 2. The current commercial_attribue is different from commercialMagasin
        if (isMagasinLead && commercialMagasin && commercialMagasin.trim()) {
          const newCommercialName = commercialMagasin.trim()
          const currentCommercial = client.commercial_attribue || ''

          if (newCommercialName !== currentCommercial) {
            // Update the client
            const { error: updateError } = await supabase
              .from('clients')
              .update({ commercial_attribue: newCommercialName })
              .eq('id', client.id)

            if (updateError) {
              console.error(`❌ Failed to update client ${client.id} (${client.nom}):`, updateError.message)
              errorCount++
            } else {
              console.log(`✅ Updated client ${client.id} (${client.nom}): "${currentCommercial}" → "${newCommercialName}"`)
              updatedCount++
            }
          } else {
            skippedCount++
          }
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error(`❌ Error processing client ${client.id} (${client.nom}):`, error.message)
        errorCount++
      }
    }

    // Also check opportunities (contacts table)
    console.log('\n📊 Checking opportunities (contacts)...\n')

    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, nom, commercialMagasin, commercial_magasin, source, magasin, leadId')

    if (!contactsError && contacts) {
      let contactsUpdated = 0
      let contactsSkipped = 0

      for (const contact of contacts) {
        try {
          // Check if it's a magasin lead
          const isMagasinContact = contact.magasin || contact.source === 'magasin'
          const commercialMagasin = contact.commercialMagasin || contact.commercial_magasin

          if (isMagasinContact && commercialMagasin && commercialMagasin.trim()) {
            // Update commercial_attribue if it exists and is different
            // Note: contacts might not have commercial_attribue field, so we'll update commercialMagasin if needed
            const currentCommercial = contact.commercialMagasin || contact.commercial_magasin || ''
            const newCommercialName = commercialMagasin.trim()

            if (newCommercialName !== currentCommercial) {
              const updateData = {}
              if (contact.commercialMagasin !== newCommercialName) {
                updateData.commercialMagasin = newCommercialName
              }
              if (contact.commercial_magasin !== newCommercialName) {
                updateData.commercial_magasin = newCommercialName
              }

              if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                  .from('contacts')
                  .update(updateData)
                  .eq('id', contact.id)

                if (updateError) {
                  console.error(`❌ Failed to update contact ${contact.id} (${contact.nom}):`, updateError.message)
                } else {
                  console.log(`✅ Updated contact ${contact.id} (${contact.nom}): commercialMagasin → "${newCommercialName}"`)
                  contactsUpdated++
                }
              } else {
                contactsSkipped++
              }
            } else {
              contactsSkipped++
            }
          } else {
            contactsSkipped++
          }
        } catch (error) {
          console.error(`❌ Error processing contact ${contact.id} (${contact.nom}):`, error.message)
        }
      }

      console.log(`\n📊 Contacts: ${contactsUpdated} updated, ${contactsSkipped} skipped`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log(`   ✅ Clients updated: ${updatedCount}`)
    console.log(`   ⏭️  Clients skipped: ${skippedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log('='.repeat(50))
    console.log('\n✨ Script completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixCommercialNames()
  .then(() => {
    console.log('\n✅ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

