const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Map CSV status to Prisma enum
function mapStatus(statut) {
  if (!statut) return 'nouveau'
  const s = statut.toLowerCase()
  if (s.includes('rdv') || s.includes('en cours') || s.includes('acquisition')) return 'en_cours'
  if (s.includes('recontacter') || s.includes('rappeler') || s.includes('voyage') || s.includes('deplacement')) return 'a_recontacter'
  if (s.includes('signe') || s.includes('signé')) return 'signe'
  if (s.includes('pas de reponse') || s.includes('pas de retour')) return 'perdu'
  return 'nouveau'
}

// Map to priority based on status and property type
function mapPriority(statut, typeBien) {
  const s = (statut || '').toLowerCase()
  const t = (typeBien || '').toLowerCase()
  
  // High priority: RDV scheduled, in progress, villa
  if (s.includes('rdv') || s.includes('en cours') || s.includes('acquisition') || t.includes('villa')) {
    return 'haute'
  }
  // Low priority: no response, lost
  if (s.includes('pas de reponse') || s.includes('pas de retour') || s.includes('message envoyé')) {
    return 'basse'
  }
  return 'moyenne'
}

// Clean and normalize data
function cleanPhone(phone) {
  if (!phone) return 'N/A'
  return phone.replace(/\s+/g, ' ').trim()
}

function cleanVille(ville) {
  if (!ville || ville.length < 2) return 'Non spécifié'
  return ville.trim()
}

function cleanNom(nom) {
  if (!nom || nom.length < 2) return 'Lead'
  return nom.trim()
}

async function main() {
  console.log('🗑️  Clearing existing data...')
  
  // Delete all existing leads
  const deleted = await prisma.lead.deleteMany({})
  console.log(`   Deleted ${deleted.count} existing leads`)
  
  console.log('\n📂 Reading TikTok leads from CSV...')
  
  const csvPath = path.join(__dirname, '..', 'Tiktok-Leads.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').slice(2) // Skip header rows
  
  const leads = []
  let skipped = 0
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    const parts = line.split(',')
    if (parts.length < 6) {
      skipped++
      continue
    }
    
    const [nom, telephone, ville, typeBien, statut, assignePar] = parts
    
    // Skip if missing critical data
    if (!telephone || telephone.length < 8) {
      skipped++
      continue
    }
    
    const lead = {
      nom: cleanNom(nom),
      telephone: cleanPhone(telephone),
      ville: cleanVille(ville),
      typeBien: typeBien?.trim() || 'Appartement',
      statut: mapStatus(statut),
      statutDetaille: statut?.trim() || 'Lead TikTok - À contacter',
      assignePar: assignePar?.trim() || 'TAZI',
      source: 'reseaux_sociaux', // All from TikTok
      priorite: mapPriority(statut, typeBien),
    }
    
    leads.push(lead)
  }
  
  console.log(`   Found ${leads.length} valid leads (skipped ${skipped} invalid entries)`)
  console.log('\n🌱 Seeding database with TikTok leads...')
  
  let created = 0
  let errors = 0
  
  for (const lead of leads) {
    try {
      await prisma.lead.create({ data: lead })
      created++
      if (created % 50 === 0) {
        console.log(`   Progress: ${created}/${leads.length} leads created...`)
      }
    } catch (error) {
      errors++
      console.error(`   Error creating lead ${lead.nom}:`, error.message)
    }
  }
  
  console.log('\n✅ Database seeded successfully!')
  console.log(`📊 Statistics:`)
  console.log(`   - Total created: ${created} leads`)
  console.log(`   - Errors: ${errors}`)
  console.log(`   - Source: TikTok (reseaux_sociaux)`)
  
  // Show breakdown by status
  const stats = await prisma.lead.groupBy({
    by: ['statut'],
    _count: true
  })
  console.log('\n📈 Breakdown by status:')
  stats.forEach(s => {
    console.log(`   - ${s.statut}: ${s._count} leads`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
