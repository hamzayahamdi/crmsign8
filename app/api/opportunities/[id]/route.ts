"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize Supabase client for client stage updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/opportunities/[id]
 * Get a specific opportunity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    try {
      verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        contact: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    return NextResponse.json(opportunity);

  } catch (error) {
    console.error('Error fetching opportunity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch opportunity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/opportunities/[id]
 * Update an opportunity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { titre, type, statut, budget, description, architecteAssigne, dateClotureAttendue, pipelineStage, notes } = body;

    // Get current opportunity to track changes
    const current = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (titre !== undefined) updateData.titre = titre;
    if (type !== undefined) updateData.type = type;
    if (statut !== undefined) updateData.statut = statut;
    if (budget !== undefined) updateData.budget = budget ? parseFloat(budget) : null;
    if (description !== undefined) updateData.description = description;
    if (architecteAssigne !== undefined) updateData.architecteAssigne = architecteAssigne;
    if (dateClotureAttendue !== undefined) {
      updateData.dateClotureAttendue = dateClotureAttendue ? new Date(dateClotureAttendue) : null;
    }
    if (pipelineStage !== undefined) updateData.pipelineStage = pipelineStage;
    if (notes !== undefined) updateData.notes = notes;

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        contact: true,
      },
    });

    // 🎯 AUTOMATIC CLIENT TAG MANAGEMENT LOGIC
    // 1. When opportunity is marked as "acompte_recu", ensure contact tag is 'client'
    const isAcompteRecu = pipelineStage === 'acompte_recu' || (pipelineStage === undefined && current.pipelineStage === 'acompte_recu')
    const becameAcompteRecu = pipelineStage === 'acompte_recu' && current.pipelineStage !== 'acompte_recu'
    
    if (isAcompteRecu && (becameAcompteRecu || opportunity.contact.tag !== 'client')) {
      try {
        await prisma.contact.update({
          where: { id: current.contactId },
          data: {
            tag: 'client',
            clientSince: opportunity.contact.clientSince || new Date(),
          },
        });
        console.log(`[Update Opportunity] ✅ Contact ${current.contactId} tagged as 'client' (has acompte_recu opportunity)`);
      } catch (err) {
        console.error('Error updating contact tag to client:', err);
      }
    }

    // 2. When opportunity is marked as "perdu" (lost), check if all opportunities are lost
    const isLost = statut === 'lost' || pipelineStage === 'perdue'
    const becameLost = (statut === 'lost' && current.statut !== 'lost') || (pipelineStage === 'perdue' && current.pipelineStage !== 'perdue')
    
    if (isLost && becameLost) {
      try {
        // Get all opportunities for this contact (including the one we just updated)
        const allOpportunities = await prisma.opportunity.findMany({
          where: { contactId: current.contactId },
        });

        // Check if there's at least one active opportunity with acompte_recu
        // Use the updated opportunity's new status for the current opportunity
        const finalPipelineStage = pipelineStage !== undefined ? pipelineStage : opportunity.pipelineStage
        const finalStatut = statut !== undefined ? statut : opportunity.statut
        
        const hasActiveAcompteRecu = allOpportunities.some((opp: any) => {
          // For the opportunity we just updated, use the new values
          const oppPipelineStage = opp.id === id ? finalPipelineStage : opp.pipelineStage
          const oppStatut = opp.id === id ? finalStatut : opp.statut
          
          const isAcompteRecu = oppPipelineStage === 'acompte_recu'
          const isWon = oppStatut === 'won' || oppPipelineStage === 'gagnee'
          const isLost = oppStatut === 'lost' || oppPipelineStage === 'perdue'
          
          return isAcompteRecu && !isWon && !isLost
        })

        // If no active opportunities with acompte_recu, remove client tag
        if (!hasActiveAcompteRecu && opportunity.contact.tag === 'client') {
          await prisma.contact.update({
            where: { id: current.contactId },
            data: {
              tag: 'converted', // Change back to 'converted' or another non-client tag
            },
          });
          console.log(`[Update Opportunity] ✅ Contact ${current.contactId} tag removed (all opportunities are lost/won, no active acompte_recu)`);
          
          // Log to timeline
          await prisma.timeline.create({
            data: {
              contactId: current.contactId,
              eventType: 'status_changed',
              title: 'Contact retiré de la liste des clients',
              description: `Toutes les opportunités sont perdues/gagnées. Le contact a été retiré de la liste des clients actifs.`,
              metadata: {
                previousTag: 'client',
                newTag: 'converted',
                triggeredByOpportunity: opportunity.id,
              },
              author: decoded.userId,
            },
          });
        }
      } catch (err) {
        console.error('Error checking/updating contact tag after opportunity loss:', err);
      }
    }

    // 3. When an opportunity is marked as "won", check if this is the first won opportunity
    // If yes, automatically convert the contact to "client" status
    if (statut === 'won' && statut !== current.statut) {
      try {
        // Count total won opportunities for this contact
        const wonOpportunitiesCount = await prisma.opportunity.count({
          where: {
            contactId: current.contactId,
            statut: 'won',
          },
        });

        // If this is the first won opportunity, convert contact to client
        if (wonOpportunitiesCount === 1) {
          await prisma.contact.update({
            where: { id: current.contactId },
            data: {
              tag: 'client',
              clientSince: new Date(),
            },
          });

          // Log the contact conversion to timeline
          await prisma.timeline.create({
            data: {
              contactId: current.contactId,
              eventType: 'status_changed',
              title: '🎉 Contact converti en Client',
              description: `Le contact a été automatiquement converti en client suite à la première opportunité gagnée: "${opportunity.titre}"`,
              metadata: {
                previousTag: opportunity.contact.tag,
                newTag: 'client',
                triggeredByOpportunity: opportunity.id,
              },
              author: decoded.userId,
            },
          });
        }
      } catch (conversionErr) {
        console.error('Error converting contact to client:', conversionErr);
        // Continue even if conversion fails - the opportunity status was already updated
      }
    }

    // Log changes to timeline
    if (statut && statut !== current.statut) {
      const eventTypeMap: any = {
        won: 'opportunity_won',
        lost: 'opportunity_lost',
        on_hold: 'opportunity_on_hold',
      };

      try {
        await prisma.timeline.create({
          data: {
            contactId: current.contactId,
            opportunityId: current.id,
            eventType: eventTypeMap[statut] || 'status_changed',
            title: `Opportunité: ${statut === 'won' ? '✅ Gagnée' : statut === 'lost' ? '❌ Perdue' : '⏸ Suspendue'}`,
            description: `Statut changé de "${current.statut}" à "${statut}"${pipelineStage && pipelineStage !== current.pipelineStage ? `, Pipeline: "${current.pipelineStage}" → "${pipelineStage}"` : ''}`,
            metadata: {
              previousStatus: current.statut,
              newStatus: statut,
              previousPipelineStage: current.pipelineStage,
              newPipelineStage: pipelineStage || current.pipelineStage,
            },
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating status change timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    // Log pipeline stage changes separately if only pipeline stage changed (without status change)
    if (pipelineStage && pipelineStage !== current.pipelineStage && (!statut || statut === current.statut)) {
      try {
        const stageLabels: Record<string, string> = {
          prise_de_besoin: 'Prise de besoin',
          projet_accepte: 'Projet Accepté',
          acompte_recu: 'Acompte Reçu',
          gagnee: 'Gagnée',
          perdue: 'Perdue',
        };

        await prisma.timeline.create({
          data: {
            contactId: current.contactId,
            opportunityId: current.id,
            eventType: 'status_changed',
            title: `Pipeline: ${stageLabels[pipelineStage] || pipelineStage}`,
            description: `Étape pipeline changée de "${stageLabels[current.pipelineStage] || current.pipelineStage}" à "${stageLabels[pipelineStage] || pipelineStage}"`,
            metadata: {
              previousPipelineStage: current.pipelineStage,
              newPipelineStage: pipelineStage,
            },
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating pipeline stage change timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    // 🎯 UPDATE CLIENT STAGE WHEN OPPORTUNITY IS MARKED AS LOST
    // When opportunity is marked as "lost" with pipelineStage "perdue", 
    // update the client's statutProjet to "refuse" and create history entry
    // Check if either status changed to lost OR pipeline stage changed to perdue
    const isMarkedAsLost = (statut === 'lost' && statut !== current.statut) || 
                           (pipelineStage === 'perdue' && pipelineStage !== current.pipelineStage && statut === 'lost');
    
    if (isMarkedAsLost) {
      try {
        if (!supabaseUrl || !supabaseServiceKey) {
          console.warn('[Update Opportunity] Supabase not configured, skipping client stage update');
        } else {
          const clientId = `${current.contactId}-${current.id}`;
          const now = new Date().toISOString();
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Get user name for history
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { name: true, email: true },
          });
          const changedBy = user?.name || user?.email || decoded.userId;

          console.log('[Update Opportunity] Updating client stage to "refuse" for client:', clientId);

          // Get current client status
          let currentClientStatus = 'nouveau';
          const { data: clientData } = await supabase
            .from('clients')
            .select('statut_projet')
            .eq('id', clientId)
            .single();

          if (clientData?.statut_projet) {
            currentClientStatus = clientData.statut_projet;
          }

          // Update client's statut_projet to "refuse"
          const { error: clientUpdateError } = await supabase
            .from('clients')
            .upsert({
              id: clientId,
              statut_projet: 'refuse',
              derniere_maj: now,
              updated_at: now,
            }, {
              onConflict: 'id',
            });

          if (clientUpdateError) {
            console.error('[Update Opportunity] Error updating client status:', clientUpdateError);
          } else {
            console.log('[Update Opportunity] ✅ Client status updated to "refuse"');

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
                description: `Opportunité marquée comme perdue: "${opportunity.titre}". Statut changé de "${fromLabel}" vers "${toLabel}"`,
                auteur: changedBy,
                previous_status: currentClientStatus,
                new_status: 'refuse',
                timestamp_start: now,
                created_at: now,
                updated_at: now,
              });

            if (historiqueError) {
              console.error('[Update Opportunity] Error creating historique entry:', historiqueError);
            } else {
              console.log('[Update Opportunity] ✅ Historique entry created');

              // Also create client_stage_history entry for better traceability
              const stageHistoryId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
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
              const { error: stageHistoryError } = await supabase
                .from('client_stage_history')
                .insert({
                  id: stageHistoryId,
                  client_id: clientId,
                  stage_name: 'refuse',
                  started_at: now,
                  ended_at: null,
                  duration_seconds: null,
                  changed_by: changedBy,
                  created_at: now,
                  updated_at: now,
                });

              if (stageHistoryError) {
                console.error('[Update Opportunity] Error creating stage history entry:', stageHistoryError);
              } else {
                console.log('[Update Opportunity] ✅ Stage history entry created');
              }
            }
          }
        }
      } catch (clientUpdateErr) {
        console.error('[Update Opportunity] Error updating client stage:', clientUpdateErr);
        // Continue even if client update fails - the opportunity status was already updated
      }
    }

    if (Object.keys(updateData).length > 0 && (!statut || statut === current.statut)) {
      try {
        await prisma.timeline.create({
          data: {
            contactId: current.contactId,
            opportunityId: current.id,
            eventType: 'status_changed',
            title: 'Opportunité mise à jour',
            description: `Modifications: ${Object.keys(updateData).join(', ')}`,
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating update timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    return NextResponse.json(opportunity);

  } catch (error) {
    console.error('Error updating opportunity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update opportunity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opportunities/[id]
 * Delete an opportunity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    await prisma.opportunity.delete({
      where: { id },
    });

    // Log deletion
    try {
      await prisma.timeline.create({
        data: {
          contactId: opportunity.contactId,
          opportunityId: id,
          eventType: 'other',
          title: 'Opportunité supprimée',
          description: `L'opportunité "${opportunity.titre}" a été supprimée`,
          author: decoded.userId,
        },
      });
    } catch (timelineErr) {
      console.error('Error creating deletion timeline entry:', timelineErr);
      // Continue even if timeline creation fails
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting opportunity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete opportunity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
