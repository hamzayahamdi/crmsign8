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

    // 4.5 Determine architect assignment
    let architecteName: string | undefined = undefined;
    let finalArchitectId: string | undefined = architectId;

    if (architectId) {
      // If architectId is explicitly provided, use it
      const architect = await prisma.user.findUnique({ where: { id: architectId } });
      if (architect) {
        architecteName = architect.name;
      }
    } else if (lead.assignePar && lead.assignePar !== "Non assigné") {
      // If no architectId provided, automatically assign to the lead's assignee (gestionnaire de projet)
      architecteName = lead.assignePar;

      // Find the user ID for notification purposes
      const assignedUser = await prisma.user.findFirst({
        where: {
          name: {
            equals: lead.assignePar,
            mode: 'insensitive'
          }
        }
      });

      if (assignedUser) {
        finalArchitectId = assignedUser.id;
      }
    }

    // 5. Check if already converted
    // First check if lead has convertedToContactId set
    if (lead.convertedToContactId) {
      // Verify the contact still exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: lead.convertedToContactId }
      });
      
      if (existingContact) {
        console.log(`[Convert Lead] Lead already converted - returning existing contact:`, {
          leadId: lead.id,
          contactId: lead.convertedToContactId,
          contactNom: existingContact.nom
        });
        return NextResponse.json({
          success: true,
          contact: existingContact,
          message: `Lead "${lead.nom}" was already converted to contact "${existingContact.nom}"`,
          alreadyConverted: true,
        });
      } else {
        // Contact was deleted, allow re-conversion
        console.log(`[Convert Lead] Lead marked as converted but contact doesn't exist - allowing re-conversion`);
      }
    }
    
    // Also check if a contact already exists with this leadId (even if convertedToContactId isn't set)
    const existingContactByLeadId = await prisma.contact.findFirst({
      where: { leadId: lead.id }
    });
    
    if (existingContactByLeadId) {
      console.log(`[Convert Lead] Contact already exists for this leadId:`, {
        leadId: lead.id,
        contactId: existingContactByLeadId.id,
        contactNom: existingContactByLeadId.nom
      });
      
      // Update the lead's convertedToContactId field for consistency
      await prisma.lead.update({
        where: { id: lead.id },
        data: { convertedToContactId: existingContactByLeadId.id }
      });
      
      return NextResponse.json({
        success: true,
        contact: existingContactByLeadId,
        message: `Lead "${lead.nom}" was already converted to contact "${existingContactByLeadId.nom}"`,
        alreadyConverted: true,
      });
    }

    // 6. Create Contact from Lead (no automatic opportunities)
    console.log(`[Convert Lead] Creating contact from lead:`, {
      leadId: lead.id,
      leadNom: lead.nom,
      leadTelephone: lead.telephone,
      architecteName: architecteName || 'none',
      userId: userId,
      userName: user.name,
    });

    // Prepare contact data with campaignName and commercialMagasin
    const contactData: any = {
      nom: lead.nom,
      telephone: lead.telephone,
      email: undefined,
      ville: lead.ville,
      adresse: undefined,
      leadId: lead.id,
      typeBien: lead.typeBien, // Store typeBien directly on contact
      source: lead.source, // Store source directly on contact
      architecteAssigne: architecteName || undefined,
      tag: 'converted',
      status: 'qualifie', // Automatically set to 'qualifie' when converting from lead
      notes: lead.message || undefined,
      magasin: lead.magasin || undefined,
      leadStatus: lead.statut, // Preserve the original lead status for reference
      createdBy: userId,
      convertedBy: userId, // Track who converted the lead
    };

    // Only add campaignName and commercialMagasin if they exist (to avoid null issues)
    if (lead.campaignName) {
      contactData.campaignName = lead.campaignName;
    }
    if (lead.commercialMagasin) {
      contactData.commercialMagasin = lead.commercialMagasin;
    }

    console.log(`[Convert Lead] Creating contact with data:`, {
      nom: contactData.nom,
      source: contactData.source,
      campaignName: contactData.campaignName,
      commercialMagasin: contactData.commercialMagasin,
      magasin: contactData.magasin,
    });

    const contact = await prisma.contact.create({
      data: contactData,
    });

    console.log(`[Convert Lead] ✅ Contact created successfully:`, {
      contactId: contact.id,
      nom: contact.nom,
      telephone: contact.telephone,
      tag: contact.tag,
      architecteAssigne: contact.architecteAssigne,
      leadId: contact.leadId,
      campaignName: (contact as any).campaignName,
      commercialMagasin: (contact as any).commercialMagasin,
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
          typeBien: lead.typeBien,
          leadTypeBien: lead.typeBien,
          leadSource: lead.source,
          convertedByUserId: userId,
          convertedByUserName: user.name,
        },
        author: userId,
      },
    });
    timelineEntries.push(conversionEvent);

    if (finalArchitectId && architecteName) {
      const architectEvent = await prisma.timeline.create({
        data: {
          contactId: contact.id,
          eventType: 'architect_assigned',
          title: 'Gestionnaire assigné',
          description: `${architecteName} a été assigné au contact`,
          metadata: {
            architectId: finalArchitectId,
            architectName: architecteName,
          },
          author: userId,
        },
      });
      timelineEntries.push(architectEvent);
    }

    // 8. Copy all lead notes to unified Note table BEFORE deleting lead
    // This preserves full history and traceability
    try {
      const leadNotes = await prisma.leadNote.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`[Convert Lead] Copying ${leadNotes.length} lead notes to unified Note table...`);

      for (const leadNote of leadNotes) {
        // Create note linked to the contact (preserving lead history)
        await prisma.note.create({
          data: {
            content: leadNote.content,
            author: leadNote.author,
            entityType: 'contact',
            entityId: contact.id,
            sourceType: 'lead', // Original source
            sourceId: lead.id, // Original lead ID
            createdAt: leadNote.createdAt, // Preserve original date
          },
        });
      }

      console.log(`[Convert Lead] ✅ Copied ${leadNotes.length} notes to contact ${contact.id}`);
    } catch (noteError) {
      console.error(`[Convert Lead] ⚠️ Error copying lead notes:`, noteError);
      // Continue even if note copying fails - don't block conversion
    }

    // 9. Update the lead's convertedToContactId field before deleting
    // This ensures consistency if the deletion fails
    await prisma.lead.update({
      where: { id: lead.id },
      data: { convertedToContactId: contact.id }
    });

    // 10. Delete the lead from the database (since it's now a contact)
    // Note: We delete the lead notes first due to foreign key constraints
    // (They're already copied to unified Note table above)
    await prisma.leadNote.deleteMany({
      where: { leadId: lead.id },
    });

    await prisma.lead.delete({
      where: { id: lead.id },
    });
    
    console.log(`[Convert Lead] ✅ Lead ${lead.id} deleted from leads table`);

    // 11. Create notification for the assigned gestionnaire/architect
    if (finalArchitectId && architecteName) {
      // Send notification to the person who was assigned the lead
      await prisma.notification.create({
        data: {
          userId: finalArchitectId,
          type: 'client_assigned',
          priority: 'high',
          title: 'Nouveau Contact Assigné',
          message: `Le contact "${contact.nom}" vous a été assigné depuis le lead. Téléphone: ${contact.telephone}`,
          linkedType: 'contact',
          linkedId: contact.id,
          linkedName: contact.nom,
          metadata: {
            contactPhone: contact.telephone,
            contactVille: contact.ville,
            convertedFrom: 'lead',
            leadId: lead.id,
            previousAssignee: lead.assignePar,
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
    console.error('❌ [Convert Lead] Error converting lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error information
    console.error('❌ [Convert Lead] Error details:', {
      message: errorMessage,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: errorStack,
    });
    
    // Check if it's a Prisma error
    if (errorMessage.includes('campaignName') || errorMessage.includes('commercialMagasin')) {
      console.error('❌ [Convert Lead] Database schema issue detected. Fields may not exist in database.');
      return NextResponse.json(
        { 
          error: 'Database schema error. Please run database migration.',
          details: 'The campaignName or commercialMagasin fields may not exist in the database. Run: npx prisma db push'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to convert lead', 
        details: errorMessage,
        // Include more details in development
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
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
