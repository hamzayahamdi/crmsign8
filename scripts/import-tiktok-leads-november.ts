import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

/**
 * Script: Import Qualified TikTok Leads from Excel - November 2025 Campaign
 * 
 * This script:
 * 1. Backs up existing lead data (notes and history)
 * 2. Clears ALL old lead data
 * 3. Reads from Excel file (Tiktok-Leads.xlsx)
 * 4. Imports ONLY qualified leads (those with architect assignment)
 * 5. Assigns each lead to their designated architect
 * 6. Sets status to "qualifie" for all imported leads
 * 7. Sets campaignName to "TikTok - Novembre 2025"
 * 8. Preserves history for leads that existed before (matched by phone)
 */

interface LeadBackup {
    id: string;
    nom: string;
    telephone: string;
    ville: string;
    notes: Array<{
        content: string;
        author: string;
        createdAt: Date;
    }>;
    statutDetaille: string;
    message: string | null;
}

interface ExcelRow {
    nom: string;
    telephone: string;
    ville: string;
    typeBien: string;
    statut: string;
    architect: string;
}

// Normalize city names (handle Arabic, French variations, etc.)
function normalizeCity(city: string): string {
    if (!city) return '';

    const normalized = city.trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();

    // Map common variations
    const cityMappings: Record<string, string> = {
        'casablanca': 'Casablanca',
        'casa': 'Casablanca',
        'الدار البيضاء': 'Casablanca',
        'البيضاء': 'Casablanca',
        'dar bouazza': 'Casablanca',
        'bouskoura': 'Casablanca',
        'ain sbai': 'Casablanca',
        'rabat': 'Rabat',
        'الرباط': 'Rabat',
        'rbt': 'Rabat',
        'rabat océan': 'Rabat',
        'marrakech': 'Marrakech',
        'marrakesh': 'Marrakech',
        'مراكش': 'Marrakech',
        'fes': 'Fes',
        'fès': 'Fes',
        'فاس': 'Fes',
        'tanger': 'Tanger',
        'tangier': 'Tanger',
        'طنجة': 'Tanger',
        'agadir': 'Agadir',
        'أكادير': 'Agadir',
        'اكادير': 'Agadir',
        'meknes': 'Meknes',
        'meknès': 'Meknes',
        'مكناس': 'Meknes',
        'oujda': 'Oujda',
        'وجدة': 'Oujda',
        'kenitra': 'Kenitra',
        'القنيطرة': 'Kenitra',
        'tetouan': 'Tetouan',
        'tétouan': 'Tetouan',
        'تطوان': 'Tetouan',
        'temara': 'Temara',
        'تمارة': 'Temara',
        'sale': 'Sale',
        'salé': 'Sale',
        'سلا': 'Sale',
        'mohammedia': 'Mohammedia',
        'المحمدية': 'Mohammedia',
        'el jadida': 'El Jadida',
        'الجديدة': 'El Jadida',
        'nador': 'Nador',
        'الناظور': 'Nador',
        'ناضور': 'Nador',
        'settat': 'Settat',
        'سطات': 'Settat',
        'khouribga': 'Khouribga',
        'خريبكة': 'Khouribga',
        'beni mellal': 'Beni Mellal',
        'بني ملال': 'Beni Mellal',
        'laayoune': 'Laayoune',
        'العيون': 'Laayoune',
        'safi': 'Safi',
        'آسفي': 'Safi',
        'benslimane': 'Benslimane',
        'ahfir berkane': 'Berkane',
        'خنيفرة': 'Khenifra',
    };

    return cityMappings[normalized] || city.trim();
}

// Normalize property type
function normalizePropertyType(type: string): string {
    if (!type) return 'Appartement';

    const normalized = type.trim().toLowerCase();

    if (normalized.includes('villa')) return 'Villa';
    if (normalized.includes('appartement')) return 'Appartement';
    if (normalized.includes('studio')) return 'Studio';
    if (normalized.includes('bureau')) return 'Bureau';
    if (normalized.includes('magasin')) return 'Magasin';
    if (normalized.includes('riad')) return 'Riad';

    return 'Appartement'; // Default
}

