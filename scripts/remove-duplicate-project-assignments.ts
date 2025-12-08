import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script: Remove Duplicate Project Assignments
 * 
 * This script removes duplicate project assignments by:
 * 1. Finding opportunities that are assigned to an architect both:
 *    - Directly (opportunity.architecteAssigne)
 *    - Through their contact (contact.architecteAssigne)
 * 2. Removing the direct assignment if the contact is also assigned (prefer contact-level assignment)
 * 3. Also checking for duplicate opportunities with same contact + title + budget
 */

async function removeDuplicateProjectAssignments() {
    console.log('🔍 Finding and removing duplicate project assignments...\n');
    console.log('='.repeat(70) + '\n');

    try {
        // Get all opportunities with their contacts
        const opportunities = await prisma.opportunity.findMany({
            where: {
                architecteAssigne: { not: null }
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        nom: true,
                        architecteAssigne: true
                    }
                }
            }
        });

        console.log(`📊 Found ${opportunities.length} opportunities with architect assignments\n`);

        let duplicatesRemoved = 0;
        let opportunitiesToUpdate: { id: string; reason: string }[] = [];

        // Group opportunities by contact
        const opportunitiesByContact = new Map<string, typeof opportunities>();
        
        for (const opp of opportunities) {
            if (!opp.contactId) continue;
            
            if (!opportunitiesByContact.has(opp.contactId)) {
                opportunitiesByContact.set(opp.contactId, []);
            }
            opportunitiesByContact.get(opp.contactId)!.push(opp);
        }

        // Check for duplicates within each contact
        for (const [contactId, opps] of opportunitiesByContact.entries()) {
            if (opps.length <= 1) continue;

            // Group by title + budget to find true duplicates
            const oppsByKey = new Map<string, typeof opps>();
            const oppsByTitle = new Map<string, typeof opps>(); // Also group by title only for aggressive deduplication
            
            for (const opp of opps) {
                const normalizedTitle = (opp.titre || '').trim().toLowerCase().replace(/\s+/g, ' ');
                const key = `${normalizedTitle}-${opp.budget || 0}`;
                const titleKey = normalizedTitle; // Key by title only
                
                if (!oppsByKey.has(key)) {
                    oppsByKey.set(key, []);
                }
                oppsByKey.get(key)!.push(opp);
                
                if (!oppsByTitle.has(titleKey)) {
                    oppsByTitle.set(titleKey, []);
                }
                oppsByTitle.get(titleKey)!.push(opp);
            }

            // Find duplicates by title + budget (exact match)
            for (const [key, duplicateOpps] of oppsByKey.entries()) {
                if (duplicateOpps.length > 1) {
                    // Keep the first one (oldest), mark others for removal
                    const [keep, ...remove] = duplicateOpps.sort((a, b) => 
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );

                    console.log(`   📝 Contact: ${keep.contact.nom}`);
                    console.log(`      Duplicate project: "${keep.titre}" (${keep.budget} MAD)`);
                    console.log(`      Found ${duplicateOpps.length} duplicates`);
                    console.log(`      Keeping oldest (${keep.createdAt.toISOString()})`);
                    console.log(`      Removing ${remove.length} duplicate(s)\n`);

                    // Remove architect assignment from duplicates
                    for (const dup of remove) {
                        if (!opportunitiesToUpdate.find(u => u.id === dup.id)) {
                            opportunitiesToUpdate.push({
                                id: dup.id,
                                reason: `Duplicate of opportunity ${keep.id} (same contact + title + budget)`
                            });
                        }
                    }
                }
            }
            
            // Also find duplicates by title only (more aggressive - for cases like "test iss" with different budgets)
            for (const [titleKey, duplicateOpps] of oppsByTitle.entries()) {
                if (duplicateOpps.length > 1 && titleKey && titleKey.length > 2 && titleKey !== 'autre') {
                    // Keep the first one (oldest), mark others for removal
                    const [keep, ...remove] = duplicateOpps.sort((a, b) => 
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );

                    console.log(`   📝 Contact: ${keep.contact.nom}`);
                    console.log(`      Duplicate project by title: "${keep.titre}"`);
                    console.log(`      Found ${duplicateOpps.length} opportunities with same title`);
                    console.log(`      Keeping oldest (${keep.createdAt.toISOString()})`);
                    console.log(`      Removing ${remove.length} duplicate(s)\n`);

                    // Remove architect assignment from duplicates
                    for (const dup of remove) {
                        if (!opportunitiesToUpdate.find(u => u.id === dup.id)) {
                            opportunitiesToUpdate.push({
                                id: dup.id,
                                reason: `Duplicate of opportunity ${keep.id} (same contact + title: "${titleKey}")`
                            });
                        }
                    }
                }
            }
        }

        // Check for opportunities assigned both directly and through contact
        for (const opp of opportunities) {
            if (!opp.contactId || !opp.contact) continue;
            
            const contact = opp.contact;
            const oppArchitect = opp.architecteAssigne;
            const contactArchitect = contact.architecteAssigne;

            // If both are assigned and they match, remove direct assignment (prefer contact-level)
            if (oppArchitect && contactArchitect && 
                (oppArchitect === contactArchitect || 
                 oppArchitect.toLowerCase() === contactArchitect.toLowerCase())) {
                
                // Check if we haven't already marked this for removal
                if (!opportunitiesToUpdate.find(u => u.id === opp.id)) {
                    opportunitiesToUpdate.push({
                        id: opp.id,
                        reason: `Contact "${contact.nom}" is already assigned to architect, removing duplicate direct assignment`
                    });
                    console.log(`   🔄 Opportunity "${opp.titre}" (${opp.id})`);
                    console.log(`      Contact "${contact.nom}" is assigned to: ${contactArchitect}`);
                    console.log(`      Opportunity is also directly assigned to: ${oppArchitect}`);
                    console.log(`      Removing direct assignment (keeping contact-level assignment)\n`);
                }
            }
        }

        // Update opportunities to remove duplicate assignments
        for (const update of opportunitiesToUpdate) {
            await prisma.opportunity.update({
                where: { id: update.id },
                data: { architecteAssigne: null }
            });
            duplicatesRemoved++;
        }

        console.log('='.repeat(70));
        console.log('\n✅ Cleanup Complete!\n');
        console.log(`   📊 Opportunities checked: ${opportunities.length}`);
        console.log(`   🗑️  Duplicate assignments removed: ${duplicatesRemoved}`);
        console.log(`   ✅ Remaining unique assignments: ${opportunities.length - duplicatesRemoved}\n`);

    } catch (error) {
        console.error('❌ Error removing duplicate assignments:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
removeDuplicateProjectAssignments()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

