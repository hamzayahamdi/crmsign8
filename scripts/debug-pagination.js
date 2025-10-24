const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugPagination() {
  try {
    console.log('🔍 Debugging Pagination Issue\n')
    
    // Get total count
    const totalCount = await prisma.lead.count()
    console.log(`📊 Total leads in database: ${totalCount}`)
    
    // Simulate the exact pagination the app uses
    const pageSize = 100
    let page = 1
    let allLoadedIds = new Set()
    let allLeads = []
    
    console.log(`\n🔄 Simulating pagination with page size: ${pageSize}\n`)
    
    while (true) {
      const skip = (page - 1) * pageSize
      
      const leads = await prisma.lead.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          nom: true,
          createdAt: true
        }
      })
      
      console.log(`Page ${page}: Skip=${skip}, Take=${pageSize}, Returned=${leads.length} leads`)
      
      if (leads.length === 0) {
        console.log('   ⚠️  No more leads returned, stopping.')
        break
      }
      
      // Track unique IDs
      let duplicates = 0
      leads.forEach(lead => {
        if (allLoadedIds.has(lead.id)) {
          duplicates++
        } else {
          allLoadedIds.add(lead.id)
          allLeads.push(lead)
        }
      })
      
      if (duplicates > 0) {
        console.log(`   ⚠️  Found ${duplicates} duplicate IDs on this page!`)
      }
      
      console.log(`   Total unique loaded so far: ${allLoadedIds.size}/${totalCount}`)
      
      // Check if we should continue
      const actualLoadedCount = allLoadedIds.size
      const hasMorePages = totalCount > 0 && actualLoadedCount < totalCount
      
      console.log(`   HasMore calculation: ${actualLoadedCount} < ${totalCount} = ${hasMorePages}`)
      
      if (!hasMorePages) {
        console.log('   ✅ HasMore is false, stopping pagination.')
        break
      }
      
      if (leads.length < pageSize) {
        console.log(`   ⚠️  Received fewer leads than page size (${leads.length} < ${pageSize}), stopping.`)
        break
      }
      
      page++
      
      // Safety limit
      if (page > 15) {
        console.log('   ⚠️  Safety limit reached (page 15), stopping.')
        break
      }
    }
    
    console.log(`\n📈 Final Results:`)
    console.log(`   - Total in database: ${totalCount}`)
    console.log(`   - Total loaded: ${allLoadedIds.size}`)
    console.log(`   - Missing: ${totalCount - allLoadedIds.size}`)
    console.log(`   - Pages fetched: ${page}`)
    
    if (allLoadedIds.size !== totalCount) {
      console.log(`\n❌ PROBLEM FOUND: Missing ${totalCount - allLoadedIds.size} leads!`)
      console.log(`\nDiagnosing the issue...`)
      
      // Find which IDs are missing
      const allDbLeads = await prisma.lead.findMany({
        select: { id: true, nom: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      })
      
      const missingLeads = allDbLeads.filter(lead => !allLoadedIds.has(lead.id))
      
      if (missingLeads.length > 0) {
        console.log(`\n🔍 Sample of missing leads (first 10):`)
        missingLeads.slice(0, 10).forEach((lead, i) => {
          console.log(`   ${i + 1}. ${lead.nom} (ID: ${lead.id}, Created: ${lead.createdAt})`)
        })
        
        // Check if missing leads are at the end
        const lastLoadedIndex = allDbLeads.findIndex(l => l.id === allLeads[allLeads.length - 1]?.id)
        console.log(`\n📍 Last loaded lead is at index ${lastLoadedIndex} in the full sorted list`)
        console.log(`   This means pagination stopped after ${lastLoadedIndex + 1} leads`)
        
        // Check the page where it stopped
        const expectedPages = Math.ceil(totalCount / pageSize)
        console.log(`\n📄 Expected pages: ${expectedPages}`)
        console.log(`   Actual pages fetched: ${page}`)
        console.log(`   Should have fetched ${expectedPages - page} more pages`)
      }
    } else {
      console.log(`\n✅ SUCCESS: All leads were loaded correctly!`)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPagination()
