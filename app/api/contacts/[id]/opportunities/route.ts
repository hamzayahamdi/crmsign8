"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/contacts/[id]/opportunities
 * Create a new opportunity for a contact
 */
/**
 * POST /api/contacts/[id]/opportunities
 * Create a new opportunity for a contact
 */
export async function POST(
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

    const { id: contactId } = await params;
    const body = await request.json();
    let { titre, type, budget, description, architecteAssigne, dateClotureAttendue } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      );
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { opportunities: true }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // CRITICAL: Ensure titre is never empty - generate default if not provided
    if (!titre || !titre.trim()) {
      const typeLabels: Record<string, string> = {
        villa: 'Villa',
        appartement: 'Appartement',
        magasin: 'Magasin',
        bureau: 'Bureau',
        riad: 'Riad',
        studio: 'Studio',
        renovation: 'Rénovation',
        autre: 'Autre'
      };
      const typeLabel = typeLabels[type] || 'Projet';
      const suffix = contact.ville || contact.nom;
      titre = `${typeLabel}${suffix ? ` - ${suffix}` : ''}`;
      console.log('[Create Opportunity] Auto-generated title:', titre);
    }

    console.log('[Create Opportunity] Creating opportunity:', { titre, type, contactId });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Create opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        contactId,
        titre,
        type: type as any,
        statut: 'open',
        pipelineStage: 'acompte_recu', // Default stage for new opportunities
        budget: budget ? parseFloat(budget) : undefined,
        description: description || undefined,
        architecteAssigne: architecteAssigne || undefined,
        dateClotureAttendue: dateClotureAttendue ? new Date(dateClotureAttendue) : undefined,
        createdBy: decoded.userId,
      },
    });

    // Check if this is the first opportunity (or if contact is not yet a client)
    // The requirement says: Contact becomes Client ONLY IF they have at least 1 opportunity created
    // OR Have Acompte Reçu already done (which is a prerequisite for creating opportunity anyway)

    // We update the contact to be a client if it's not already
    if (contact.tag !== 'client') {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          tag: 'client',
          clientSince: new Date(),
          // We don't change the 'status' field here (it remains 'acompte_recu' or whatever it was)
          // The 'tag' is what determines if they show up in the Clients page
        }
      });

      // Log conversion to client
      await prisma.timeline.create({
        data: {
          contactId,
          eventType: 'status_changed',
          title: 'Contact converti en Client',
          description: 'Le contact est devenu client suite à la création d\'une opportunité',
          metadata: {
            previousTag: contact.tag,
            newTag: 'client'
          },
          author: decoded.userId,
        },
      });
    }

    // Log to timeline - opportunity created
    try {
      await prisma.timeline.create({
        data: {
          contactId,
          opportunityId: opportunity.id,
          eventType: 'opportunity_created',
          title: 'Opportunité créée',
          description: `Opportunité "${titre}" ajoutée au contact`,
          metadata: {
            type: type,
            budget: budget ? parseFloat(budget) : null,
            pipelineStage: 'acompte_recu'
          },
          author: decoded.userId,
        },
      });
    } catch (timelineErr) {
      console.error('Error creating opportunity_created timeline entry:', timelineErr);
      // Continue even if timeline creation fails
    }

    // Log architect assignment if provided
    if (architecteAssigne) {
      try {
        await prisma.timeline.create({
          data: {
            contactId,
            opportunityId: opportunity.id,
            eventType: 'architect_assigned',
            title: 'Architecte assigné',
            description: `${architecteAssigne} assigné à l'opportunité`,
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating architect_assigned timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    return NextResponse.json(opportunity, { status: 201 });

  } catch (error) {
    console.error('Error creating opportunity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create opportunity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/[id]/opportunities
 * Get all opportunities for a contact
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

    const { id: contactId } = await params;
    const opportunities = await prisma.opportunity.findMany({
      where: { contactId },
      include: {
        timeline: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ opportunities });

  } catch (error) {
    console.error('Error fetching opportunities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch opportunities';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
