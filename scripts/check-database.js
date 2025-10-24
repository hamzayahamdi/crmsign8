const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...\n')
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful!\n')
    
    // Count leads
    const leadCount = await prisma.lead.count()
    console.log(`📊 Total leads in database: ${leadCount}`)
    
    if (leadCount === 0) {
      console.log('\n⚠️  WARNING: No leads found in database!')
      console.log('   You may need to import your CSV data.')
      console.log('   Check if you have a CSV import script.')
    } else {
      // Show sample leads
      console.log('\n📋 Sample leads (first 5):')
      const sampleLeads = await prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nom: true,
          telephone: true,
          ville: true,
          statut: true,
          createdAt: true
        }
      })
      
      sampleLeads.forEach((lead, i) => {
        console.log(`   ${i + 1}. ${lead.nom} - ${lead.ville} (${lead.statut})`)
      })
    }
    
    // Count users
    const userCount = await prisma.user.count()
    console.log(`\n👥 Total users in database: ${userCount}`)
    
    if (userCount === 0) {
      console.log('\n⚠️  WARNING: No users found!')
      console.log('   Run: node scripts/create-issam-user.js')
    }
    
    console.log('\n✅ Database check complete!')
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message)
    console.error('\nPossible issues:')
    console.error('1. DATABASE_URL not set in .env.local')
    console.error('2. Database server not running')
    console.error('3. Wrong database credentials')
    console.error('4. Migrations not run (try: npx prisma migrate deploy)')
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
