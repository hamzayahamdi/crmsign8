import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

const prisma = new PrismaClient();

/**
 * Script: Import TikTok Leads from CSV - November 2025 Campaign
 * 
 * This script:
 * 1. Backs up ALL existing lead data with complete history (notes, calls)
 * 2. Clears ALL old lead data
 * 3. Reads from CSV file (Tiktok-Leads-november-qualifed.csv)
 * 4. Imports ALL leads from the CSV with proper status mapping
 * 5. Assigns each lead to their designated architect
 * 6. Sets default architect to "Mohamed" (gestionnaire_projet) for unassigned leads
 * 7. Maps status from CSV to proper LeadStatus enum values
 * 8. Sets campaignName to "TikTok - Novembre 2025"
 * 9. Preserves history for leads that existed before (matched by phone)
 * 10. Imports call history (Called on, Deuxième appel, 3 éme appel) as notes
 * 11. Imports notes from CSV
 * 12. Tracks message sending status (WhatsApp)
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
    console.log('📦 Backing up ALL existing leads with their complete history...\n');

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

async function importLeadsFromCSV(csvPath: string, backup: LeadBackup[]): Promise<void> {
    console.log('📥 Reading CSV file and importing leads...\n');

    return new Promise<void>((resolve, reject) => {
        const records: any[] = [];

        // Read CSV file using streaming
        fs.createReadStream(csvPath)
            .pipe(csvParser())
            .on('data', (row) => {
                records.push(row);
            })
            .on('end', async () => {
                console.log(`   Found ${records.length} total records in CSV\n`);

                let imported = 0;
                let skipped = 0;
                let errors = 0;
                const architectCounts: Record<string, number> = {};
                const statusCounts: Record<string, number> = {};

                for (const record of records) {
                    try {
                        // CSV structure from Tiktok-Leads-november-qualifed.csv:
                        // Nom et Prénom, Numéro de téléphone, Type de Bien, Ville, 
                        // Called on, Deuxième appel, 3 éme appel, Statut, Note, Assigné à, Message envoyer

                        const nom = (record['Nom et Prénom'] || '').trim();
                        const telephone = (record['Numéro de téléphone'] || '').trim();
                        const typeBien = (record['Type de Bien'] || 'Appartement').trim();
                        const ville = (record['Ville'] || '').trim();
                        const calledOn = (record['Called on'] || '').trim();
                        const deuxiemeAppel = (record['Deuxième appel'] || '').trim();
                        const troisiemeAppel = (record['3 éme appel'] || '').trim();
                        const statutDetaille = (record['Statut'] || '').trim();
                        const note = (record['Note'] || '').trim();
                        const assigneA = (record['Assigné à'] || '').trim();
                        const messageEnvoyer = (record['Message envoyer'] || '').trim();

                        // Skip empty rows
                        if (!nom || !telephone) {
                            skipped++;
                            continue;
                        }

                        // Clean and normalize data
                        const cleanedPhone = cleanPhoneNumber(telephone);
                        if (!cleanedPhone || cleanedPhone.length < 10) {
                            console.log(`   ⚠️  Skipping ${nom} - invalid phone: ${telephone}`);
                            skipped++;
                            continue;
                        }

                        const normalizedCity = normalizeCity(ville);
                        const normalizedType = normalizePropertyType(typeBien);

                        // Map status from CSV to our LeadStatus enum
                        let statut: string = 'nouveau';
                        const statutLower = statutDetaille.toLowerCase();

                        if (statutLower.includes('qualifié') || statutLower.includes('qualifie')) {
                            statut = 'qualifie';
                        } else if (statutLower.includes('recontacter') || statutLower.includes('à recontacter') || statutLower.includes('suivre')) {
                            statut = 'a_recontacter';
                        } else if (statutLower.includes('sans réponse') || statutLower.includes('sans reponse')) {
                            statut = 'sans_reponse';
                        } else if (statutLower.includes('non intéressé') || statutLower.includes('non interesse')) {
                            statut = 'non_interesse';
                        } else if (statutLower.includes('refusé') || statutLower.includes('refuse')) {
                            statut = 'refuse';
                        }

                        // Architect assignment - default to "Mohamed" (gestionnaire_projet) if not assigned
                        let architect = assigneA || 'Mohamed';

                        // Normalize architect names
                        const architectMap: Record<string, string> = {
                            'amina': 'Amina',
                            'hiba': 'Hiba',
                            'sanae': 'Sanae',
                            'israe': 'Israe',
                            'karima': 'Karima',
                            'mohamed': 'Mohamed',
                            'tazi': 'TAZI',
                            'kawter': 'Kawter',
                        };

                        const architectLower = architect.toLowerCase();
                        architect = architectMap[architectLower] || architect || 'Mohamed';

                        // Track counts
                        architectCounts[architect] = (architectCounts[architect] || 0) + 1;
                        statusCounts[statut] = (statusCounts[statut] || 0) + 1;

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
                                statut: statut as any,
                                statutDetaille: statutDetaille || statut,
                                message: messageEnvoyer || null,
                                assignePar: architect,
                                source: 'tiktok',
                                priorite: 'moyenne',
                                month: 'Novembre',
                                campaignName: 'TikTok - Novembre 2025',
                                uploadedAt: new Date(),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }
                        });

                        // Create notes from call history and notes
                        const notesToCreate: Array<{ content: string; author: string; createdAt: Date }> = [];

                        // Add call history as notes
                        if (calledOn) {
                            notesToCreate.push({
                                content: `📞 Premier appel: ${calledOn}`,
                                author: architect,
                                createdAt: parseCallDate(calledOn) || new Date(),
                            });
                        }
                        if (deuxiemeAppel) {
                            notesToCreate.push({
                                content: `📞 Deuxième appel: ${deuxiemeAppel}`,
                                author: architect,
                                createdAt: parseCallDate(deuxiemeAppel) || new Date(),
                            });
                        }
                        if (troisiemeAppel) {
                            notesToCreate.push({
                                content: `📞 Troisième appel: ${troisiemeAppel}`,
                                author: architect,
                                createdAt: parseCallDate(troisiemeAppel) || new Date(),
                            });
                        }

                        // Add note from CSV
                        if (note) {
                            notesToCreate.push({
                                content: `📝 Note: ${note}`,
                                author: architect,
                                createdAt: new Date(),
                            });
                        }

                        // Add message sent note
                        if (messageEnvoyer && messageEnvoyer.toLowerCase() === 'oui') {
                            notesToCreate.push({
                                content: `✉️ Message WhatsApp envoyé`,
                                author: architect,
                                createdAt: new Date(),
                            });
                        }

                        // If lead existed before, restore its previous history first
                        if (previousLead && previousLead.notes.length > 0) {
                            console.log(`   📝 Restoring ${previousLead.notes.length} previous notes for ${nom}`);
                            for (const oldNote of previousLead.notes) {
                                await prisma.leadNote.create({
                                    data: {
                                        leadId: newLead.id,
                                        content: oldNote.content,
                                        author: oldNote.author,
                                        createdAt: oldNote.createdAt,
                                    }
                                });
                            }
                        }

                        // Create new notes from CSV
                        for (const noteData of notesToCreate) {
                            await prisma.leadNote.create({
                                data: {
                                    leadId: newLead.id,
                                    content: noteData.content,
                                    author: noteData.author,
                                    createdAt: noteData.createdAt,
                                }
                            });
                        }

                        imported++;

                        if (imported % 50 === 0) {
                            console.log(`   ✅ Imported ${imported} leads...`);
                        }

                    } catch (error) {
                        console.error(`   ❌ Error importing lead: ${error}`);
                        errors++;
                    }
                }

                console.log(`\n✅ Import complete!`);
                console.log(`   ✅ Imported: ${imported} leads`);
                console.log(`   ⏭️  Skipped: ${skipped} rows`);
                console.log(`   ❌ Errors: ${errors}`);

                console.log(`\n👥 Leads per Architect:`);
                Object.entries(architectCounts)
                    .sort(([, a], [, b]) => b - a)
                    .forEach(([architect, count]) => {
                        console.log(`   ${architect}: ${count} leads`);
                    });

                console.log(`\n📊 Leads per Status:`);
                Object.entries(statusCounts)
                    .sort(([, a], [, b]) => b - a)
                    .forEach(([status, count]) => {
                        console.log(`   ${status}: ${count} leads`);
                    });
                console.log('');

                resolve();
            })
            .on('error', (error) => {
                console.error('❌ Error reading CSV:', error);
                reject(error);
            });
    });
}

// Helper function to parse call dates from CSV (format: DD/MM/YYYY)
function parseCallDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;

    try {
        // Expected format: DD/MM/YYYY or D/M/YYYY
        const parts = dateStr.trim().split('/');
        if (parts.length !== 3) return null;

        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2], 10);

        // If year is 2-digit, assume 2025
        const fullYear = year < 100 ? 2000 + year : year;

        const date = new Date(fullYear, month, day);

        // Validate the date
        if (isNaN(date.getTime())) return null;

        return date;
    } catch (error) {
        return null;
    }
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
    byStatus.forEach((group: any) => {
        console.log(`      ${group.statut}: ${group._count}`);
    });

    // Group by architect
    const byArchitect = await prisma.lead.groupBy({
        by: ['assignePar'],
        _count: true,
    });

    console.log('\n   👤 By Architect:');
    byArchitect.forEach((group: any) => {
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
    byCity.forEach((group: any) => {
        console.log(`      ${group.ville}: ${group._count}`);
    });

    // Campaign info
    const byCampaign = await prisma.lead.groupBy({
        by: ['campaignName'],
        _count: true,
    });

    console.log('\n   🎯 By Campaign:');
    byCampaign.forEach((group: any) => {
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
    console.log(`   📝 Total notes restored: ${leadsWithNotes.reduce((sum: number, lead: any) => sum + lead._count.notes, 0)}\n`);
}

async function main() {
    try {
        console.log('🚀 Starting TikTok Leads Import from CSV - November 2025\n');
        console.log('='.repeat(70) + '\n');

        // Step 1: Backup existing leads
        const backup = await backupExistingLeads();

        // Step 2: Clear ALL old leads
        await clearOldLeads();

        // Step 3: Import leads from CSV
        const csvPath = path.join(process.cwd(), 'Tiktok-Leads-november-qualifed.csv');

        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}\n\nPlease make sure the CSV file exists in the project root directory.`);
        }

        await importLeadsFromCSV(csvPath, backup);

        // Step 4: Show summary
        await showSummary();

        console.log('='.repeat(70));
        console.log('✨ Import completed successfully!\n');
        console.log('📋 Check HOW-TO-IMPORT-NOVEMBER-LEADS.md for more info\n');

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
