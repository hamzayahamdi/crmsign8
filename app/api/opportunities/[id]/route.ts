"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    if (pipelineStage !== undefined) updateData.pipelineStage = pipelineStage;
    if (notes !== undefined) updateData.notes = notes;
    if (dateClotureAttendue !== undefined) {
      updateData.dateClotureAttendue = dateClotureAttendue ? new Date(dateClotureAttendue) : null;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        contact: true,
      },
    });

    // 🎯 AUTOMATIC CLIENT CONVERSION LOGIC
    // When an opportunity is marked as "won", check if this is the first won opportunity
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
            description: `Statut changé de "${current.statut}" à "${statut}"`,
            metadata: {
              previousStatus: current.statut,
              newStatus: statut,
            },
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating status change timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    // Log pipeline stage changes to timeline
    if (pipelineStage && pipelineStage !== current.pipelineStage) {
      const stageLabels: any = {
        prise_de_besoin: '📝 Prise de besoin',
        projet_accepte: '✅ Projet Accepté',
        acompte_recu: '💰 Acompte Reçu',
        gagnee: '🎉 Gagnée',
        perdue: '❌ Perdue',
      };

      try {
        await prisma.timeline.create({
          data: {
            contactId: current.contactId,
            opportunityId: current.id,
            eventType: 'status_changed',
            title: `Pipeline: ${stageLabels[pipelineStage] || pipelineStage}`,
            description: `Étape pipeline changée: ${stageLabels[current.pipelineStage] || current.pipelineStage} → ${stageLabels[pipelineStage] || pipelineStage}`,
            metadata: {
              previousStage: current.pipelineStage,
              newStage: pipelineStage,
            },
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating pipeline stage timeline entry:', timelineErr);
        // Continue even if timeline creation fails
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
