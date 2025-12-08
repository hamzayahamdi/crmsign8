/**
 * Script to create missing client records for existing opportunities
 * 
 * This script:
 * 1. Finds all opportunities that don't have corresponding client records
 * 2. Creates client records in Supabase with proper stage tracking
 * 3. Creates historique and stage history entries for traceability
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createMissingClientRecords() {
  console.log('🔧 Starting creation of missing client records...\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all opportunities with their contacts
    const opportunities = await prisma.opportunity.findMany({
      include: {
        contact: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${opportunities.length} total opportunities\n`);

    if (opportunities.length === 0) {
      console.log('✅ No opportunities to process');
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Get all existing client IDs from Supabase
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id');

    const existingClientIds = new Set(existingClients?.map(c => c.id) || []);

    for (const opportunity of opportunities) {
      try {
        const clientId = `${opportunity.contactId}-${opportunity.id}`;

        // Skip if client record already exists
        if (existingClientIds.has(clientId)) {
          console.log(`⏭️  Skipping ${opportunity.titre} - client record already exists`);
          skippedCount++;
          continue;
        }

        console.log(`\n🔍 Processing opportunity: ${opportunity.titre}`);
        console.log(`   Client ID: ${clientId}`);
        console.log(`   Pipeline Stage: ${opportunity.pipelineStage}`);
        console.log(`   Status: ${opportunity.statut}`);

        const now = new Date().toISOString();

        // Map pipeline stage to client status
        const stageToStatusMap: Record<string, string> = {
          'prise_de_besoin': 'prise_de_besoin',
          'projet_accepte': 'acompte_recu',
          'acompte_recu': 'acompte_recu',
          'gagnee': 'projet_en_cours',
          'perdue': 'refuse',
        };
        const initialStatus = stageToStatusMap[opportunity.pipelineStage] || 'nouveau';

        // Map opportunity type to project type
        const typeMap: Record<string, string> = {
          villa: 'villa',
          appartement: 'appartement',
          magasin: 'magasin',
          bureau: 'bureau',
          riad: 'riad',
          studio: 'studio',
          renovation: 'autre',
          autre: 'autre',
        };

        // Get architect name
        let architectName = opportunity.contact.architecteAssigne || '';
        if (opportunity.architecteAssigne) {
          try {
            const architect = await prisma.user.findUnique({
              where: { id: opportunity.architecteAssigne },
              select: { name: true },
            });
            if (architect?.name) {
              architectName = architect.name;
            } else {
              architectName = opportunity.architecteAssigne;
            }
          } catch (err) {
            architectName = opportunity.architecteAssigne;
          }
        }

        // Create client record
        console.log(`   🔄 Creating client record with status: ${initialStatus}...`);
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            id: clientId,
            nom: opportunity.contact.nom || 'Client',
            telephone: opportunity.contact.telephone || '',
            ville: opportunity.contact.ville || '',
            email: opportunity.contact.email || null,
            adresse: opportunity.contact.adresse || null,
            architecte_assigne: architectName || '',
            statut_projet: initialStatus,
            type_projet: typeMap[opportunity.type] || 'autre',
            budget: opportunity.budget || 0,
            derniere_maj: now,
            lead_id: opportunity.contact.leadId || null,
            commercial_attribue: opportunity.contact.createdBy || opportunity.createdBy,
            created_at: opportunity.createdAt.toISOString(),
            updated_at: now,
          });

        if (clientError) {
          console.error(`   ❌ Error creating client record: ${clientError.message}`);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Client record created`);

        // Create historique entry
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { error: historiqueError } = await supabase
          .from('historique')
          .insert({
            id: historyId,
            client_id: clientId,
            date: now,
            type: 'statut',
            description: `Opportunité créée: "${opportunity.titre}". Statut initial: ${initialStatus} (créé automatiquement)`,
            auteur: 'Système',
            previous_status: 'nouveau',
            new_status: initialStatus,
            timestamp_start: now,
            created_at: now,
            updated_at: now,
          });

        if (historiqueError) {
          console.error(`   ⚠️  Error creating historique: ${historiqueError.message}`);
        } else {
          console.log(`   ✅ Historique entry created`);
        }

        // Create stage history entry
        const stageHistoryId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { error: stageHistoryError } = await supabase
          .from('client_stage_history')
          .insert({
            id: stageHistoryId,
            client_id: clientId,
            stage_name: initialStatus,
            started_at: opportunity.createdAt.toISOString(),
            ended_at: null,
            duration_seconds: null,
            changed_by: 'Système',
            created_at: now,
            updated_at: now,
          });

        if (stageHistoryError) {
          console.error(`   ⚠️  Error creating stage history: ${stageHistoryError.message}`);
        } else {
          console.log(`   ✅ Stage history entry created`);
        }

        createdCount++;
        console.log(`   ✅ Successfully created client record for opportunity ${opportunity.id}`);

      } catch (error) {
        console.error(`   ❌ Error processing opportunity ${opportunity.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${createdCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${opportunities.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createMissingClientRecords()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

