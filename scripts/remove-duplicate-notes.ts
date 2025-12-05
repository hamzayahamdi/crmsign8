import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script: Remove Duplicate Lead Notes
 * 
 * This script removes duplicate notes from leads by:
 * 1. Finding all leads with notes
 * 2. Grouping notes by content (case-insensitive)
 * 3. Keeping only the oldest note for each unique content
 * 4. Deleting all duplicate notes
 */

async function removeDuplicateNotes() {
    console.log('🔍 Finding and removing duplicate lead notes...\n');
    console.log('='.repeat(70) + '\n');

    try {
        // Get all leads with their notes
        const leads = await prisma.lead.findMany({
            include: {
                notes: {
                    orderBy: {
                        createdAt: 'asc' // Oldest first
                    }
                }
            }
        });

        console.log(`📊 Found ${leads.length} leads to check\n`);

        let totalDuplicatesRemoved = 0;
        let leadsWithDuplicates = 0;

        for (const lead of leads) {
            if (lead.notes.length === 0) continue;

            // Group notes by normalized content
            const notesByContent = new Map<string, typeof lead.notes>();

            for (const note of lead.notes) {
                const normalizedContent = note.content.trim().toLowerCase();

                if (!notesByContent.has(normalizedContent)) {
                    notesByContent.set(normalizedContent, []);
                }
                notesByContent.get(normalizedContent)!.push(note);
            }

            // Find duplicates
            const duplicatesToDelete: string[] = [];

            for (const [content, notes] of notesByContent.entries()) {
                if (notes.length > 1) {
                    // Keep the first (oldest) note, delete the rest
                    const [keep, ...remove] = notes;
                    duplicatesToDelete.push(...remove.map(n => n.id));

                    if (duplicatesToDelete.length > 0) {
                        console.log(`   📝 Lead: ${lead.nom}`);
                        console.log(`      Duplicate found: "${notes[0].content}"`);
                        console.log(`      Keeping oldest (${keep.createdAt.toISOString()})`);
                        console.log(`      Removing ${remove.length} duplicate(s)\n`);
                    }
                }
            }

            // Delete duplicates for this lead
            if (duplicatesToDelete.length > 0) {
                await prisma.leadNote.deleteMany({
                    where: {
                        id: {
                            in: duplicatesToDelete
                        }
                    }
                });

                totalDuplicatesRemoved += duplicatesToDelete.length;
                leadsWithDuplicates++;
            }
        }

        console.log('='.repeat(70));
        console.log('\n✅ Cleanup Complete!\n');
        console.log(`   📊 Leads checked: ${leads.length}`);
        console.log(`   🔧 Leads with duplicates: ${leadsWithDuplicates}`);
        console.log(`   🗑️  Total duplicates removed: ${totalDuplicatesRemoved}\n`);

        // Show updated stats
        const totalNotes = await prisma.leadNote.count();
        console.log(`   📝 Total notes remaining: ${totalNotes}\n`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
removeDuplicateNotes()
    .then(() => {
        console.log('✅ Script finished successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
