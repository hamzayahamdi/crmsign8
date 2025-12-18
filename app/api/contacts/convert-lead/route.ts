"use server"

import { prisma } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

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

    console.log(`[Convert Lead] Conversion request received:`, {
      leadId,
      architectId,
      userId,
      userName: user.name,
      userRole: user.role
    });

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // 4. Get the lead
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      // Check if lead was already converted (might have been deleted after conversion)
      const existingContact = await prisma.contact.findFirst({
        where: { leadId: leadId },
        select: { id: true, nom: true, leadId: true, telephone: true, ville: true }
      });
      
      if (existingContact) {
        console.log(`[Convert Lead] Lead ${leadId} not found but contact exists with this leadId:`, existingContact.id);
        return NextResponse.json({ 
          error: 'Lead already converted',
          contactId: existingContact.id,
          contact: existingContact,
          message: `This lead was already converted to contact "${existingContact.nom}"`
        }, { status: 409 }); // 409 Conflict
      }
      
      // Log detailed error for debugging
      console.error(`[Convert Lead] Lead not found and no contact exists with this leadId:`, {
        leadId,
        architectId,
        userId,
        userName: user.name,
        timestamp: new Date().toISOString()
      });
      
      // Try to find any leads with similar IDs for debugging
      const similarLeads = await prisma.lead.findMany({
        where: {
          OR: [
            { id: { contains: leadId.slice(0, 10) } },
            { nom: { contains: leadId.slice(0, 5), mode: 'insensitive' } }
          ]
        },
        select: { id: true, nom: true, telephone: true },
        take: 5
      });
      
      if (similarLeads.length > 0) {
        console.log(`[Convert Lead] Found ${similarLeads.length} similar leads (for debugging):`, similarLeads);
      }
      
      return NextResponse.json({ 
        error: 'Lead not found',
        leadId: leadId,
        message: 'The lead may have been deleted or does not exist. Please check the lead ID.',
        hint: 'The lead might have already been converted and deleted. Check the contacts list.'
      }, { status: 404 });
    }

    // 4.5 Determine architect assignment (optimized: fetch user and architect in parallel)
    let architecteName: string | undefined = undefined;
    let finalArchitectId: string | undefined = architectId;

    // Fetch architect and assigned user in parallel for better performance
    const [architect, assignedUser] = await Promise.all([
      architectId ? prisma.user.findUnique({ where: { id: architectId } }) : Promise.resolve(null),
      lead.assignePar && lead.assignePar !== "Non assigné" 
        ? prisma.user.findFirst({
            where: {
              name: {
                equals: lead.assignePar,
                mode: 'insensitive'
              }
            }
          })
        : Promise.resolve(null)
    ]);

    if (architect) {
      architecteName = architect.name;
    } else if (lead.assignePar && lead.assignePar !== "Non assigné") {
      // If no architectId provided, automatically assign to the lead's assignee (gestionnaire de projet)
      architecteName = lead.assignePar;
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
        contactNom: existingContactByLeadId.nom,
        currentStatus: existingContactByLeadId.status,
        currentLeadStatus: existingContactByLeadId.leadStatus
      });
      
      // CRITICAL: Ensure the existing contact has the correct status
      // Business rule: All contacts converted from leads must have status 'qualifie' and leadStatus 'qualifie'
      if (existingContactByLeadId.status !== 'qualifie' || existingContactByLeadId.leadStatus !== 'qualifie') {
        console.log(`[Convert Lead] ⚠️ Existing contact has incorrect status. Updating to 'qualifie'...`);
        const updatedContact = await prisma.contact.update({
          where: { id: existingContactByLeadId.id },
          data: {
            status: 'qualifie',
            leadStatus: 'qualifie'
          }
        });
        console.log(`[Convert Lead] ✅ Updated existing contact status to 'qualifie'`);
        
        // Update the lead's convertedToContactId field for consistency
        await prisma.lead.update({
          where: { id: lead.id },
          data: { convertedToContactId: updatedContact.id }
        });
        
        return NextResponse.json({
          success: true,
          contact: updatedContact,
          message: `Lead "${lead.nom}" was already converted to contact "${updatedContact.nom}". Status updated to "Qualifié".`,
          alreadyConverted: true,
        });
      }
      
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

    // 6. Update lead status to 'qualifie' BEFORE creating contact
    // This ensures the lead status is updated when converting to contact
    const previousLeadStatus = lead.statut;
    if (lead.statut !== 'qualifie') {
      console.log(`[Convert Lead] Updating lead status from "${previousLeadStatus}" to "qualifie"`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { statut: 'qualifie' }
      });
      console.log(`[Convert Lead] ✅ Lead status updated to "qualifie"`);
    }

    // 7. Create Contact from Lead (no automatic opportunities)
    console.log(`[Convert Lead] Creating contact from lead:`, {
      leadId: lead.id,
      leadNom: lead.nom,
      leadTelephone: lead.telephone,
      leadStatus: 'qualifie', // Lead status is now 'qualifie'
      architecteName: architecteName || 'none',
      userId: userId,
      userName: user.name,
    });

    // Prepare contact data with campaignName and commercialMagasin
    // IMPORTANT: Status must ALWAYS be 'qualifie' when converting from lead to contact
    // This is a business rule: all converted contacts start with "Qualifié" status
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
      status: 'qualifie', // ALWAYS 'qualifie' when converting from lead to contact (REQUIRED BUSINESS RULE)
      notes: lead.message || undefined,
      magasin: lead.magasin || undefined,
      leadStatus: 'qualifie', // ALWAYS 'qualifie' when converting from lead (REQUIRED BUSINESS RULE)
      createdBy: userId,
      convertedBy: userId, // Track who converted the lead
      leadCreatedAt: lead.createdAt, // Store lead creation date BEFORE deleting the lead
    };
    
    // CRITICAL VALIDATION: Force status and leadStatus to 'qualifie' for all converted contacts
    // This ensures the business rule is always enforced, even if something tries to override it
    contactData.status = 'qualifie';
    contactData.leadStatus = 'qualifie';
    
    if (contactData.status !== 'qualifie' || contactData.leadStatus !== 'qualifie') {
      console.error(`[Convert Lead] ❌ CRITICAL: Status validation failed! Forcing both to 'qualifie'. Status: ${contactData.status}, LeadStatus: ${contactData.leadStatus}`);
      contactData.status = 'qualifie';
      contactData.leadStatus = 'qualifie';
    }

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
      status: contactData.status, // Should be 'qualifie'
      tag: contactData.tag, // Should be 'converted'
      typeBien: contactData.typeBien,
      campaignName: contactData.campaignName,
      commercialMagasin: contactData.commercialMagasin,
      magasin: contactData.magasin,
      leadStatus: contactData.leadStatus, // Should be 'qualifie'
    });

    const contact = await prisma.contact.create({
      data: contactData,
    });

    console.log(`[Convert Lead] ✅ Contact created successfully:`, {
      contactId: contact.id,
      nom: contact.nom,
      telephone: contact.telephone,
      tag: contact.tag, // Should be 'converted'
      status: contact.status, // Should be 'qualifie'
      leadStatus: contact.leadStatus, // Should be 'qualifie'
      architecteAssigne: contact.architecteAssigne,
      leadId: contact.leadId,
      typeBien: contact.typeBien,
      campaignName: (contact as any).campaignName,
      commercialMagasin: (contact as any).commercialMagasin,
    });

    // CRITICAL: Verify the contact was actually saved to the database
    // This ensures the contact exists before we proceed with deletion
    const verifyContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      select: { id: true, nom: true, telephone: true, tag: true, status: true, leadStatus: true }
    });

    if (!verifyContact) {
      console.error(`[Convert Lead] ❌ CRITICAL ERROR: Contact ${contact.id} was not found in database after creation!`);
      throw new Error('Contact was not saved to database. Conversion aborted.');
    }

    console.log(`[Convert Lead] ✅ Verified contact exists in database:`, {
      contactId: verifyContact.id,
      nom: verifyContact.nom,
      tag: verifyContact.tag,
      status: verifyContact.status,
      leadStatus: verifyContact.leadStatus
    });

    // 8. Create timeline entries for conversion (and optional architect assignment)
    // Optimized: Create timeline entries in parallel if architect is assigned
    const timelineEntries: any[] = [];

    const timelinePromises = [
      prisma.timeline.create({
        data: {
          contactId: contact.id,
          eventType: 'contact_converted_from_lead',
          title: 'Contact créé depuis Lead',
          description: `Lead "${lead.nom}" a été converti en Contact par ${user.name}. Statut Lead mis à jour à "Qualifié".`,
          metadata: {
            leadId: lead.id,
            leadStatut: 'qualifie', // Updated status
            previousLeadStatut: previousLeadStatus, // Preserve previous status
            source: lead.source,
            typeBien: lead.typeBien,
            leadTypeBien: lead.typeBien,
            leadSource: lead.source,
            convertedByUserId: userId,
            convertedByUserName: user.name,
          },
          author: userId,
        },
      })
    ];

    if (finalArchitectId && architecteName) {
      timelinePromises.push(
        prisma.timeline.create({
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
        })
      );
    }

    const createdTimelineEvents = await Promise.all(timelinePromises);
    timelineEntries.push(...createdTimelineEvents);

    // 9. Copy all lead notes to unified Note table BEFORE deleting lead
    // This preserves full history and traceability
    // Optimized: Batch note creation for better performance
    try {
      const leadNotes = await prisma.leadNote.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' },
      });

      if (leadNotes.length > 0) {
        console.log(`[Convert Lead] Copying ${leadNotes.length} lead notes to unified Note table...`);

        // Create all notes in parallel for better performance
        const notePromises = leadNotes.map(leadNote =>
          prisma.note.create({
            data: {
              content: leadNote.content,
              author: leadNote.author,
              entityType: 'contact',
              entityId: contact.id,
              sourceType: 'lead', // Original source
              sourceId: lead.id, // Original lead ID
              createdAt: leadNote.createdAt, // Preserve original date
            },
          })
        );

        await Promise.all(notePromises);
        console.log(`[Convert Lead] ✅ Copied ${leadNotes.length} notes to contact ${contact.id}`);
      }
    } catch (noteError) {
      console.error(`[Convert Lead] ⚠️ Error copying lead notes:`, noteError);
      // Continue even if note copying fails - don't block conversion
    }

    // 10. Update the lead's convertedToContactId field (status already updated to 'qualifie' in step 6)
    // This ensures consistency if the deletion fails
    await prisma.lead.update({
      where: { id: lead.id },
      data: { convertedToContactId: contact.id }
    });

    // 11. Fetch lead notes BEFORE deleting anything (for notification)
    // CRITICAL: Must fetch BEFORE deleting lead notes or lead
    let leadNotesForNotification: Array<{ content: string; author: string; createdAt: Date }> = [];
    try {
      console.log(`[Convert Lead] 🔍 Fetching lead notes for notification BEFORE deletion - leadId: ${lead.id}`);
      const notesBeforeDeletion = await prisma.leadNote.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' },
        select: {
          content: true,
          author: true,
          createdAt: true,
        },
      });
      
      console.log(`[Convert Lead] Found ${notesBeforeDeletion.length} lead notes in database`);
      
      if (notesBeforeDeletion.length > 0) {
        leadNotesForNotification = notesBeforeDeletion.filter(note => {
          const content = note.content.trim();
          return content.length > 0;
        });
        console.log(`[Convert Lead] ✅ Fetched ${leadNotesForNotification.length} non-empty lead notes for notification`);
        console.log(`[Convert Lead] Notes preview:`, leadNotesForNotification.map(n => ({
          author: n.author,
          contentPreview: n.content.substring(0, 50) + '...',
          createdAt: n.createdAt
        })));
      } else {
        console.log(`[Convert Lead] ℹ️ No lead notes found in database for lead ${lead.id}`);
      }
    } catch (noteFetchError) {
      console.error(`[Convert Lead] ❌ Error fetching lead notes for notification:`, noteFetchError);
    }

    // 11.5. Delete the lead from the database (since it's now a contact)
    // Note: We delete the lead notes first due to foreign key constraints
    // (They're already copied to unified Note table above)
    await prisma.leadNote.deleteMany({
      where: { leadId: lead.id },
    });

    await prisma.lead.delete({
      where: { id: lead.id },
    });
    
    console.log(`[Convert Lead] ✅ Lead ${lead.id} deleted from leads table (status was updated to 'qualifie' before deletion)`);

    // 12. Send comprehensive notifications to the assigned gestionnaire/architect
    // (Platform, WhatsApp, and Email)
    if (finalArchitectId && architecteName) {
      try {
        const { notifyArchitectContactConvertedOrAssigned } = await import('@/lib/notification-service');
        
        console.log(`[Convert Lead] 📤 Sending notification with ${leadNotesForNotification.length} pre-fetched notes`);
        await notifyArchitectContactConvertedOrAssigned(
          finalArchitectId,
          {
            id: contact.id,
            nom: contact.nom,
            telephone: contact.telephone,
            ville: contact.ville,
            email: contact.email,
            typeBien: contact.typeBien,
            source: contact.source,
          },
          {
            convertedFromLead: true,
            leadSource: lead.source,
            leadTypeBien: lead.typeBien,
            previousArchitect: lead.assignePar && lead.assignePar !== "Non assigné" ? lead.assignePar : null,
            createdBy: userId,
            contactId: contact.id, // Pass contactId to fetch notes from unified Note table
            leadId: lead.id, // Pass leadId to fetch notes from LeadNote table before deletion
            leadNotes: leadNotesForNotification, // Pass notes directly to avoid database queries after deletion
          }
        );
        
        console.log(`[Convert Lead] ✅ Comprehensive notifications sent to architect ${architecteName} (${finalArchitectId})`);
      } catch (notificationError) {
        console.error(`[Convert Lead] ⚠️ Error sending notifications to architect:`, notificationError);
        // Don't fail the conversion if notifications fail - log and continue
      }
    }

    // Final verification: Query the contact one more time to ensure it's in the database
    // This helps catch any transaction or database sync issues
    // Also verify it can be found by the contacts API query (check architect filter compatibility)
    const finalVerification = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        opportunities: true,
        timeline: { take: 1, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!finalVerification) {
      console.error(`[Convert Lead] ❌ CRITICAL: Contact ${contact.id} not found in final verification!`);
      return NextResponse.json(
        { 
          error: 'Contact was created but could not be verified in database',
          contactId: contact.id,
          message: 'Please refresh the contacts page to see the converted contact.'
        },
        { status: 500 }
      );
    }

    // Additional verification: Check if contact is queryable with the same filters the contacts API uses
    // This ensures the contact will appear in the contacts list
    const queryableCheck = await prisma.contact.findFirst({
      where: {
        id: contact.id,
        // Simulate the contacts API query conditions
        ...(user.role?.toLowerCase() === 'architect' && finalVerification.architecteAssigne
          ? { architecteAssigne: user.name }
          : {}),
      },
      select: { id: true, nom: true, tag: true, status: true, architecteAssigne: true }
    });

    if (!queryableCheck && user.role?.toLowerCase() === 'architect') {
      console.warn(`[Convert Lead] ⚠️ WARNING: Contact ${contact.id} may not be visible to architect ${user.name} because architect assignment doesn't match.`, {
        contactArchitect: finalVerification.architecteAssigne,
        userArchitect: user.name
      });
    }

    console.log(`[Convert Lead] ✅ Final verification passed. Contact is ready:`, {
      contactId: finalVerification.id,
      nom: finalVerification.nom,
      tag: finalVerification.tag,
      status: finalVerification.status,
      leadStatus: finalVerification.leadStatus,
      architecteAssigne: finalVerification.architecteAssigne,
      createdAt: finalVerification.createdAt,
      isQueryable: !!queryableCheck,
      userRole: user.role
    });

    return NextResponse.json({
      success: true,
      contact: finalVerification, // Return the verified contact
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
