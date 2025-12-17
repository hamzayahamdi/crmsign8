/**
 * Script to import leads from decembre.csv
 * Handles duplicates based on phone number
 * 
 * Usage:
 *   npx tsx scripts/import-decembre-leads.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Status mapping from CSV to database
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
  'immeuble': 'Autre',
  'trisian': 'Autre',
  'Duplex': 'Duplex',
  'Studio': 'Studio',
  'Cuisine': 'Autre',
  'Chambre à coucher': 'Autre',
  'Cabinet': 'Bureau',
  'Hôtel': 'Autre',
  'Hotel': 'Autre',
  'Autres': 'Autre',
  'Autre': 'Autre'
}

// Clean phone number
function cleanPhoneNumber(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\s+/g, '').replace(/^212/, '').replace(/^0/, '')
}

// Parse date from CSV format (DD/MM/YYYY)
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return new Date(`${year}-${month}-${day}`)
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
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
  return fields
}

interface CSVRow {
  nom: string
  telephone: string
  typeBien: string
  ville?: string
  statut: string
  note?: string
  assigneA?: string
  calledOn?: string
  deuxiemeAppel?: string
  troisiemeAppel?: string
}

async function importDecembreLeads() {
  console.log('🚀 Starting import of leads from decembre.csv...\n')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'decembre.csv')
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
      
      const fields = parseCSVLine(line)
      
      // CSV columns: ,Nom et Prénom,Numéro de téléphone,Type de Bien,Called on,Deuxième appel,3 éme appel,Statut,Note,Assigné à,Message envoyer,
      if (fields.length >= 8) {
        const nom = fields[1]?.trim() || ''
        const telephone = fields[2]?.trim() || ''
        const typeBien = fields[3]?.trim() || ''
        const calledOn = fields[4]?.trim() || ''
        const deuxiemeAppel = fields[5]?.trim() || ''
        const troisiemeAppel = fields[6]?.trim() || ''
        const statut = fields[7]?.trim() || ''
        const note = fields[8]?.trim() || ''
        const assigneA = fields[9]?.trim() || ''
        // Extract ville from note or use default
        const ville = 'Casablanca' // Default, can be extracted from note if needed
        
        if (nom && telephone) {
          csvRows.push({
            nom,
            telephone,
            typeBien,
            ville,
            statut,
            note,
            assigneA,
            calledOn,
            deuxiemeAppel,
            troisiemeAppel
          })
        }
      }
    }

    console.log(`✅ Parsed ${csvRows.length} rows from CSV\n`)

    const results = {
      imported: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      details: [] as any[]
    }

    const campaignName = 'Décembre 2025'
    const month = 'Décembre 2025'

    // Process each lead
    console.log('🔄 Processing leads...\n')
    for (const row of csvRows) {
      try {
        const { nom, telephone, typeBien, ville, statut, note, assigneA, calledOn, deuxiemeAppel, troisiemeAppel } = row
        
        // Skip empty rows
        if (!nom || !telephone) {
          continue
        }

        // Clean phone number
        const cleanPhone = cleanPhoneNumber(telephone)

        // Check for duplicates
        const existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              { telephone: telephone },
              { telephone: { contains: cleanPhone } }
            ]
          },
          include: { notes: true }
        })

        // Map status and type
        const mappedStatus = STATUS_MAP[statut] || 'nouveau'
        const mappedTypeBien = PROPERTY_TYPE_MAP[typeBien] || typeBien || 'Autre'

        // Generate call history notes
        const callHistory: Array<{ date: Date; content: string }> = []
        
        if (calledOn) {
          const date = parseDate(calledOn)
          if (date) {
            callHistory.push({
              date,
              content: `📞 Premier appel effectué le ${date.toLocaleDateString('fr-FR')}`
            })
          }
        }
        
        if (deuxiemeAppel) {
          const date = parseDate(deuxiemeAppel)
          if (date) {
            callHistory.push({
              date,
              content: `📞 Deuxième appel effectué le ${date.toLocaleDateString('fr-FR')}`
            })
          }
        }
        
        if (troisiemeAppel) {
          const date = parseDate(troisiemeAppel)
          if (date) {
            callHistory.push({
              date,
              content: `📞 Troisième appel effectué le ${date.toLocaleDateString('fr-FR')}`
            })
          }
        }

        // Prepare lead data
        const leadData = {
          nom: nom,
          telephone: telephone,
          ville: ville || 'Non spécifié',
          typeBien: mappedTypeBien,
          statut: mappedStatus as any,
          statutDetaille: note || `Lead importé depuis ${campaignName}`,
          message: note || '',
          assignePar: assigneA || 'Mohamed',
          source: 'tiktok' as any,
          priorite: (mappedStatus === 'qualifie' ? 'haute' : 'moyenne') as any,
          campaignName: campaignName,
          month: month,
          uploadedAt: new Date(),
          derniereMaj: new Date()
        }

        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              campaignName: existingLead.campaignName?.includes(campaignName) 
                ? existingLead.campaignName 
                : `${existingLead.campaignName || 'Ancienne Campagne'} + ${campaignName}`,
              derniereMaj: new Date()
            }
          })

          // Add call history as notes
          for (const call of callHistory) {
            await prisma.leadNote.create({
              data: {
                leadId: existingLead.id,
                content: call.content,
                author: 'System',
                createdAt: call.date
              }
            })
          }

          // Add import note
          if (note) {
            await prisma.leadNote.create({
              data: {
                leadId: existingLead.id,
                content: `📝 Note de campagne ${campaignName}: ${note}`,
                author: 'System'
              }
            })
          }

          results.duplicates++
          results.updated++
          results.details.push({ nom, status: 'updated' })
        } else {
          // Create new lead
          const newLead = await prisma.lead.create({
            data: {
              ...leadData,
              createdBy: 'System'
            }
          })

          // Add call history as notes
          for (const call of callHistory) {
            await prisma.leadNote.create({
              data: {
                leadId: newLead.id,
                content: call.content,
                author: 'System',
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
                author: 'System'
              }
            })
          }

          results.imported++
          results.details.push({ nom, status: 'imported', id: newLead.id })
        }
      } catch (error: any) {
        console.error(`❌ Error processing lead "${row.nom}":`, error.message)
        results.errors++
        results.details.push({ nom: row.nom, status: 'error', error: error.message })
      }
    }

    console.log('\n📈 Summary:')
    console.log(`   ✅ Imported: ${results.imported}`)
    console.log(`   🔄 Updated: ${results.updated}`)
    console.log(`   🔁 Duplicates: ${results.duplicates}`)
    console.log(`   ❌ Errors: ${results.errors}`)
    console.log(`   📊 Total processed: ${csvRows.length}`)
    console.log('\n✨ Import completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importDecembreLeads()
  .then(() => {
    console.log('\n🎉 Import finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error)
    process.exit(1)
  })

