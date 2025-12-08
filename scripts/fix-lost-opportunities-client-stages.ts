/**
 * Script to fix lost opportunities - Update client stages to "refuse"
 * 
 * This script:
 * 1. Finds all opportunities marked as "lost" or with pipelineStage "perdue"
 * 2. Updates the corresponding client records to have statut_projet = "refuse"
 * 3. Creates historique entries for traceability
 * 4. Creates client_stage_history entries
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixLostOpportunities() {
  console.log('🔧 Starting fix for lost opportunities...\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Find all opportunities that are marked as lost or have pipelineStage perdue
    const lostOpportunities = await prisma.opportunity.findMany({
      where: {
        OR: [
          { statut: 'lost' },
          { pipelineStage: 'perdue' },
        ],
      },
      include: {
        contact: true,
      },
    });

    console.log(`📊 Found ${lostOpportunities.length} lost opportunities\n`);

    if (lostOpportunities.length === 0) {
      console.log('✅ No lost opportunities to fix');
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const opportunity of lostOpportunities) {
      try {
        const clientId = `${opportunity.contactId}-${opportunity.id}`;
        const now = new Date().toISOString();

        console.log(`\n🔍 Processing opportunity: ${opportunity.titre}`);
        console.log(`   Client ID: ${clientId}`);
        console.log(`   Current statut: ${opportunity.statut}`);
        console.log(`   Current pipelineStage: ${opportunity.pipelineStage}`);

        // Get current client status
        let currentClientStatus = 'nouveau';
        const { data: clientData } = await supabase
          .from('clients')
          .select('statut_projet')
          .eq('id', clientId)
          .single();

        if (clientData?.statut_projet) {
          currentClientStatus = clientData.statut_projet;
          console.log(`   Current client status: ${currentClientStatus}`);
        }

        // Skip if already set to refuse
        if (currentClientStatus === 'refuse') {
          console.log(`   ⏭️  Already set to "refuse", skipping...`);
          continue;
        }

        // Update opportunity to ensure it's marked as lost with perdue stage
        if (opportunity.statut !== 'lost' || opportunity.pipelineStage !== 'perdue') {
          console.log(`   🔄 Updating opportunity status...`);
          await prisma.opportunity.update({
            where: { id: opportunity.id },
            data: {
              statut: 'lost',
              pipelineStage: 'perdue',
            },
          });
          console.log(`   ✅ Opportunity updated to lost/perdue`);
        }

        // Update client's statut_projet to "refuse"
        console.log(`   🔄 Updating client status to "refuse"...`);
        
        // Check if client exists
        const { data: existingClient } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        let clientUpdateError;
        
        if (existingClient) {
          // Update existing client
          const { error } = await supabase
            .from('clients')
            .update({
              statut_projet: 'refuse',
              derniere_maj: now,
              updated_at: now,
            })
            .eq('id', clientId);
          clientUpdateError = error;
        } else {
          // Client doesn't exist, we'll skip creating it as it requires many fields
          // The client will be created when they visit the client details page
          console.log(`   ⏭️  Client record doesn't exist, will be created on next visit`);
          // Still create the historique entry so the status is tracked
        }

        if (clientUpdateError) {
          console.error(`   ❌ Error updating client: ${clientUpdateError.message}`);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Client status updated to "refuse"`);

        // Check if historique entry already exists
        const { data: existingHistorique } = await supabase
          .from('historique')
          .select('id')
          .eq('client_id', clientId)
          .eq('type', 'statut')
          .eq('new_status', 'refuse')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!existingHistorique) {
          // Create historique entry for traceability
          const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const statusLabels: Record<string, string> = {
            qualifie: 'Qualifié',
            prise_de_besoin: 'Prise de besoin',
            acompte_recu: 'Acompte reçu',
            conception: 'Conception',
            devis_negociation: 'Devis/Négociation',
            accepte: 'Accepté',
            refuse: 'Refusé',
            perdu: 'Perdu',
          };

          const fromLabel = statusLabels[currentClientStatus] || currentClientStatus;
          const toLabel = statusLabels['refuse'] || 'Refusé';

          const { error: historiqueError } = await supabase
            .from('historique')
            .insert({
              id: historyId,
              client_id: clientId,
              date: now,
              type: 'statut',
              description: `Opportunité marquée comme perdue: "${opportunity.titre}". Statut changé de "${fromLabel}" vers "${toLabel}" (fix automatique)`,
              auteur: 'Système',
              previous_status: currentClientStatus,
              new_status: 'refuse',
              timestamp_start: now,
              created_at: now,
              updated_at: now,
            });

          if (historiqueError) {
            console.error(`   ⚠️  Error creating historique: ${historiqueError.message}`);
          } else {
            console.log(`   ✅ Historique entry created`);
          }
        } else {
          console.log(`   ⏭️  Historique entry already exists, skipping...`);
        }

        // Check if client_stage_history entry exists
        const { data: existingStageHistory } = await supabase
          .from('client_stage_history')
          .select('id')
          .eq('client_id', clientId)
          .eq('stage_name', 'refuse')
          .is('ended_at', null)
          .limit(1)
          .single();

        if (!existingStageHistory) {
          // Close any active stage history entries
          await supabase
            .from('client_stage_history')
            .update({
              ended_at: now,
              updated_at: now,
            })
            .eq('client_id', clientId)
            .is('ended_at', null);

          // Create new stage history entry for "refuse"
          const stageHistoryId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error: stageHistoryError } = await supabase
            .from('client_stage_history')
            .insert({
              id: stageHistoryId,
              client_id: clientId,
              stage_name: 'refuse',
              started_at: now,
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
        } else {
          console.log(`   ⏭️  Stage history entry already exists, skipping...`);
        }

        fixedCount++;
        console.log(`   ✅ Successfully fixed opportunity ${opportunity.id}`);

      } catch (error) {
        console.error(`   ❌ Error processing opportunity ${opportunity.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${lostOpportunities.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixLostOpportunities()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