// Clean phone number
function cleanPhoneNumber(phone: string): string {
    if (!phone) return '';

    // Convert to string if it's a number
    const phoneStr = String(phone);

    // Remove all spaces, dashes, and special characters
    let cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');

    // Handle international format
    if (cleaned.startsWith('+212')) {
        cleaned = cleaned.substring(4); // Remove +212
    } else if (cleaned.startsWith('212')) {
        cleaned = cleaned.substring(3); // Remove 212
    } else if (cleaned.startsWith('00212')) {
        cleaned = cleaned.substring(5); // Remove 00212
    }

    // Ensure it starts with 0
    if (!cleaned.startsWith('0') && cleaned.length === 9) {
        cleaned = '0' + cleaned;
    }

    return cleaned;
}

async function backupExistingLeads(): Promise<LeadBackup[]> {
    console.log('📦 Backing up existing leads with their history...\n');

    const existingLeads = await prisma.lead.findMany({
        include: {
            notes: {
                orderBy: {
                    createdAt: 'asc'
                }
            }
        }
    });

    const backup: LeadBackup[] = existingLeads.map(lead => ({
        id: lead.id,
        nom: lead.nom,
        telephone: lead.telephone,
        ville: lead.ville,
        notes: lead.notes.map(note => ({
            content: note.content,
            author: note.author,
            createdAt: note.createdAt
        })),
        statutDetaille: lead.statutDetaille,
        message: lead.message
    }));

    // Save backup to file
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `leads-backup-${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log(`✅ Backed up ${backup.length} leads to: ${backupFile}\n`);

    return backup;
}

async function clearOldLeads() {
    console.log('🗑️  Clearing ALL old lead data...\n');

    // Delete all lead notes first (due to foreign key constraint)
    const deletedNotes = await prisma.leadNote.deleteMany({});
    console.log(`   Deleted ${deletedNotes.count} lead notes`);

    // Delete all leads
    const deletedLeads = await prisma.lead.deleteMany({});
    console.log(`   Deleted ${deletedLeads.count} leads\n`);
}

async function importLeadsFromExcel(excelPath: string, backup: LeadBackup[]): Promise<void> {
    console.log('📥 Reading Excel file and importing qualified leads...\n');

    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`   Found ${rawData.length} rows in Excel file\n`);

    let imported = 0;
    let skipped = 0;
    let notQualified = 0;
    let errors = 0;

    // Skip header row (index 0)
    for (let i = 1; i < rawData.length; i++) {
        try {
            const row = rawData[i];

            // Excel structure (based on your CSV):
            // Column 0 (A) = Name
            // Column 1 (B) = Numero de Telephone
            // Column 2 (C) = Ville
            // Column 3 (D) = Type de Bien
            // Column 4 (E) = Statut
            // Column 5 (F) = Architect Assignment

            const nom = row[0] ? String(row[0]).trim() : '';
            const telephone = row[1] ? String(row[1]).trim() : '';
            const ville = row[2] ? String(row[2]).trim() : '';
            const typeBien = row[3] ? String(row[3]).trim() : 'Appartement';
            const statutDetaille = row[4] ? String(row[4]).trim() : '';
            const architectAssignment = row[5] ? String(row[5]).trim().toUpperCase() : '';

            // ONLY import leads with architect assignment (qualified leads)
            if (!architectAssignment || architectAssignment === '') {
                notQualified++;
                continue;
            }

            // Skip empty rows
            if (!nom || nom === '' || !telephone || telephone === '') {
                skipped++;
                continue;
            }

            // Clean and normalize data
            const cleanedPhone = cleanPhoneNumber(telephone);
            const normalizedCity = normalizeCity(ville);
            const normalizedType = normalizePropertyType(typeBien);

            // Use the architect from the Excel file
            const architect = architectAssignment;

            // Check if this lead existed before (by phone number)
            const previousLead = backup.find(
                lead => cleanPhoneNumber(lead.telephone) === cleanedPhone
            );

            // Create the lead
            const newLead = await prisma.lead.create({
                data: {
                    nom: nom,
                    telephone: cleanedPhone,
                    ville: normalizedCity || 'Non spécifié',
                    typeBien: normalizedType,
                    statut: 'qualifie', // All imported leads are qualified
                    statutDetaille: statutDetaille || 'Qualifié',
                    message: null,
                    assignePar: architect,
                    source: 'tiktok',
                    priorite: 'moyenne',
                    month: 'Novembre',
                    campaignName: 'TikTok - Novembre 2025', // Enhanced campaign name
                    uploadedAt: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });

            // If lead existed before, restore its history (notes and calls)
            if (previousLead && previousLead.notes.length > 0) {
                console.log(`   📝 Restoring ${previousLead.notes.length} notes for ${nom}`);

                for (const note of previousLead.notes) {
                    await prisma.leadNote.create({
                        data: {
                            leadId: newLead.id,
                            content: note.content,
                            author: note.author,
                            createdAt: note.createdAt,
                        }
                    });
                }
            }

            imported++;

            if (imported % 50 === 0) {
                console.log(`   ✅ Imported ${imported} qualified leads...`);
            }

        } catch (error) {
            console.error(`   ❌ Error importing row ${i + 1}: ${error}`);
            errors++;
        }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   ✅ Imported (Qualified): ${imported} leads`);
    console.log(`   ⏭️  Skipped (Not Qualified): ${notQualified} leads`);
    console.log(`   ⏭️  Skipped (Empty): ${skipped} rows`);
    console.log(`   ❌ Errors: ${errors}\n`);
}

