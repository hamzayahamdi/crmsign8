"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/contacts/convert-lead
 * 
 * Converts a Lead into a Contact only (no automatic Opportunity or Client)
 * Creates audit trail entries in Timeline for conversion and optional architect assignment
 * 
 * Request body:
 * {
 *   leadId: string,
 *   architectId?: string, // Optional architect to assign to the new contact
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   contact: Contact,
 *   timeline: Timeline[],
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // 2. Get user details
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 3. Parse request body
    const body = await request.json();
    const { leadId, architectId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // 4. Get the lead
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 4.5 If architectId provided, look up architect name
    let architecteName: string | undefined = undefined;
    if (architectId) {
      const architect = await prisma.user.findUnique({ where: { id: architectId } });
      if (architect) {
        architecteName = architect.name;
      }
    }

    // 5. Check if already converted
    if (lead.convertedToContactId) {
      return NextResponse.json(
        { error: 'Lead already converted to contact', contactId: lead.convertedToContactId },
        { status: 400 }
      );
    }

    // 6. Create Contact from Lead (no automatic opportunities)
    const contact = await prisma.contact.create({
      data: {
        nom: lead.nom,
        telephone: lead.telephone,
        email: undefined,
        ville: lead.ville,
        adresse: undefined,
        leadId: lead.id,
        architecteAssigne: architecteName || undefined,
        tag: 'converted',
        notes: lead.message || undefined,
        magasin: lead.magasin,
        createdBy: userId,
        convertedBy: userId, // Track who converted the lead
      },
    });

    // 7. Create timeline entries for conversion (and optional architect assignment)
    const timelineEntries: any[] = [];

    const conversionEvent = await prisma.timeline.create({
      data: {
        contactId: contact.id,
        eventType: 'contact_converted_from_lead',
        title: 'Contact créé depuis Lead',
        description: `Lead "${lead.nom}" a été converti en Contact par ${user.name}`,
        metadata: {
          leadId: lead.id,
          leadStatut: lead.statut,
          source: lead.source,
          convertedByUserId: userId,
          convertedByUserName: user.name,
        },
        author: userId,
      },
    });
    timelineEntries.push(conversionEvent);

    if (architectId) {
      const architectEvent = await prisma.timeline.create({
        data: {
          contactId: contact.id,
          eventType: 'architect_assigned',
          title: 'Architecte assigné',
          description: `Architecte assigné au contact`,
          metadata: {
            architectId,
          },
          author: userId,
        },
      });
      timelineEntries.push(architectEvent);
    }

    // 9. Update lead to mark as converted
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        convertedAt: new Date(),
        convertedToContactId: contact.id,
        statut: 'qualifie',
      },
    });

    // 10. Create notification for the assigned architect
    if (architectId) {
      // Send notification to the architect who was assigned
      await prisma.notification.create({
        data: {
          userId: architectId,
          type: 'client_assigned',
          priority: 'high',
          title: 'Nouveau Contact Assigné',
          message: `Le contact "${contact.nom}" vous a été assigné. Téléphone: ${contact.telephone}`,
          linkedType: 'contact',
          linkedId: contact.id,
          linkedName: contact.nom,
          metadata: {
            contactPhone: contact.telephone,
            contactVille: contact.ville,
            convertedFrom: 'lead',
            leadId: lead.id,
          },
          createdBy: userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      contact,
      timeline: timelineEntries,
      message: `${contact.nom} a été converti avec succès en Contact`,
      convertedBy: user.name,
    });

  } catch (error) {
    console.error('Error converting lead:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/convert-lead?leadId=xxx
 * 
 * Preview what will happen when converting a lead
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'leadId query parameter required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { notes: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.convertedToContactId) {
      return NextResponse.json(
        { 
          error: 'Lead already converted',
          convertedContactId: lead.convertedToContactId,
        },
        { status: 400 }
      );
    }

    // Return preview of what will be created
    return NextResponse.json({
      preview: {
        contact: {
          nom: lead.nom,
          telephone: lead.telephone,
          ville: lead.ville,
          tag: 'converted',
        },
        opportunity: {
          titre: `${lead.typeBien} - ${lead.nom}`,
          type: lead.typeBien,
          statut: 'open',
        },
      },
    });

  } catch (error) {
    console.error('Error getting conversion preview:', error);
    return NextResponse.json(
      { error: 'Failed to get preview' },
      { status: 500 }
    );
  }
}
