const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkLead() {
  const leadId = process.argv[2]
  
  if (!leadId) {
    console.log('Usage: node scripts/check-lead.js <lead-id>')
    console.log('Example: node scripts/check-lead.js cmh4r9y7j0000ujgob873fnf1')
    process.exit(1)
  }

  try {
    console.log(`\n🔍 Checking for lead with ID: ${leadId}\n`)
    
    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })
    
    if (lead) {
      console.log('✅ Lead found in database!')
      console.log('---')
      console.log('ID:', lead.id)
      console.log('Name:', lead.nom)
      console.log('Phone:', lead.telephone)
      console.log('City:', lead.ville)
      console.log('Status:', lead.statut)
      console.log('Created At:', lead.createdAt)
      console.log('Updated At:', lead.updatedAt)
      console.log('---\n')
      
      // Check total leads count
      const totalCount = await prisma.lead.count()
      console.log(`📊 Total leads in database: ${totalCount}\n`)
      
      // Get the 5 most recent leads
      console.log('📋 5 Most Recent Leads:')
      const recentLeads = await prisma.lead.findMany({
        take: 5,
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
      
      recentLeads.forEach((l, index) => {
        const isTarget = l.id === leadId ? ' ⭐ THIS IS YOUR LEAD' : ''
        console.log(`  ${index + 1}. ${l.nom} (${l.id}) - ${l.createdAt}${isTarget}`)
      })
      
    } else {
      console.log('❌ Lead NOT found in database!')
      console.log('The lead may have been deleted or the ID is incorrect.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLead()
