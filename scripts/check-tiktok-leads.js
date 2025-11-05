/**
 * Check TikTok Leads Data
 * 
 * This script checks what data is actually stored for TikTok leads
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTikTokLeads() {
  console.log('🔍 Checking TikTok leads data...\n')
  
  try {
    const tiktokLeads = await prisma.lead.findMany({
      where: {
        source: 'tiktok'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`Found ${tiktokLeads.length} TikTok leads\n`)
    
    if (tiktokLeads.length === 0) {
      console.log('❌ No TikTok leads found in database')
      return
    }
    
    tiktokLeads.forEach((lead, index) => {
      console.log(`\n--- Lead ${index + 1} ---`)
      console.log(`ID: ${lead.id}`)
      console.log(`Name: ${lead.nom}`)
      console.log(`Phone: ${lead.telephone}`)
      console.log(`Source: ${lead.source}`)
      console.log(`Month: ${lead.month || 'NOT SET'}`)
      console.log(`Campaign Name: ${lead.campaignName || 'NOT SET'}`)
      console.log(`Uploaded At: ${lead.uploadedAt || 'NOT SET'}`)
      console.log(`Created At: ${lead.createdAt}`)
    })
    
    console.log('\n' + '='.repeat(50))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTikTokLeads()
