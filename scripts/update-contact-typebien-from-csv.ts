/**
 * Script to update contact typeBien from CSV file
 * Matches contacts by name and phone number, then updates typeBien
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Normalize phone number for matching
function normalizePhone(phone: string): string {
  if (!phone) return ''
  // Remove all spaces, dashes, and non-digit characters except +
  let normalized = phone.replace(/[\s\-\(\)]/g, '')
  // Remove leading 0 if present
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1)
  }
  // Ensure it starts with country code if it doesn't
  if (!normalized.startsWith('212') && !normalized.startsWith('+212')) {
    if (normalized.length === 9) {
      normalized = '212' + normalized
    }
  }
  // Remove + if present
  normalized = normalized.replace(/^\+/, '')
  return normalized
}

// Normalize name for matching
function normalizeName(name: string): string {
  if (!name) return ''
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Get last 9 digits for fuzzy matching
function getLast9Digits(phone: string): string {
  const normalized = normalizePhone(phone)
  return normalized.length >= 9 ? normalized.substring(normalized.length - 9) : normalized
}

// Map CSV typeBien values to database values
function mapTypeBien(csvType: string): string | null {
  if (!csvType) return null
  
  const typeMap: Record<string, string> = {
    'appartement': 'Appartement',
    'villa': 'Villa',
    'immeuble': 'Immeuble',
    'restaurant': 'Restaurant',
    'duplex': 'Duplex',
    'maison': 'Maison',
    'magasin': 'Magasin',
    'bureau': 'Bureau',
    'salon de coiffure': 'Salon de coiffure',
    'salon de beauté': 'Salon de beauté',
    'hotel': 'Hôtel',
    'hôtel': 'Hôtel',
    'studio': 'Studio',
    'cuisine': 'Cuisine',
    'chambre à coucher': 'Chambre à coucher',
    'cabinet': 'Cabinet',
    'locale pour kine': 'Locale pour kiné',
    'laboratoire de fabrication de produits cosmétiques': 'Laboratoire',
    'pharmacie': 'Pharmacie',
    'boulangie patisserie': 'Boulangerie pâtisserie',
    'commerce': 'Commerce',
    'ferme': 'Ferme',
    'logement de campagne': 'Logement de campagne',
    'logement social': 'Logement social',
    'autre': 'Autre',
    'autres': 'Autre',
    'autre ': 'Autre',
  }
  
  const normalized = csvType.toLowerCase().trim()
  return typeMap[normalized] || csvType.trim()
}

interface CSVRow {
  nom: string
  telephone: string
  typeBien: string
}

async function updateContactTypeBienFromCSV() {
  console.log('🔧 Starting update of contact typeBien from CSV...\n')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'Tiktok-Leads-november-qualifed.csv')
    console.log(`📄 Reading CSV file: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows')
    }

    // Parse CSV (skip header)
    const csvRows: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Simple CSV parsing (handles quoted fields)
      const fields: string[] = []
      let currentField = ''
      let inQuotes = false
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField.trim())
          currentField = ''
        } else {
          currentField += char
        }
      }
      fields.push(currentField.trim()) // Add last field
      
      // CSV columns: ,Nom et Prénom,Numéro de téléphone,Type de Bien,...
      if (fields.length >= 4) {
        const nom = fields[1]?.trim() || ''
        const telephone = fields[2]?.trim() || ''
        const typeBien = fields[3]?.trim() || ''
        
        if (nom && telephone && typeBien) {
          csvRows.push({ nom, telephone, typeBien })
        }
      }
    }

    console.log(`✅ Parsed ${csvRows.length} rows from CSV\n`)

    // Get all contacts
    console.log('📊 Fetching all contacts from database...')
    const allContacts = await prisma.contact.findMany({
      select: {
        id: true,
        nom: true,
        telephone: true,
        typeBien: true,
      }
    })
    console.log(`✅ Found ${allContacts.length} contacts in database\n`)

    // Match and update
    let updated = 0
    let matched = 0
    let notFound = 0
    let alreadyHasType = 0
    const matchedContacts = new Set<string>()

    console.log('🔄 Matching contacts and updating typeBien...\n')

    for (const csvRow of csvRows) {
      const csvPhone = normalizePhone(csvRow.telephone)
      const csvName = normalizeName(csvRow.nom)
      const mappedTypeBien = mapTypeBien(csvRow.typeBien)

      if (!mappedTypeBien) {
        console.log(`⚠️  Skipping "${csvRow.nom}" - invalid typeBien: "${csvRow.typeBien}"`)
        continue
      }

      // Find matching contact
      let matchedContact = null

      for (const contact of allContacts) {
        const contactPhone = normalizePhone(contact.telephone)
        const contactName = normalizeName(contact.nom)
        const csvLast9 = getLast9Digits(csvRow.telephone)
        const contactLast9 = getLast9Digits(contact.telephone)

        // Match by exact phone (most reliable)
        if (csvPhone && contactPhone && csvPhone === contactPhone) {
          matchedContact = contact
          break
        }

        // Match by last 9 digits (handles format differences)
        if (csvLast9 && contactLast9 && csvLast9 === contactLast9) {
          matchedContact = contact
          break
        }

        // Match by name if phone doesn't match or is missing
        if (csvName && contactName && csvName === contactName) {
          // Only use name match if phone is very similar or one is missing
          if (!csvPhone || !contactPhone || csvLast9 === contactLast9) {
            matchedContact = contact
            break
          }
        }
      }

      if (!matchedContact) {
        notFound++
        console.log(`❌ Not found: "${csvRow.nom}" (${csvRow.telephone}) - Type: ${mappedTypeBien}`)
        continue
      }

      matched++
      
      // Check if already has this typeBien
      if (matchedContact.typeBien === mappedTypeBien) {
        alreadyHasType++
        console.log(`⏭️  Already has type: "${matchedContact.nom}" - ${mappedTypeBien}`)
        continue
      }

      // Update contact
      try {
        await prisma.contact.update({
          where: { id: matchedContact.id },
          data: { typeBien: mappedTypeBien }
        })
        updated++
        matchedContacts.add(matchedContact.id)
        console.log(`✅ Updated: "${matchedContact.nom}" (${matchedContact.telephone}) - ${matchedContact.typeBien || 'null'} → ${mappedTypeBien}`)
      } catch (error) {
        console.error(`❌ Error updating "${matchedContact.nom}":`, error)
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   📄 CSV rows processed: ${csvRows.length}`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⏭️  Already had correct type: ${alreadyHasType}`)
    console.log(`   🔍 Matched but skipped: ${matched - updated - alreadyHasType}`)
    console.log(`   ❌ Not found in database: ${notFound}`)
    console.log(`   📊 Total contacts in database: ${allContacts.length}`)
    console.log('\n✨ Update completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the update
updateContactTypeBienFromCSV()
  .then(() => {
    console.log('\n🎉 Update finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Update failed:', error)
    process.exit(1)
  })

