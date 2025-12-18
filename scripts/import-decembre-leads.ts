/**
 * Script to import QUALIFIED leads from decembre-lead.csv
 * 
 * This script reads QUALIFIED leads from a CSV file and imports them into the database,
 * avoiding duplicates based on phone numbers and assigning leads to architects with all notes and call history.
 * 
 * Usage:
 *   tsx scripts/import-decembre-leads.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })
config({ path: path.join(process.cwd(), '.env') })

const DATABASE_URL = process.env.DATABASE_URL
const DIRECT_URL = process.env.DIRECT_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables')
  process.exit(1)
}

// Create Prisma client with DATABASE_URL from env
// DIRECT_URL is used by Prisma migrations, not the client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
})

// Status mapping from Excel to database
const STATUS_MAP: Record<string, string> = {
  'Qualifié': 'qualifie',
  'qualifié': 'qualifie',
  'à recontacter': 'a_recontacter',
  'Sans réponse': 'sans_reponse',
  'sans réponse': 'sans_reponse',
  'Non intéressé': 'non_interesse',
  'non intéressé': 'non_interesse',
  'Refusé': 'refuse',
  'refusé': 'refuse',
  'à suivre': 'a_recontacter',
  'Nouveau': 'nouveau',
  'nouveau': 'nouveau'
}

// Property type mapping
const PROPERTY_TYPE_MAP: Record<string, string> = {
  'Appartement': 'Appartement',
  'Villa': 'Villa',
  'Maison': 'Villa',
  'Bureau': 'Bureau',
  'Magasin': 'Magasin',
  'Restaurant': 'Magasin',
  'Salon de coiffure': 'Magasin',
  'Salon de beauté': 'Magasin',
  'immeuble': 'Autre',
  'trisian': 'Autre',
  'Duplex': 'Appartement',
  'Studio': 'Appartement',
  'Cuisine': 'Autre',
  'Chambre à coucher': 'Autre',
  'Autres': 'Autre',
  'Autre': 'Autre',
  'Hotel': 'Autre',
  'Hôtel': 'Autre',
  'Cabinet': 'Bureau',
  'Plateau bureau': 'Bureau',
  'Ferme': 'Autre',
  'Locale pour kine': 'Autre',
  'Logement de Campagne': 'Autre',
  'Logement social': 'Autre',
  'Maison R+2': 'Villa',
  'Maison R*3': 'Villa',
  'Maison RC+1': 'Villa',
  'Maison commercial r+3': 'Autre',
  'Maison de campagne': 'Villa',
  'Maison rurale': 'Villa',
  'Petite villa': 'Villa',
  'Villa duplex': 'Villa',
  'Villa plu terrasse': 'Villa',
  'Villa semi fini': 'Villa',
  'R+2': 'Autre',
  'R+3': 'Autre',
  '+3': 'Autre',
  'Immeuble R+3': 'Autre',
  'Immeuble pour appart hôtel': 'Autre',
  'Centre d\'hémodialyse': 'Autre',
  'Pharmacie': 'Autre',
  'Boulangie patisserie': 'Autre',
  'Cafe': 'Autre',
  'Paramédical': 'Autre',
  'Beauty centre': 'Autre',
  'Laboratoire de fabrication de produits cosmétiques': 'Autre',
  'commerce de 910mètre c': 'Autre',
  'Local commercial': 'Magasin',
  'Boutique et villa': 'Autre',
  'Inteesse': 'Autre'
}


// Clean phone number
function cleanPhoneNumber(phone: string): string {
  if (!phone) return ''
  // Remove all spaces and special characters except + and digits
  let cleaned = phone.toString().replace(/\s+/g, '').replace(/[^\d+]/g, '')
  // Remove leading country code variations
  cleaned = cleaned.replace(/^212/, '').replace(/^0/, '')
  return cleaned
}

// Parse date from CSV format (DD/MM/YYYY)
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null
  
  // If it's already a Date object
  if (dateStr instanceof Date) {
    return dateStr
  }
  
  const str = dateStr.toString().trim()
  if (!str || str === '') return null
  
  // Try DD/MM/YYYY format
  const parts = str.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    const date = new Date(`${year}-${month}-${day}`)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  // Try standard date parsing
  const date = new Date(str)
  if (!isNaN(date.getTime())) {
    return date
  }
  
  return null
}

// Generate call history notes
function generateCallHistoryNotes(row: any) {
  const notes: Array<{ type: string; date: Date; label: string; content: string }> = []
  
  // Check if calledOn is a date (DD/MM/YYYY format) or a city name
  if (row.calledOn) {
    const calledOnStr = row.calledOn.toString().trim()
    // Check if it's a date
    if (calledOnStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const date = parseDate(calledOnStr)
      if (date) {
        notes.push({
          type: 'call',
          date: date,
          label: 'Premier appel',
          content: `📞 Premier appel effectué le ${date.toLocaleDateString('fr-FR')}`
        })
      }
    }
    // If it's a city name, we'll use it for the ville field instead
  }
  
  if (row.deuxiemeAppel) {
    const date = parseDate(row.deuxiemeAppel)
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Deuxième appel',
        content: `📞 Deuxième appel effectué le ${date.toLocaleDateString('fr-FR')}`
      })
    }
  }
  
  if (row.troisiemeAppel) {
    const date = parseDate(row.troisiemeAppel)
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Troisième appel',
        content: `📞 Troisième appel effectué le ${date.toLocaleDateString('fr-FR')}`
      })
    }
  }
  
  return notes
}

// Extract city from various fields
function extractCity(row: any): string {
  // Check if there's a dedicated city column
  if (row.ville) return row.ville.trim()
  
  // Check in note field for city mentions
  if (row.note) {
    const cityPatterns = [
      /Casablanca|Casa/gi,
      /Rabat/gi,
      /Marrakech/gi,
      /Tanger/gi,
      /Agadir/gi,
      /Fes|Fès/gi,
      /Meknès|Meknes/gi,
      /Salé|Sale/gi,
      /Mohammedia/gi,
      /El Jadida|Eljadida/gi,
      /Bouznika/gi,
      /Dar Bouazza/gi,
      /Ain Sba3|Ain Sbaa/gi,
      /Hay Riad/gi,
      /Hay Essalam/gi,
      /Bernoussi/gi,
      /Sidi rahal/gi,
      /Temara/gi,
      /Ben Slimane/gi,
      /Azemmour/gi,
      /Sala al Jadida/gi,
      /Zenata/gi,
      /Tamesna/gi
    ]
    
    for (const pattern of cityPatterns) {
      const match = row.note.match(pattern)
      if (match) {
        return match[0]
      }
    }
  }
  
  return 'Non spécifié'
}


async function importDecembreLeads() {
  console.log('🚀 Starting import of QUALIFIED December leads from CSV...\n')
  console.log(`📊 Database URL: ${DATABASE_URL?.substring(0, 50)}...`)
  if (DIRECT_URL) {
    console.log(`📊 Direct URL: ${DIRECT_URL.substring(0, 50)}...`)
  }
  console.log('')

  try {
    // Connect to database
    await prisma.$connect()
    console.log('✅ Connected to database\n')
    
    // First, delete ALL previously imported December 2025 leads
    console.log('🗑️  Deleting ALL previously imported December 2025 leads...')
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        OR: [
          { campaignName: 'Décembre 2025' },
          { campaignName: { contains: 'Décembre 2025' } },
          { campaignName: { contains: 'Décembre' } },
          { month: 'Décembre 2025' },
          { month: { contains: 'Décembre' } }
        ]
      }
    })
    console.log(`   ✅ Deleted ${deleteResult.count} previously imported December leads\n`)

    // Parse CSV file
    function parseCSV(csvPath: string): any[] {
      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const lines = csvContent.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        return []
      }

      // Parse header
      const headerLine = lines[0]
      const headers: string[] = []
      let currentHeader = ''
      let inQuotes = false
      
      for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          headers.push(currentHeader.trim())
          currentHeader = ''
        } else {
          currentHeader += char
        }
      }
      headers.push(currentHeader.trim())

      // Parse data rows
      const data: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const fields: string[] = []
        let currentField = ''
        inQuotes = false
        
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
        fields.push(currentField.trim())
        
        // Create row object
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = fields[index] || ''
        })
        
        data.push(row)
      }
      
      return data
    }

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'decembre-lead.csv')
    console.log(`📄 Reading CSV file: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }

    const allData = parseCSV(csvPath)
    
    console.log(`✅ Found ${allData.length} total rows in Excel file`)

    // Filter only QUALIFIED leads - be very strict
    console.log(`📊 Filtering qualified leads from ${allData.length} total rows...`)
    const qualifiedData: any[] = []
    let skippedCount = 0
    
    for (const row of allData) {
      const rowAny = row as any
      // Get all possible status column names
      const statut = (
        rowAny['Statut'] || 
        rowAny['statut'] || 
        rowAny['STATUT'] ||
        ''
      ).toString().trim()
      
      // Only accept exact matches (case-insensitive)
      const statutLower = statut.toLowerCase()
      const isQualified = statutLower === 'qualifié' || statutLower === 'qualifie'
      
      // Also check if row has required fields
      const nom = (rowAny['Nom et Prénom'] || rowAny['nom et prénom'] || '').toString().trim()
      const telephone = (rowAny['Numéro de téléphone'] || rowAny['numéro de téléphone'] || '').toString().trim().replace(/\s+/g, '')
      
      // Skip if missing required fields
      if (!nom || !telephone) {
        skippedCount++
        continue
      }
      
      // Only add if it's qualified
      if (isQualified) {
        qualifiedData.push(rowAny)
      } else {
        skippedCount++
        // Log first few skipped for debugging
        if (skippedCount <= 5 && statut) {
          console.log(`   ⚠️  Skipping non-qualified: ${nom} - Statut: "${statut}"`)
        }
      }
    }
    
    if (skippedCount > 0) {
      console.log(`   ℹ️  Skipped ${skippedCount} non-qualified or incomplete rows`)
    }

    console.log(`✅ Found ${qualifiedData.length} QUALIFIED leads to import (out of ${allData.length} total)\n`)
    
    // Log first few to verify
    if (qualifiedData.length > 0) {
      console.log('📋 Sample of qualified leads:')
      qualifiedData.slice(0, 5).forEach((row: any, idx: number) => {
        const nom = (row['Nom et Prénom'] || '').toString().trim()
        const statut = (row['Statut'] || '').toString().trim()
        console.log(`   ${idx + 1}. ${nom} - Statut: "${statut}"`)
      })
      if (qualifiedData.length > 5) {
        console.log(`   ... and ${qualifiedData.length - 5} more qualified leads`)
      }
      console.log('')
    } else {
      console.log('⚠️  WARNING: No qualified leads found!')
      console.log('   Checking first few rows for status values:')
      allData.slice(0, 10).forEach((row: any, idx: number) => {
        const nom = (row['Nom et Prénom'] || '').toString().trim()
        const statut = (row['Statut'] || '').toString().trim()
        console.log(`   ${idx + 1}. ${nom} - Statut: "${statut}"`)
      })
      console.log('')
    }

    if (qualifiedData.length === 0) {
      console.log('⚠️  No qualified leads found. Exiting.')
      return
    }

    const campaignName = 'Décembre 2025 - Campagne Qualifiée'
    const results = {
      imported: 0,
      duplicates: 0,
      errors: 0,
      details: [] as any[]
    }

    // Process each QUALIFIED lead
    console.log('📊 Processing QUALIFIED leads...\n')
    for (let i = 0; i < qualifiedData.length; i++) {
      const row: any = qualifiedData[i]
      
      try {
        // Map CSV columns to our format
        const nom = (row['Nom et Prénom'] || '').toString().trim()
        let telephone = (row['Numéro de téléphone'] || '').toString().trim()
        // Clean phone number - remove spaces
        telephone = telephone.replace(/\s+/g, '')
        const typeBien = (row['Type de Bien'] || '').toString().trim()
        const statut = (row['Statut'] || '').toString().trim()
        const note = (row['Note'] || '').toString().trim()
        const assigneA = (row['Assigné à'] || '').toString().trim()
        const calledOn = (row['Called on'] || '').toString().trim()
        const deuxiemeAppel = (row['Deuxième appel'] || '').toString().trim()
        const troisiemeAppel = (row['3 éme appel'] || '').toString().trim()
        const messageEnvoye = (row['Message envoyer'] || '').toString().trim()
        
        // Skip empty rows
        if (!nom || !telephone) {
          continue
        }
        
        // Double check it's qualified (should already be filtered, but be extra strict)
        const statutLower = statut.toLowerCase()
        if (statutLower !== 'qualifié' && statutLower !== 'qualifie') {
          console.log(`   ❌ SKIPPING non-qualified lead: ${nom} - Statut: "${statut}"`)
          results.errors++
          continue
        }
        
        // Also skip if statut is empty
        if (!statut || statut.trim() === '') {
          console.log(`   ❌ SKIPPING lead with empty status: ${nom}`)
          results.errors++
          continue
        }
        
        // Log each qualified lead being processed
        console.log(`   ✅ Processing qualified lead: ${nom} (${telephone}) - Assigned to: ${assigneA || 'Not assigned'}`)
        
        // Ensure phone number is properly formatted as string
        telephone = telephone.toString().trim()
        
        // Clean phone number for duplicate checking
        const cleanPhone = cleanPhoneNumber(telephone)
        const normalizedPhone = telephone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
        const phoneVariations = [
          telephone,
          cleanPhone,
          normalizedPhone,
          telephone.replace(/\s+/g, ''),
          `212${cleanPhone}`,
          `0${cleanPhone}`,
          `+212${cleanPhone}`
        ].filter(p => p && p.length > 0)
        
        // Check for duplicates using multiple phone number variations
        const existingLead = await prisma.lead.findFirst({
          where: {
            OR: phoneVariations.map(phone => ({
              telephone: { contains: phone }
            }))
          },
          include: { notes: true }
        })
        
        // If duplicate found, skip this lead
        if (existingLead) {
          console.log(`   ⚠️  Skipping duplicate: ${nom} (${telephone}) - already exists`)
          results.duplicates++
          continue
        }

        // Map status and type
        const mappedStatus = STATUS_MAP[statut] || 'nouveau'
        const mappedTypeBien = PROPERTY_TYPE_MAP[typeBien] || typeBien || 'Autre'
        
        // Extract city - check "Called on" column which may contain cities or dates
        let ville = (row['Called on'] || '').toString().trim()
        // If "Called on" is a date (DD/MM/YYYY), extract city from note instead
        if (ville.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          // It's a date, not a city - extract city from note
          ville = extractCity({ ville: '', note })
        } else if (ville && !ville.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          // "Called on" contains city name (not a date), use it
          // Clean up city name (remove "sale" suffix, capitalize properly)
          ville = ville.replace(/\s*sale\s*/gi, '').trim()
          if (!ville) {
            ville = extractCity({ ville: '', note })
          }
        } else {
          // Empty or unknown format, extract from note
          ville = extractCity({ ville: '', note })
        }
        
        // Generate call history (pass calledOn only if it's a date)
        const calledOnDate = calledOn.match(/^\d{2}\/\d{2}\/\d{4}$/) ? calledOn : ''
        const callHistory = generateCallHistoryNotes({ 
          calledOn: calledOnDate, 
          deuxiemeAppel, 
          troisiemeAppel 
        })
        
        // Prepare lead data
        const leadData = {
          nom: nom,
          telephone: telephone,
          ville: ville,
          typeBien: mappedTypeBien,
          statut: mappedStatus as any,
          statutDetaille: note || `Lead importé depuis ${campaignName}`,
          message: note || '',
          assignePar: assigneA || 'Mohamed', // Default to Mohamed if not assigned
          source: 'tiktok' as any,
          priorite: (mappedStatus === 'qualifie' ? 'haute' : 'moyenne') as any,
          campaignName: campaignName,
          month: 'Décembre 2025',
          uploadedAt: new Date(),
          derniereMaj: new Date()
        }

        // Create new lead (duplicates already filtered above)
        const newLead = await prisma.lead.create({
          data: {
            ...leadData,
            createdBy: assigneA || 'Système'
          }
        })

        // Add call history as notes
        for (const call of callHistory) {
          await prisma.leadNote.create({
            data: {
              leadId: newLead.id,
              content: call.content,
              author: assigneA || 'Système',
              createdAt: call.date
            }
          })
        }

        // Add initial note
        if (note) {
          await prisma.leadNote.create({
            data: {
              leadId: newLead.id,
              content: `📝 ${note}`,
              author: assigneA || 'Système'
            }
          })
        }

        // Add message sent note if applicable
        if (messageEnvoye && messageEnvoye.toLowerCase() === 'oui') {
          await prisma.leadNote.create({
            data: {
              leadId: newLead.id,
              content: `💬 Message envoyé`,
              author: assigneA || 'Système'
            }
          })
        }

        results.imported++
        results.details.push({ nom, status: 'imported', id: newLead.id, telephone })
        
        if ((i + 1) % 50 === 0) {
          console.log(`   Processed ${i + 1}/${qualifiedData.length} qualified leads...`)
        }
      } catch (error: any) {
        console.error(`   ❌ Error processing row ${i + 1}:`, error.message)
        results.errors++
        results.details.push({ 
          nom: row['Nom et Prénom'] || 'Unknown', 
          status: 'error', 
          error: error.message 
        })
      }
    }

    console.log('\n✨ Import completed!\n')
    console.log('📊 Results:')
    console.log(`   ✅ Imported: ${results.imported}`)
    console.log(`   🔁 Duplicates skipped: ${results.duplicates}`)
    console.log(`   ❌ Errors: ${results.errors}`)
    console.log(`   📝 Total processed: ${results.imported + results.duplicates + results.errors}`)

    // Show some sample details
    if (results.details.length > 0) {
      console.log('\n📋 Sample details:')
      const samples = results.details.slice(0, 10)
      samples.forEach((detail, idx) => {
        console.log(`   ${idx + 1}. ${detail.nom} - ${detail.status}`)
      })
      if (results.details.length > 10) {
        console.log(`   ... and ${results.details.length - 10} more`)
      }
    }

  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

