const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyLeadsCount() {
  try {
    console.log('🔍 Verifying leads count in database...\n')
    
    // Get total count
    const totalCount = await prisma.lead.count()
    console.log(`✅ Total leads in database: ${totalCount}`)
    
    // Get count by status
    const statuses = ['nouveau', 'a_recontacter', 'en_cours', 'signe', 'perdu']
    console.log('\n📊 Breakdown by status:')
    for (const status of statuses) {
      const count = await prisma.lead.count({
        where: { statut: status }
      })
      console.log(`   ${status}: ${count}`)
    }
    
    // Check for duplicates
    const allLeads = await prisma.lead.findMany({
      select: { id: true }
    })
    const uniqueIds = new Set(allLeads.map(l => l.id))
    console.log(`\n🔑 Unique IDs: ${uniqueIds.size}`)
    if (uniqueIds.size !== allLeads.length) {
      console.log(`⚠️  WARNING: Found ${allLeads.length - uniqueIds.size} duplicate IDs!`)
    }
    
    // Get first 5 and last 5 leads by createdAt
    const firstFive = await prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, nom: true, createdAt: true }
    })
    
    const lastFive = await prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
      select: { id: true, nom: true, createdAt: true }
    })
    
    console.log('\n📅 Newest 5 leads (should appear first in table):')
    firstFive.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.nom} - ${lead.createdAt}`)
    })
    
    console.log('\n📅 Oldest 5 leads:')
    lastFive.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.nom} - ${lead.createdAt}`)
    })
    
    // Test pagination
    console.log('\n🔄 Testing pagination (100 items per page):')
    const pageSize = 100
    let page = 1
    let loadedCount = 0
    const loadedIds = new Set()
    
    while (true) {
      const skip = (page - 1) * pageSize
      const leads = await prisma.lead.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      })
      
      if (leads.length === 0) break
      
      leads.forEach(l => loadedIds.add(l.id))
      loadedCount += leads.length
      
      console.log(`   Page ${page}: Fetched ${leads.length} leads, Total loaded: ${loadedCount}, Unique: ${loadedIds.size}`)
      
      if (leads.length < pageSize) break
      page++
      
      // Safety limit
      if (page > 20) {
        console.log('   ⚠️  Stopped at page 20 for safety')
        break
      }
    }
    
    console.log(`\n✅ Pagination test complete: Loaded ${loadedIds.size} unique leads out of ${totalCount} total`)
    
    if (loadedIds.size !== totalCount) {
      console.log(`❌ ERROR: Pagination missed ${totalCount - loadedIds.size} leads!`)
    } else {
      console.log('✅ All leads can be loaded via pagination')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyLeadsCount()
