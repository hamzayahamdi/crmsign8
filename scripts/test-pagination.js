/**
 * Test script to verify pagination loads all leads from database
 * Run with: node scripts/test-pagination.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPagination() {
  try {
    console.log('🔍 Testing pagination...\n')
    
    // Get total count from database
    const totalCount = await prisma.lead.count()
    console.log(`📊 Total leads in database: ${totalCount}`)
    
    // Simulate pagination with cursor
    const pageSize = 100
    let cursor = null
    let cursorId = null
    let allLeads = []
    let page = 1
    let loadedIds = new Set()
    
    while (true) {
      console.log(`\n📄 Fetching page ${page}...`)
      
      // Build where clause for cursor pagination
      const whereClause = {}
      if (cursor && cursorId) {
        whereClause.OR = [
          {
            createdAt: {
              lt: new Date(cursor)
            }
          },
          {
            AND: [
              {
                createdAt: new Date(cursor)
              },
              {
                id: {
                  lt: cursorId
                }
              }
            ]
          }
        ]
      }
      
      // Fetch page
      const leads = await prisma.lead.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        take: pageSize,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        select: {
          id: true,
          nom: true,
          createdAt: true
        }
      })
      
      console.log(`   ✓ Received ${leads.length} leads`)
      
      // Check for duplicates
      let duplicates = 0
      leads.forEach(lead => {
        if (loadedIds.has(lead.id)) {
          duplicates++
        } else {
          loadedIds.add(lead.id)
          allLeads.push(lead)
        }
      })
      
      if (duplicates > 0) {
        console.log(`   ⚠️  Found ${duplicates} duplicates (filtered out)`)
      }
      
      console.log(`   📊 Total unique leads loaded: ${loadedIds.size}/${totalCount}`)
      
      // Update cursor for next page
      if (leads.length > 0) {
        const lastLead = leads[leads.length - 1]
        cursor = lastLead.createdAt.toISOString()
        cursorId = lastLead.id
      }
      
      // Check if we should continue
      if (leads.length < pageSize || loadedIds.size >= totalCount) {
        break
      }
      
      page++
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 PAGINATION TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Total in database:     ${totalCount}`)
    console.log(`Total loaded:          ${loadedIds.size}`)
    console.log(`Pages fetched:         ${page}`)
    console.log(`Missing leads:         ${totalCount - loadedIds.size}`)
    console.log(`Status:                ${loadedIds.size === totalCount ? '✅ SUCCESS' : '❌ FAILED'}`)
    console.log('='.repeat(60))
    
    if (loadedIds.size !== totalCount) {
      console.log('\n❌ PAGINATION FAILED: Not all leads were loaded!')
      process.exit(1)
    } else {
      console.log('\n✅ PAGINATION SUCCESS: All leads loaded correctly!')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Error testing pagination:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testPagination()
