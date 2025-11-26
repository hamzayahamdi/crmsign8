import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
  'trisian': 'Autre'
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

// Generate call history notes
function generateCallHistoryNotes(row: any) {
  const notes: Array<{ type: string; date: Date; label: string; content: string }> = []
  
  if (row.calledOn) {
    const date = parseDate(row.calledOn)
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Premier appel',
        content: `📞 Premier appel effectué le ${date.toLocaleDateString('fr-FR')}`
      })
    }
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

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let user: { userId: string; email: string; name: string; role: string } | null = null
    
    try {
      const decoded = verify(token, JWT_SECRET) as any
      user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: (decoded.role || '').toLowerCase()
      }
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only admin can import
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { leads, campaignName } = body

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    const results = {
      imported: 0,
      updated: 0,
      duplicates: 0,
      errors: 0,
      details: [] as any[]
    }

    // Mark all existing leads as "Ancienne Campagne" before import
    await prisma.lead.updateMany({
      where: {
        campaignName: {
          not: {
            contains: 'Ancienne Campagne'
          }
        }
      },
      data: {
        campaignName: 'Ancienne Campagne'
      }
    })

    // Process each lead
    for (const row of leads) {
      try {
        const { nom, telephone, typeBien, ville, statut, note, assigneA, calledOn, deuxiemeAppel, troisiemeAppel } = row
        
        // Skip empty rows
        if (!nom || !telephone) {
          continue
        }
        
        // Debug log to verify assigneA is being read
        if (assigneA) {
          console.log(`[Import] Lead ${nom} assigned to: ${assigneA}`)
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

        // Generate call history
        const callHistory = generateCallHistoryNotes({ calledOn, deuxiemeAppel, troisiemeAppel })

        // Prepare lead data
        const leadData = {
          nom: nom,
          telephone: telephone,
          ville: ville || 'Non spécifié',
          typeBien: mappedTypeBien,
          statut: mappedStatus as any,
          statutDetaille: note || `Lead importé depuis ${campaignName}`,
          message: note || '',
          assignePar: assigneA || 'Mohamed', // Default to Mohamed (gestionnaire de projet)
          source: 'tiktok' as any,
          priorite: (mappedStatus === 'qualifie' ? 'haute' : 'moyenne') as any,
          campaignName: campaignName || 'Nouvelle Campagne',
          month: 'Octobre-Novembre 2025',
          uploadedAt: new Date(),
          derniereMaj: new Date()
        }

        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              campaignName: `Ancienne Campagne + ${campaignName}`,
              derniereMaj: new Date()
            }
          })

          // Add call history as notes
          for (const call of callHistory) {
            await prisma.leadNote.create({
              data: {
                leadId: existingLead.id,
                content: call.content,
                author: user.name,
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
                author: user.name
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
              createdBy: user.name
            }
          })

          // Add call history as notes
          for (const call of callHistory) {
            await prisma.leadNote.create({
              data: {
                leadId: newLead.id,
                content: call.content,
                author: user.name,
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
                author: user.name
              }
            })
          }

          results.imported++
          results.details.push({ nom, status: 'imported', id: newLead.id })
        }
      } catch (error: any) {
        console.error('Error processing lead:', error)
        results.errors++
        results.details.push({ nom: row.nom, status: 'error', error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import leads'
    }, { status: 500 })
  }
}
