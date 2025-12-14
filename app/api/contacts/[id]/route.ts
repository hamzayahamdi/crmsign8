"use server"

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/contacts/[id]
 * Get a specific contact with all relations
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
      verify(token, JWT_SECRET) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Await params in Next.js 15
    const { id } = await params;

    // Derive contactId from params or, as a fallback, from the URL path
    let contactId: string | undefined = id;

    if (!contactId) {
      try {
        const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean);
        // Expecting /api/contacts/[id] -> ['api', 'contacts', '<id>']
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment !== 'contacts') {
          contactId = lastSegment;
        }
      } catch (e) {
        console.error('[GET /api/contacts/[id]] Failed to parse contact id from URL:', e);
      }
    }

    if (!contactId) {
      console.error('[GET /api/contacts/[id]] Missing or invalid contact id. Params:', params, 'URL:', request.nextUrl.pathname);
      return NextResponse.json({ error: 'Identifiant de contact manquant ou invalide' }, { status: 400 });
    }

    console.log('[GET /api/contacts/[id]] Fetching contact:', contactId);

    // Fetch contact (basic info)
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      console.log('[GET /api/contacts/[id]] Contact not found:', contactId);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('[GET /api/contacts/[id]] Contact found, loading relations in parallel...');

    // Load all relations in parallel for faster response
    const [
      opportunities,
      tasks,
      appointments,
      documents,
      timeline,
    ] = await Promise.allSettled([
      prisma.opportunity.findMany({ where: { contactId } }),
      prisma.task.findMany({ where: { contactId } }),
      prisma.appointment.findMany({ where: { contactId } }),
      prisma.contactDocument.findMany({ where: { contactId } }),
      prisma.timeline.findMany({ where: { contactId } }),
    ]);

    // Assign results safely
    (contact as any).opportunities = opportunities.status === 'fulfilled' ? opportunities.value : [];
    (contact as any).tasks = tasks.status === 'fulfilled' ? tasks.value : [];
    (contact as any).appointments = appointments.status === 'fulfilled' ? appointments.value : [];
    (contact as any).documents = documents.status === 'fulfilled' ? documents.value : [];
    const timelineData = timeline.status === 'fulfilled' ? timeline.value : [];

    // Build timeline - simplified for faster loading
    // Just use timeline data directly, don't merge everything (can be done client-side if needed)
    try {
      (contact as any).timeline = timelineData || [];
    } catch (e) {
      console.error('Error setting timeline:', e);
      (contact as any).timeline = [];
    }

    try {
      const payments = await prisma.contactPayment.findMany({
        where: { contactId },
      });
      (contact as any).payments = payments;
    } catch (e) {
      console.error('Error fetching payments:', e);
      (contact as any).payments = [];
    }

    // Fetch notes - simplified for faster loading
    try {
      const unifiedNotes = await prisma.note.findMany({
        where: {
          entityType: 'contact',
          entityId: contactId,
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to 50 most recent notes for faster loading
      });

      const formattedNotes = unifiedNotes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        createdBy: note.author,
        type: note.sourceType === 'lead' ? 'lead_note' : 'note',
        source: note.sourceType || 'contact',
        sourceId: note.sourceId,
      }));

      // Set notes for frontend (simplified - no complex deduplication)
      (contact as any).notes = JSON.stringify(formattedNotes);
    } catch (e) {
      console.error('Error loading notes:', e);
      // Keep existing notes if any
      if (!(contact as any).notes) {
        (contact as any).notes = JSON.stringify([]);
      }
    }

    console.log('[GET /api/contacts/[id]] Contact loaded successfully');
    return NextResponse.json(contact);

  } catch (error) {
    console.error('[GET /api/contacts/[id]] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contact';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[id]
 * Update a contact
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
    const decoded = verify(token, JWT_SECRET) as any;

    // Check user role for edit permission
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const userRole = (user.role || '').toLowerCase();
    // Allow Admin, Operator, and Gestionnaire to edit contacts
    if (!['admin', 'operator', 'gestionnaire'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Permission denied. Only admins, operators, and gestionnaires can edit contacts.' 
      }, { status: 403 });
    }

    // Await params in Next.js 15
    const { id } = await params;

    const body = await request.json();
    const { nom, telephone, email, ville, adresse, architecteAssigne, tag, notes, source, typeBien, magasin, status, campaignName, commercialMagasin } = body;

    // Get current contact to compare architect assignment
    const currentContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!currentContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (nom !== undefined) updateData.nom = nom;
    if (telephone !== undefined) updateData.telephone = telephone;
    if (email !== undefined) updateData.email = email;
    if (ville !== undefined) updateData.ville = ville;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (architecteAssigne !== undefined) updateData.architecteAssigne = architecteAssigne;
    if (tag !== undefined) updateData.tag = tag;
    if (notes !== undefined) updateData.notes = notes;
    if (source !== undefined) updateData.source = source;
    if (typeBien !== undefined) updateData.typeBien = typeBien;
    if (magasin !== undefined) updateData.magasin = magasin;
    if (status !== undefined) updateData.status = status;
    if (campaignName !== undefined) updateData.campaignName = campaignName;
    if (commercialMagasin !== undefined) updateData.commercialMagasin = commercialMagasin;

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
      include: {
        opportunities: true,
      },
    });

    // Log changes to timeline
    if (Object.keys(updateData).length > 0) {
      await prisma.timeline.create({
        data: {
          contactId: contact.id,
          eventType: 'status_changed',
          title: 'Contact mis à jour',
          description: `Modifications: ${Object.keys(updateData).join(', ')}`,
          author: decoded.userId,
        },
      });
    }

    // Send comprehensive notifications if architect was assigned or changed
    // (Platform, WhatsApp, and Email)
    if (architecteAssigne !== undefined && architecteAssigne !== currentContact.architecteAssigne) {
      const previousArchitect = currentContact.architecteAssigne;
      
      if (architecteAssigne) {
        // Find the architect user by name
        const architect = await prisma.user.findFirst({
          where: { 
            name: architecteAssigne,
            role: { equals: 'architect', mode: 'insensitive' }
          },
        });

        if (architect) {
          try {
            const { notifyArchitectContactConvertedOrAssigned } = await import('@/lib/notification-service');
            
            await notifyArchitectContactConvertedOrAssigned(
              architect.id,
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
                isReassignment: !!previousArchitect,
                previousArchitect: previousArchitect,
                createdBy: decoded.userId,
                convertedFromLead: false,
              }
            );
            
            console.log(`[Update Contact] ✅ Comprehensive notifications sent to architect ${architecteAssigne} (${architect.id})`);
          } catch (notificationError) {
            console.error(`[Update Contact] ⚠️ Error sending notifications to architect:`, notificationError);
            // Don't fail the update if notifications fail - log and continue
          }
        }
      }
    }

    return NextResponse.json(contact);

  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete a contact and all related data (cascading delete)
 * 
 * Relations that will be deleted:
 * - Opportunities (and their tasks, timeline, documents, appointments)
 * - Tasks
 * - Timeline entries
 * - Contact documents
 * - Contact payments
 * - Appointments
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[DELETE /api/contacts/[id]] Starting contact deletion...');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[DELETE /api/contacts/[id]] Unauthorized - missing auth header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET) as any;
    } catch (err) {
      console.log('[DELETE /api/contacts/[id]] Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    console.log('[DELETE /api/contacts/[id]] User attempting deletion:', { 
      userId: decoded.userId, 
      role: user?.role 
    });

    if (!user || user.role !== 'admin') {
      console.log('[DELETE /api/contacts/[id]] Permission denied - user is not admin');
      return NextResponse.json({ error: 'Permission denied. Only admins can delete contacts.' }, { status: 403 });
    }

    // Await params in Next.js 15
    const { id } = await params;
    console.log('[DELETE /api/contacts/[id]] Contact ID to delete:', id);

    // Check if contact exists first
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        opportunities: true,
        tasks: true,
        timeline: true,
        documents: true,
        payments: true,
        appointments: true,
      }
    });

    if (!contact) {
      console.log('[DELETE /api/contacts/[id]] Contact not found:', id);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('[DELETE /api/contacts/[id]] Contact found, deleting...', {
      id: contact.id,
      nom: contact.nom,
      opportunitiesCount: contact.opportunities?.length || 0,
      tasksCount: contact.tasks?.length || 0,
      timelineCount: contact.timeline?.length || 0,
      documentsCount: contact.documents?.length || 0,
      paymentsCount: contact.payments?.length || 0,
      appointmentsCount: contact.appointments?.length || 0,
    });

    // Delete the contact - Prisma will cascade delete all related records
    // due to onDelete: Cascade in the schema
    await prisma.contact.delete({
      where: { id },
    });

    console.log('[DELETE /api/contacts/[id]] Contact deleted successfully:', id);

    return NextResponse.json({ 
      success: true,
      message: 'Contact deleted successfully',
      deletedContact: {
        id: contact.id,
        nom: contact.nom
      }
    });

  } catch (error) {
    console.error('[DELETE /api/contacts/[id]] Error deleting contact:', error);
    
    // Check for specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Contact not found or already deleted' },
          { status: 404 }
        );
      }
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete contact due to foreign key constraint' },
          { status: 409 }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