async function showSummary() {
    console.log('📊 Summary of imported leads:\n');

    const totalLeads = await prisma.lead.count();
    console.log(`   📈 Total leads: ${totalLeads}`);

    // Group by status
    const byStatus = await prisma.lead.groupBy({
        by: ['statut'],
        _count: true,
    });

    console.log('\n   📊 By Status:');
    byStatus.forEach(group => {
        console.log(`      ${group.statut}: ${group._count}`);
    });

    // Group by architect
    const byArchitect = await prisma.lead.groupBy({
        by: ['assignePar'],
        _count: true,
    });

    console.log('\n   👤 By Architect:');
    byArchitect.forEach(group => {
        console.log(`      ${group.assignePar}: ${group._count}`);
    });

    // Group by city
    const byCity = await prisma.lead.groupBy({
        by: ['ville'],
        _count: true,
        orderBy: {
            _count: {
                ville: 'desc'
            }
        },
        take: 10
    });

    console.log('\n   🌍 Top 10 Cities:');
    byCity.forEach(group => {
        console.log(`      ${group.ville}: ${group._count}`);
    });

    // Campaign info
    const byCampaign = await prisma.lead.groupBy({
        by: ['campaignName'],
        _count: true,
    });

    console.log('\n   🎯 By Campaign:');
    byCampaign.forEach(group => {
        console.log(`      ${group.campaignName || 'N/A'}: ${group._count}`);
    });

    // Leads with restored history
    const leadsWithNotes = await prisma.lead.findMany({
        include: {
            _count: {
                select: { notes: true }
            }
        },
        where: {
            notes: {
                some: {}
            }
        }
    });

    console.log(`\n   📝 Leads with restored history: ${leadsWithNotes.length}`);
    console.log(`   📝 Total notes restored: ${leadsWithNotes.reduce((sum, lead) => sum + lead._count.notes, 0)}\n`);
}

async function main() {
    try {
        console.log('🚀 Starting TikTok Qualified Leads Import from Excel - November 2025\n');
        console.log('='.repeat(70) + '\n');

        // Step 1: Backup existing leads
        const backup = await backupExistingLeads();

        // Step 2: Clear ALL old leads
        await clearOldLeads();

        // Step 3: Import qualified leads from Excel
        const excelPath = path.join(process.cwd(), 'Tiktok-Leads.xlsx');

        if (!fs.existsSync(excelPath)) {
            throw new Error(`Excel file not found: ${excelPath}`);
        }

        await importLeadsFromExcel(excelPath, backup);

        // Step 4: Show summary
        await showSummary();

        console.log('='.repeat(70));
        console.log('✨ Import completed successfully!\n');

    } catch (error) {
        console.error('❌ Error during import:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main()
    .then(() => {
        console.log('✅ Script finished successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
