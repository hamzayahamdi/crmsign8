/**
 * TikTok Leads Import Script with Call History
 * 
 * Features:
 * - Imports leads from CSV with call history tracking
 * - Detects duplicates by phone number
 * - Maps call columns to lead notes
 * - Tags leads with campaign information
 * - Preserves existing lead data
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const csv = require('csv-parser');

const prisma = new PrismaClient();

// Status mapping from CSV to database
const STATUS_MAP = {
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
};

// Property type mapping
const PROPERTY_TYPE_MAP = {
  'Appartement': 'Appartement',
  'Villa': 'Villa',
  'Maison': 'Villa',
  'Bureau': 'Bureau',
  'Magasin': 'Magasin',
  'Restaurant': 'Magasin',
  'Salon de coiffure': 'Magasin',
  'immeuble': 'Autre',
  'trisian': 'Autre'
};

// Clean phone number
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/^212/, '').replace(/^0/, '');
}

// Parse date from CSV format (DD/MM/YYYY)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(`${year}-${month}-${day}`);
}

// Generate call history notes
function generateCallHistoryNotes(row) {
  const notes = [];
  
  if (row['Called on']) {
    const date = parseDate(row['Called on']);
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Premier appel',
        content: `📞 Premier appel effectué le ${date.toLocaleDateString('fr-FR')}`
      });
    }
  }
  
  if (row['Deuxième appel']) {
    const date = parseDate(row['Deuxième appel']);
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Deuxième appel',
        content: `📞 Deuxième appel effectué le ${date.toLocaleDateString('fr-FR')}`
      });
    }
  }
  
  if (row['3 éme appel']) {
    const date = parseDate(row['3 éme appel']);
    if (date) {
      notes.push({
        type: 'call',
        date: date,
        label: 'Troisième appel',
        content: `📞 Troisième appel effectué le ${date.toLocaleDateString('fr-FR')}`
      });
    }
  }
  
  return notes;
}

async function importLeads(csvFilePath, campaignName = 'Octobre-Novembre 2025') {
  const results = [];
  const errors = [];
  let duplicates = 0;
  let imported = 0;
  let updated = 0;

  console.log('🚀 Starting TikTok leads import...');
  console.log(`📁 Reading file: ${csvFilePath}`);
  console.log(`🏷️  Campaign: ${campaignName}\n`);

  // Read CSV file
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📊 Found ${rows.length} rows in CSV\n`);

  // Process each row
  for (const row of rows) {
    try {
      const nom = row['Nom et Prénom']?.trim();
      const telephone = row['Numéro de téléphone']?.trim();
      const typeBien = row['Type de Bien']?.trim();
      const ville = row['Ville']?.trim();
      const statut = row['Statut']?.trim();
      const note = row['Note']?.trim();
      const assigneA = row['Assigné à']?.trim(); // Fixed: reading correct column

      // Skip empty rows
      if (!nom || !telephone) {
        console.log(`⚠️  Skipping row with missing name or phone`);
        continue;
      }

      // Clean phone number for duplicate detection
      const cleanPhone = cleanPhoneNumber(telephone);

      // Check for duplicates
      const existingLead = await prisma.lead.findFirst({
        where: {
          OR: [
            { telephone: telephone },
            { telephone: { contains: cleanPhone } }
          ]
        },
        include: { notes: true }
      });

      // Map status
      const mappedStatus = STATUS_MAP[statut] || 'nouveau';
      
      // Map property type
      const mappedTypeBien = PROPERTY_TYPE_MAP[typeBien] || typeBien || 'Autre';

      // Generate call history
      const callHistory = generateCallHistoryNotes(row);

      // Prepare lead data
      const leadData = {
        nom: nom,
        telephone: telephone,
        ville: ville || 'Non spécifié',
        typeBien: mappedTypeBien,
        statut: mappedStatus,
        statutDetaille: note || `Lead importé depuis ${campaignName}`,
        message: note || '',
        assignePar: assigneA || 'Non assigné',
        source: 'tiktok',
        priorite: mappedStatus === 'qualifie' ? 'haute' : 'moyenne',
        campaignName: campaignName,
        month: 'Octobre-Novembre 2025',
        uploadedAt: new Date(),
        derniereMaj: new Date()
      };

      if (existingLead) {
        // Update existing lead with new campaign tag
        console.log(`🔄 Duplicate found: ${nom} (${telephone})`);
        
        // Update campaign info but preserve other data
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            campaignName: `${existingLead.campaignName || 'Ancienne Campagne'} + ${campaignName}`,
            derniereMaj: new Date()
          }
        });

        // Add call history as notes
        for (const call of callHistory) {
          await prisma.leadNote.create({
            data: {
              leadId: existingLead.id,
              content: call.content,
              author: 'Système Import',
              createdAt: call.date
            }
          });
        }

        // Add import note
        if (note) {
          await prisma.leadNote.create({
            data: {
              leadId: existingLead.id,
              content: `📝 Note de campagne ${campaignName}: ${note}`,
              author: 'Système Import'
            }
          });
        }

        duplicates++;
        updated++;
      } else {
        // Create new lead
        const newLead = await prisma.lead.create({
          data: {
            ...leadData,
            createdBy: 'Import TikTok'
          }
        });

        console.log(`✅ Imported: ${nom} (${telephone}) - ${mappedStatus}`);

        // Add call history as notes
        for (const call of callHistory) {
          await prisma.leadNote.create({
            data: {
              leadId: newLead.id,
              content: call.content,
              author: 'Système Import',
              createdAt: call.date
            }
          });
        }

        // Add initial note if provided
        if (note) {
          await prisma.leadNote.create({
            data: {
              leadId: newLead.id,
              content: `📝 ${note}`,
              author: 'Système Import'
            }
          });
        }

        imported++;
        results.push(newLead);
      }

    } catch (error) {
      console.error(`❌ Error processing row:`, error.message);
      errors.push({ row, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ New leads imported: ${imported}`);
  console.log(`🔄 Existing leads updated: ${updated}`);
  console.log(`⚠️  Duplicates skipped: ${duplicates}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log('='.repeat(60) + '\n');

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.error}`);
    });
  }

  return { imported, updated, duplicates, errors: errors.length };
}

// Main execution
async function main() {
  const csvFilePath = process.argv[2] || path.join(__dirname, '..', 'Tiktok-Leads - Sheet1 - October_ Novembre.csv');
  const campaignName = process.argv[3] || 'Octobre-Novembre 2025';

  try {
    await importLeads(csvFilePath, campaignName);
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { importLeads };
