/**
 * Update Existing TikTok Leads
 * 
 * This script updates existing TikTok leads in the database
 * to add month and campaign information.
 * 
 * Usage: node scripts/update-existing-tiktok-leads.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// French month names
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

// Get current month in French
function getCurrentMonth() {
  const now = new Date()
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`
}

async function updateExistingTikTokLeads() {
  console.log('🔄 Updating existing TikTok leads...\n')
  
  try {
    // Find all TikTok leads without month information
    const tiktokLeads = await prisma.lead.findMany({
      where: {
        source: 'tiktok',
        OR: [
          { month: null },
          { month: '' }
        ]
      }
    })
    
    console.log(`📊 Found ${tiktokLeads.length} TikTok leads to update\n`)
    
    if (tiktokLeads.length === 0) {
      console.log('✅ All TikTok leads already have month information!')
      return
    }
    
    const currentMonth = getCurrentMonth()
    const uploadedAt = new Date()
    
    console.log(`📅 Assigning month: ${currentMonth}`)
    console.log(`⏰ Upload time: ${uploadedAt.toISOString()}\n`)
    
    let updated = 0
    
    for (const lead of tiktokLeads) {
      try {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            month: currentMonth,
            campaignName: lead.campaignName || 'TikTok Leads Import',
            uploadedAt: lead.uploadedAt || uploadedAt
          }
        })
        
        updated++
        
        if (updated % 50 === 0) {
          console.log(`✅ Updated ${updated} leads...`)
        }
      } catch (error) {
        console.error(`❌ Error updating lead ${lead.id}:`, error.message)
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Update Summary:')
    console.log('='.repeat(50))
    console.log(`✅ Successfully updated: ${updated} leads`)
    console.log(`📅 Month assigned: ${currentMonth}`)
    console.log(`📝 Default campaign: TikTok Leads Import`)
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateExistingTikTokLeads()
  .then(() => {
    console.log('\n✅ Update complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
