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

    // First, just try to fetch the contact without any includes
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      console.log('[GET /api/contacts/[id]] Contact not found:', contactId);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('[GET /api/contacts/[id]] Contact found, adding relations...');

    // Now try to add relations one by one
    try {
      const opportunities = await prisma.opportunity.findMany({
        where: { contactId },
      });
      (contact as any).opportunities = opportunities;
    } catch (e) {
      console.error('Error fetching opportunities:', e);
      (contact as any).opportunities = [];
    }

    try {
      const tasks = await prisma.task.findMany({
        where: { contactId },
      });
      (contact as any).tasks = tasks;
    } catch (e) {
      console.error('Error fetching tasks:', e);
      (contact as any).tasks = [];
    }

    try {
      const appointments = await prisma.appointment.findMany({
        where: { contactId },
      });
      (contact as any).appointments = appointments;
    } catch (e) {
      console.error('Error fetching appointments:', e);
      (contact as any).appointments = [];
    }

    try {
      const documents = await prisma.contactDocument.findMany({
        where: { contactId },
      });
      (contact as any).documents = documents;
    } catch (e) {
      console.error('Error fetching documents:', e);
      (contact as any).documents = [];
    }

    try {
      const timeline = await prisma.timeline.findMany({
        where: { contactId },
      });

      // Build a comprehensive timeline with all relevant events
      let mergedTimeline: any[] = [...timeline]
      
      // 1. Add lead notes if this contact was converted from a lead
      try {
        if ((contact as any).leadId) {
          const leadNotes = await prisma.leadNote.findMany({
            where: { leadId: (contact as any).leadId },
            orderBy: { createdAt: 'desc' },
          })

          const noteEvents = leadNotes.map((n) => ({
            id: `leadnote_${n.id}`,
            contactId,
            eventType: 'note_added' as const,
            title: 'Note du Lead',
            description: n.content,
            metadata: { leadId: (contact as any).leadId, source: 'lead' },
            author: n.author,
            createdAt: n.createdAt,
          }))

          mergedTimeline.push(...noteEvents)
        }
      } catch (noteErr) {
        console.error('Error merging lead notes into contact timeline:', noteErr)
      }

      // 2. Add tasks to timeline (if not already in timeline)
      try {
        const tasks = (contact as any).tasks || []
        const taskEvents = tasks.map((task: any) => ({
          id: `task_${task.id}`,
          contactId,
          eventType: task.status === 'terminee' ? 'task_completed' : 'task_created',
          title: task.status === 'terminee' ? `Tâche terminée: ${task.title}` : `Tâche créée: ${task.title}`,
          description: task.description,
          metadata: { 
            taskId: task.id, 
            dueDate: task.dueDate,
            assignedTo: task.assignedTo,
            status: task.status
          },
          author: task.createdBy,
          createdAt: task.status === 'terminee' ? task.updatedAt : task.createdAt,
        }))
        mergedTimeline.push(...taskEvents)
      } catch (taskErr) {
        console.error('Error adding tasks to timeline:', taskErr)
      }

      // 3. Add appointments to timeline
      try {
        const appointments = (contact as any).appointments || []
        const appointmentEvents = appointments.map((apt: any) => ({
          id: `appointment_${apt.id}`,
          contactId,
          eventType: apt.status === 'completed' ? 'appointment_completed' : 'appointment_created',
          title: apt.status === 'completed' ? `RDV terminé: ${apt.title}` : `RDV créé: ${apt.title}`,
          description: apt.description || apt.notes,
          metadata: { 
            appointmentId: apt.id, 
            dateStart: apt.dateStart,
            location: apt.location,
            status: apt.status
          },
          author: apt.createdBy,
          createdAt: apt.status === 'completed' && apt.updatedAt ? apt.updatedAt : apt.createdAt,
        }))
        mergedTimeline.push(...appointmentEvents)
      } catch (aptErr) {
        console.error('Error adding appointments to timeline:', aptErr)
      }

      // 4. Add documents to timeline
      try {
        const documents = (contact as any).documents || []
        const documentEvents = documents.map((doc: any) => ({
          id: `document_${doc.id}`,
          contactId,
          eventType: 'document_uploaded' as const,
          title: `Document ajouté: ${doc.name}`,
          description: `Catégorie: ${doc.category}`,
          metadata: { 
            documentId: doc.id,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            category: doc.category
          },
          author: doc.uploadedBy,
          createdAt: doc.uploadedAt,
        }))
        mergedTimeline.push(...documentEvents)
      } catch (docErr) {
        console.error('Error adding documents to timeline:', docErr)
      }

      // 5. Add payments to timeline (create payment events)
      try {
        const payments = (contact as any).payments || []
        const paymentEvents = payments.map((payment: any) => ({
          id: `payment_${payment.id}`,
          contactId,
          eventType: 'other' as const,
          title: `Paiement reçu: ${payment.montant.toLocaleString('fr-FR')} MAD`,
          description: payment.description || `Méthode: ${payment.methode}`,
          metadata: { 
            paymentId: payment.id,
            montant: payment.montant,
            methode: payment.methode,
            reference: payment.reference
          },
          author: payment.createdBy,
          createdAt: payment.date,
        }))
        mergedTimeline.push(...paymentEvents)
      } catch (paymentErr) {
        console.error('Error adding payments to timeline:', paymentErr)
      }

      // Sort newest first for better UX
      mergedTimeline.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())

      ;(contact as any).timeline = mergedTimeline
    } catch (e) {
      console.error('Error fetching timeline:', e);
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

    // Await params in Next.js 15
    const { id } = await params;

    const body = await request.json();
    const { nom, telephone, email, ville, adresse, architecteAssigne, tag, notes } = body;

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

    // Send notification if architect was assigned or changed
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
          // Send notification to the new architect
          await prisma.notification.create({
            data: {
              userId: architect.id,
              type: 'client_assigned',
              priority: 'high',
              title: previousArchitect ? 'Contact Réassigné' : 'Nouveau Contact Assigné',
              message: previousArchitect 
                ? `Le contact "${contact.nom}" vous a été réassigné (précédemment: ${previousArchitect}). Téléphone: ${contact.telephone}`
                : `Le contact "${contact.nom}" vous a été assigné. Téléphone: ${contact.telephone}`,
              linkedType: 'contact',
              linkedId: contact.id,
              linkedName: contact.nom,
              metadata: {
                contactPhone: contact.telephone,
                contactVille: contact.ville,
                previousArchitect: previousArchitect,
                assignmentType: previousArchitect ? 'reassigned' : 'new_assignment',
              },
              createdBy: decoded.userId,
            },
          });
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
 * Delete a contact and all relations
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
    const decoded = verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Await params in Next.js 15
    const { id } = await params;

    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
