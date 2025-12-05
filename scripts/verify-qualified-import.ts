import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyImport() {
    console.log('🔍 Verifying Qualified Leads Import...\n');
    console.log('='.repeat(70) + '\n');

    try {
        // Get total count
        const totalLeads = await prisma.lead.count();
        console.log(`📊 Total Leads in Database: ${totalLeads}\n`);

        // Get leads by status
        const byStatus = await prisma.lead.groupBy({
            by: ['statut'],
            _count: true,
        });

        console.log('📈 Leads by Status:');
        byStatus.forEach((group: any) => {
            console.log(`   ${group.statut}: ${group._count}`);
        });
        console.log('');

        // Get leads by architect
        const byArchitect = await prisma.lead.groupBy({
            by: ['assignePar'],
            _count: true,
        });

        console.log('👥 Leads by Architect:');
        byArchitect.sort((a: any, b: any) => b._count - a._count);
        byArchitect.forEach((group: any) => {
            console.log(`   ${group.assignePar}: ${group._count} leads`);
        });
        console.log('');

        // Get sample leads for each architect
        console.log('📋 Sample Leads per Architect:\n');

        for (const arch of byArchitect) {
            const sampleLeads = await prisma.lead.findMany({
                where: {
                    assignePar: arch.assignePar
                },
                take: 3,
                include: {
                    notes: true
                }
            });

            console.log(`   ${arch.assignePar} (${arch._count} total):`);
            sampleLeads.forEach(lead => {
                console.log(`      - ${lead.nom} (${lead.telephone}) - ${lead.ville}`);
                console.log(`        Notes: ${lead.notes.length} | Status: ${lead.statut}`);
            });
            console.log('');
        }

        // Get leads with most notes
        const leadsWithNotes = await prisma.lead.findMany({
            include: {
                _count: {
                    select: { notes: true }
                }
            },
            orderBy: {
                notes: {
                    _count: 'desc'
                }
            },
            take: 5
        });

        console.log('📝 Top 5 Leads with Most History:\n');
        leadsWithNotes.forEach((lead: any, index) => {
            console.log(`   ${index + 1}. ${lead.nom} - ${lead._count.notes} notes`);
        });
        console.log('');

        // Verify campaign
        const byCampaign = await prisma.lead.groupBy({
            by: ['campaignName'],
            _count: true,
        });

        console.log('🎯 Leads by Campaign:');
        byCampaign.forEach((group: any) => {
            console.log(`   ${group.campaignName}: ${group._count}`);
        });
        console.log('');

        // Verify priority
        const byPriority = await prisma.lead.groupBy({
            by: ['priorite'],
            _count: true,
        });

        console.log('⭐ Leads by Priority:');
        byPriority.forEach((group: any) => {
            console.log(`   ${group.priorite}: ${group._count}`);
        });
        console.log('');

        // Get total notes count
        const totalNotes = await prisma.leadNote.count();
        console.log(`📝 Total Notes in Database: ${totalNotes}\n`);

        console.log('='.repeat(70));
        console.log('✅ Verification Complete!\n');

    } catch (error) {
        console.error('❌ Error during verification:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

verifyImport()
    .then(() => {
        console.log('✅ Verification finished successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });
