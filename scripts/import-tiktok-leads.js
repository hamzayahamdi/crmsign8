/**
 * Import TikTok Leads from CSV
 * 
 * This script imports TikTok leads from the Tiktok-Leads.csv file
 * and automatically assigns the current month to each lead.
 * 
 * Usage: node scripts/import-tiktok-leads.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

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

// Clean phone number
function cleanPhoneNumber(phone) {
  if (!phone) return ''
  // Remove spaces, dashes, and other non-numeric characters except +
  return phone.trim().replace(/[\s\-]/g, '')
}

// Parse CSV line (simple parser)
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  
  return values
}

// Normalize type de bien
function normalizeTypeBien(typeBien) {
  if (!typeBien) return 'Appartement'
  
  const normalized = typeBien.toLowerCase().trim()
  
  if (normalized.includes('villa')) return 'Villa'
  if (normalized.includes('appartement')) return 'Appartement'
  if (normalized.includes('studio')) return 'Studio'
  if (normalized.includes('magasin') || normalized.includes('commerce')) return 'Magasin'
  if (normalized.includes('bureau')) return 'Bureau'
  if (normalized.includes('riad')) return 'Riad'
  
  return 'Appartement' // Default
}

// Normalize ville
function normalizeVille(ville) {
  if (!ville) return 'Non spécifié'
  
  const normalized = ville.trim()
  
  // Common city name mappings
  const cityMap = {
    'casa': 'Casablanca',
    'casablanca': 'Casablanca',
    'الدار البيضاء': 'Casablanca',
    'البيضاء': 'Casablanca',
    'rabat': 'Rabat',
    'الرباط': 'Rabat',
    'marrakech': 'Marrakech',
    'مراكش': 'Marrakech',
    'fes': 'Fès',
    'fès': 'Fès',
    'فاس': 'Fès',
    'tanger': 'Tanger',
    'tangier': 'Tanger',
    'طنجة': 'Tanger',
    'agadir': 'Agadir',
    'أغادير': 'Agadir',
    'اكادير': 'Agadir',
    'kenitra': 'Kénitra',
    'القنيطرة': 'Kénitra',
    'sale': 'Salé',
    'salé': 'Salé',
    'سلا': 'Salé',
    'temara': 'Témara',
    'تمارة': 'Témara',
    'meknes': 'Meknès',
    'meknès': 'Meknès',
    'مكناس': 'Meknès',
    'oujda': 'Oujda',
    'وجدة': 'Oujda',
  }
  
  const lowerNormalized = normalized.toLowerCase()
  if (cityMap[lowerNormalized]) {
    return cityMap[lowerNormalized]
  }
  
  // Capitalize first letter
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

// Parse status from CSV
function parseStatus(statut) {
  if (!statut) return { statut: 'nouveau', statutDetaille: 'Nouveau lead TikTok' }
  
  const normalized = statut.toLowerCase().trim()
  
  if (normalized.includes('rdv') || normalized.includes('rendez-vous')) {
    return { statut: 'a_recontacter', statutDetaille: statut }
  }
  if (normalized.includes('recontacter') || normalized.includes('rappeler')) {
    return { statut: 'a_recontacter', statutDetaille: statut }
  }
  if (normalized.includes('pas de reponse') || normalized.includes('sans reponse') || normalized.includes('message envoyé')) {
    return { statut: 'sans_reponse', statutDetaille: statut }
  }
  if (normalized.includes('acquisition') || normalized.includes('en cours')) {
    return { statut: 'a_recontacter', statutDetaille: statut }
  }
  
  return { statut: 'nouveau', statutDetaille: statut || 'Nouveau lead TikTok' }
}

async function importTikTokLeads() {
  console.log('🚀 Starting TikTok leads import...\n')
  
  const csvPath = path.join(__dirname, '..', 'Tiktok-Leads.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: Tiktok-Leads.csv not found!')
    console.error(`   Expected path: ${csvPath}`)
    process.exit(1)
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  console.log(`📄 Found ${lines.length} lines in CSV\n`)
  
  const currentMonth = getCurrentMonth()
  const uploadedAt = new Date()
  
  console.log(`📅 Import month: ${currentMonth}`)
  console.log(`⏰ Upload time: ${uploadedAt.toISOString()}\n`)
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  // Skip header lines (first 2 lines)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    const values = parseCSVLine(line)
    
    // CSV format: Nom, Telephone, Ville, Type de Bien, Statut, Commercial
    const [nom, telephone, ville, typeBien, statut, commercial] = values
    
    // Skip if no name or phone
    if (!nom || !telephone) {
      skipped++
      continue
    }
    
    const cleanedPhone = cleanPhoneNumber(telephone)
    
    // Skip if phone is invalid
    if (cleanedPhone.length < 8) {
      console.log(`⚠️  Skipping ${nom} - Invalid phone: ${telephone}`)
      skipped++
      continue
    }
    
    try {
      // Check if lead already exists (by phone number)
      const existing = await prisma.lead.findFirst({
        where: { telephone: cleanedPhone }
      })
      
      if (existing) {
        console.log(`⏭️  Skipping ${nom} - Already exists (${cleanedPhone})`)
        skipped++
        continue
      }
      
      const { statut: leadStatus, statutDetaille } = parseStatus(statut)
      
      // Create the lead
      await prisma.lead.create({
        data: {
          nom: nom.trim(),
          telephone: cleanedPhone,
          ville: normalizeVille(ville),
          typeBien: normalizeTypeBien(typeBien),
          statut: leadStatus,
          statutDetaille: statutDetaille,
          message: statut || null,
          assignePar: commercial?.trim() || 'TAZI',
          source: 'tiktok',
          priorite: 'moyenne',
          month: currentMonth,
          campaignName: 'TikTok Leads Import',
          uploadedAt: uploadedAt,
          createdBy: 'System Import',
          derniereMaj: new Date()
        }
      })
      
      imported++
      
      if (imported % 50 === 0) {
        console.log(`✅ Imported ${imported} leads...`)
      }
    } catch (error) {
      console.error(`❌ Error importing ${nom}:`, error.message)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary:')
  console.log('='.repeat(50))
  console.log(`✅ Successfully imported: ${imported} leads`)
  console.log(`⏭️  Skipped (duplicates/invalid): ${skipped} leads`)
  console.log(`❌ Errors: ${errors} leads`)
  console.log(`📅 Month: ${currentMonth}`)
  console.log('='.repeat(50))
  
  await prisma.$disconnect()
}

// Run the import
importTikTokLeads()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
