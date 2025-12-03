"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/opportunities
 * Get all opportunities with optional filtering
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const pipelineStage = searchParams.get('pipelineStage');
    const contactId = searchParams.get('contactId');
    const type = searchParams.get('type');
    const architecteAssigne = searchParams.get('architecteAssigne');

    // Build where clause
    const whereClause: any = {};

    if (status) whereClause.statut = status;
    if (pipelineStage) whereClause.pipelineStage = pipelineStage;
    if (contactId) whereClause.contactId = contactId;
    if (type) whereClause.type = type;
    if (architecteAssigne) whereClause.architecteAssigne = architecteAssigne;

    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      include: {
        contact: {
          select: {
            id: true,
            nom: true,
            telephone: true,
            email: true,
            ville: true,
            tag: true,
            status: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(opportunities);

  } catch (error) {
    console.error('Error fetching opportunities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch opportunities';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      contactId,
      titre,
      type,
      statut = 'open',
      pipelineStage = 'prise_de_besoin',
      budget,
      description,
      architecteAssigne,
      dateClotureAttendue,
      notes
    } = body;

    // Validate required fields
    if (!contactId || !titre || !type) {
      return NextResponse.json(
        { error: 'Les champs contactId, titre et type sont requis' },
        { status: 400 }
      );
    }

    // Verify the contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact non trouvé' },
        { status: 404 }
      );
    }

    // Create the opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        contactId,
        titre,
        type,
        statut,
        pipelineStage,
        budget: budget ? parseFloat(budget) : null,
        description: description || null,
        architecteAssigne: architecteAssigne || null,
        dateClotureAttendue: dateClotureAttendue ? new Date(dateClotureAttendue) : null,
        notes: notes || null,
        createdBy: decoded.userId
      },
      include: {
        contact: true
      }
    });

    // Log the creation in timeline
    try {
      await prisma.timeline.create({
        data: {
          contactId: contactId,
          opportunityId: opportunity.id,
          eventType: 'opportunity_created',
          title: 'Nouvelle opportunité créée',
          description: `Opportunité "${titre}" créée avec un budget de ${budget ? `${budget} DH` : 'non spécifié'}`,
          metadata: {
            opportunityType: type,
            budget: budget ? parseFloat(budget) : null,
            pipelineStage: pipelineStage
          },
          author: decoded.userId
        }
      });
    } catch (timelineErr) {
      console.error('Error creating timeline entry:', timelineErr);
      // Continue even if timeline creation fails
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
