import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Script: Restore Leads from Backup
 * 
 * This script restores leads from the most recent backup file
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

async function restoreFromBackup() {
    try {
        console.log('🔄 Restoring leads from backup...\n');

        // Find the most recent backup file
        const backupDir = path.join(process.cwd(), 'backups');
        const backupFile = path.join(backupDir, 'leads-backup-2025-11-28T16-39-18-037Z.json');

        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }

        // Read backup
        const backupData: LeadBackup[] = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

        console.log(`📦 Found backup with ${backupData.length} leads\n`);

        let restored = 0;

        for (const lead of backupData) {
            // Restore the lead
            const restoredLead = await prisma.lead.create({
                data: {
                    nom: lead.nom,
                    telephone: lead.telephone,
                    ville: lead.ville,
                    typeBien: 'Appartement', // Default, will be updated
                    statut: 'qualifie',
                    statutDetaille: lead.statutDetaille,
                    message: lead.message,
                    assignePar: 'TAZI', // Default
                    source: 'tiktok',
                    priorite: 'moyenne',
                    month: 'Novembre',
                    campaignName: 'TikTok - Novembre 2025',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });

            // Restore notes
            for (const note of lead.notes) {
                await prisma.leadNote.create({
                    data: {
                        leadId: restoredLead.id,
                        content: note.content,
                        author: note.author,
                        createdAt: new Date(note.createdAt),
                    }
                });
            }

            restored++;

            if (restored % 10 === 0) {
                console.log(`   Restored ${restored} leads...`);
            }
        }

        console.log(`\n✅ Restored ${restored} leads successfully!\n`);

    } catch (error) {
        console.error('❌ Error during restore:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restore
restoreFromBackup()
    .then(() => {
        console.log('✅ Restore completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    });