// Function to undo/remove imported December leads
async function undoImport() {
  console.log('🗑️  Removing all December 2025 imported leads...\n')
  console.log(`📊 Database URL: ${DATABASE_URL?.substring(0, 50)}...`)
  if (DIRECT_URL) {
    console.log(`📊 Direct URL: ${DIRECT_URL.substring(0, 50)}...`)
  }
  console.log('')

  try {
    await prisma.$connect()
    console.log('✅ Connected to database\n')
    
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        OR: [
          { campaignName: 'Décembre 2025 - Campagne Qualifiée' },
          { campaignName: { contains: 'Décembre 2025' } },
          { campaignName: { contains: 'Décembre' } },
          { month: 'Décembre 2025' },
          { month: { contains: 'Décembre' } }
        ]
      }
    })
    
    console.log(`✅ Deleted ${deleteResult.count} December leads\n`)
    console.log('✨ Undo completed successfully!')
    
  } catch (error: any) {
    console.error('\n❌ Undo failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Disconnected from database')
  }
}

// Check command line arguments
const args = process.argv.slice(2)
const shouldUndo = args.includes('--undo') || args.includes('-u')

if (shouldUndo) {
  // Run undo
  undoImport().catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })
} else {
  // Run the import
  importDecembreLeads().catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })
}

