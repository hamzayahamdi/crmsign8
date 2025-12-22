"use server"

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';

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

    console.log('[GET /api/contacts/[id]] Contact found, loading relations in parallel...', {
      contactId: contact.id,
      leadId: (contact as any).leadId,
      tag: contact.tag,
      convertedBy: (contact as any).convertedBy
    });

    // Check if contact has leadCreatedAt stored directly (preferred method)
    // This is stored when the lead is converted, before the lead is deleted
    const getLeadCreatedAt = () => {
      if ((contact as any).leadCreatedAt) {
        console.log('[GET /api/contacts/[id]] ✅ Using stored leadCreatedAt from contact:', (contact as any).leadCreatedAt);
        return { createdAt: (contact as any).leadCreatedAt };
      }
      return null;
    };

    // Check for stored leadCreatedAt first (lead is already deleted, so we use stored value)
    const storedLeadData = getLeadCreatedAt();
    
    // OPTIMIZATION: Load all relations in parallel with select statements for better performance
    const [
      opportunities,
      tasks,
      appointments,
      documents,
      payments,
      timeline,
    ] = await Promise.allSettled([
      prisma.opportunity.findMany({ 
        where: { contactId },
        select: {
          id: true,
          titre: true,
          type: true,
          statut: true,
          pipelineStage: true,
          budget: true,
          description: true,
          architecteAssigne: true,
          dateClotureAttendue: true,
          notes: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          documents: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              category: true,
              uploadedBy: true,
              uploadedAt: true
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              assignedTo: true
            }
          },
          appointments: {
            select: {
              id: true,
              title: true,
              dateStart: true,
              dateEnd: true,
              status: true
            }
          }
        }
      }),
      prisma.task.findMany({ 
        where: { contactId },
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          assignedTo: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.appointment.findMany({ 
        where: { contactId },
        select: {
          id: true,
          title: true,
          dateStart: true,
          dateEnd: true,
          description: true,
          location: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.contactDocument.findMany({ 
        where: { contactId },
        select: {
          id: true,
          name: true,
          type: true,
          size: true,
          category: true,
          uploadedBy: true,
          uploadedAt: true
        }
      }),
      prisma.contactPayment.findMany({ 
        where: { contactId },
        select: {
          id: true,
          montant: true,
          date: true,
          methode: true,
          reference: true,
          description: true,
          type: true,
          createdBy: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.timeline.findMany({ 
        where: { contactId },
        select: {
          id: true,
          eventType: true,
          title: true,
          description: true,
          metadata: true,
          author: true,
          createdAt: true
        }
      }),
    ]);

    // Assign results safely
    (contact as any).opportunities = opportunities.status === 'fulfilled' ? opportunities.value : [];
    (contact as any).tasks = tasks.status === 'fulfilled' ? tasks.value : [];
    (contact as any).appointments = appointments.status === 'fulfilled' ? appointments.value : [];
    
    // Format contact documents to ensure they have all required fields
    const contactDocs = documents.status === 'fulfilled' ? documents.value : [];
    const formattedContactDocs = contactDocs.map((doc: any) => ({
      id: doc.id,
      name: doc.name || doc.filename || 'Document',
      path: doc.path || doc.file_path || doc.url,
      url: doc.url || doc.path || doc.file_path,
      type: doc.type || doc.file_type || 'document',
      category: doc.category || doc.document_category || 'Autre',
      size: doc.size || doc.file_size || 0,
      uploadedBy: doc.uploaded_by || doc.uploadedBy || 'Utilisateur',
      uploadedAt: doc.uploaded_at || doc.uploadedAt || doc.created_at || doc.createdAt,
      createdAt: doc.created_at || doc.createdAt,
      source: 'contact',
    }));
    (contact as any).documents = formattedContactDocs;
    
    (contact as any).payments = payments.status === 'fulfilled' ? payments.value : [];
    const timelineData = timeline.status === 'fulfilled' ? timeline.value : [];
    
    // Use stored leadCreatedAt if available (lead was deleted after conversion)
    // Check both the stored data and the contact object itself
    const contactLeadCreatedAt = (contact as any).leadCreatedAt || storedLeadData?.createdAt;
    if (contactLeadCreatedAt) {
      (contact as any).leadCreatedAt = contactLeadCreatedAt;
      console.log('[GET /api/contacts/[id]] ✅ Using stored leadCreatedAt:', contactLeadCreatedAt);
    } else if ((contact as any).leadId) {
      // Lead was deleted, but we don't have stored leadCreatedAt (old conversion)
      console.warn('[GET /api/contacts/[id]] ⚠️ Contact has leadId but lead was deleted and no leadCreatedAt stored:', {
        contactId: contactId,
        leadId: (contact as any).leadId,
        tag: contact.tag,
        hasLeadCreatedAt: !!(contact as any).leadCreatedAt
      });
    }

    // Fetch client historique if contact has been converted to client
    // Check for clients with composite IDs (contactId-opportunityId) or contactId field
    let clientHistorique: any[] = [];
    let clientNotes: any[] = [];
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Find all clients related to this contact
        // 1. Check for clients with composite IDs starting with contactId (format: contactId-opportunityId)
        const { data: clientsWithCompositeId } = await supabase
          .from('clients')
          .select('id')
          .like('id', `${contactId}-%`);
        
        // 2. Also find clients through opportunities (opportunities have contactId)
        const opportunityIds = (contact as any).opportunities?.map((o: any) => o.id) || []
        const clientIdsFromOpportunities: string[] = []
        if (opportunityIds.length > 0) {
          for (const oppId of opportunityIds) {
            const compositeClientId = `${contactId}-${oppId}`
            clientIdsFromOpportunities.push(compositeClientId)
          }
        }
        
        // 3. Combine all client IDs
        const clientIds: string[] = [];
        if (clientsWithCompositeId) {
          clientIds.push(...clientsWithCompositeId.map(c => c.id));
        }
        // Add opportunity-based client IDs
        clientIds.push(...clientIdsFromOpportunities)
        // Remove duplicates
        const uniqueClientIds = Array.from(new Set(clientIds))
        
        console.log(`[GET /api/contacts/[id]] Found ${uniqueClientIds.length} related clients:`, {
          fromComposite: clientsWithCompositeId?.length || 0,
          fromOpportunities: clientIdsFromOpportunities.length,
          allIds: uniqueClientIds,
        })
        
        // Fetch historique, documents, payments, appointments, and tasks from all related clients
        // Optimized: Limit results to reduce query time and only fetch essential fields
        if (uniqueClientIds.length > 0) {
          console.log(`[GET /api/contacts/[id]] Fetching client data for ${uniqueClientIds.length} clients:`, uniqueClientIds)
          const [
            { data: historiqueData, error: historiqueError },
            { data: clientDocumentsData, error: documentsError },
            { data: clientDevisData, error: devisError },
            { data: clientPaymentsData, error: paymentsError },
            { data: clientAppointmentsData, error: appointmentsError },
            { data: clientTasksData, error: tasksError },
          ] = await Promise.all([
            supabase
              .from('historique')
              .select('id, type, description, auteur, date, client_id, previous_status, new_status')
              .in('client_id', uniqueClientIds)
              .order('date', { ascending: false })
              .limit(200), // Limit to most recent 200 entries
            supabase
              .from('documents')
              .select('id, name, path, bucket, type, category, size, uploaded_by, uploaded_at, created_at')
              .in('client_id', uniqueClientIds)
              .order('uploaded_at', { ascending: false })
              .limit(500), // Increased limit to show all documents
            supabase
              .from('devis')
              .select('id, title, fichier, date, bucket, size, created_by, created_at')
              .in('client_id', uniqueClientIds)
              .order('date', { ascending: false })
              .limit(500), // Increased limit to show all devis
            supabase
              .from('payments')
              .select('id, montant, date, methode, reference, description, type, created_by, created_at')
              .in('client_id', uniqueClientIds)
              .order('date', { ascending: false })
              .limit(100), // Limit to most recent 100 payments
            supabase
              .from('appointments')
              .select('id, title, date_start, date_end, description, location, status, created_by, created_at')
              .in('client_id', uniqueClientIds)
              .order('date_start', { ascending: false })
              .limit(100), // Limit to most recent 100 appointments
            supabase
              .from('tasks')
              .select('id, title, description, status, priority, created_by, assigned_to, created_at, due_date')
              .in('client_id', uniqueClientIds)
              .order('created_at', { ascending: false })
              .limit(100), // Limit to most recent 100 tasks
          ]);
          
          if (historiqueData) {
            clientHistorique = historiqueData.map((h: any) => {
              // Handle different types of historique entries
              let eventType = 'other'
              if (h.type === 'note') {
                eventType = 'note_added'
              } else if (h.type === 'devis' || h.description?.includes('Devis attaché')) {
                // Mark devis entries as document_uploaded so they appear in documents filter
                eventType = 'document_uploaded'
              } else if (h.type === 'document' || h.description?.includes('Document ajouté')) {
                eventType = 'document_uploaded'
              }
              
              return {
                id: `client-hist-${h.id}`,
                eventType: eventType,
                title: h.type === 'note' 
                  ? 'Note ajoutée' 
                  : h.type === 'devis' || h.description?.includes('Devis attaché')
                  ? (h.description?.replace(/^Devis attaché\s*:\s*/i, '') || 'Devis')
                  : h.description?.substring(0, 50) || 'Activité',
                description: h.description,
                author: h.auteur,
                createdAt: h.date || h.created_at,
                metadata: {
                  source: 'client',
                  clientId: h.client_id,
                  type: h.type,
                  previousStatus: h.previous_status,
                  newStatus: h.new_status,
                  // Add devis metadata if it's a devis entry
                  isDevis: h.type === 'devis' || h.description?.includes('Devis attaché'),
                }
              }
            });
            
            // Extract notes from client historique
            clientNotes = historiqueData
              .filter((h: any) => h.type === 'note')
              .map((h: any) => ({
                id: `client-note-${h.id}`,
                content: h.description,
                createdAt: h.date || h.created_at,
                createdBy: h.auteur,
                type: 'note',
                source: 'client',
              }));
          }

          // Add client documents to contact documents
          if (clientDocumentsData && clientDocumentsData.length > 0) {
            const existingDocs = (contact as any).documents || [];
            const clientDocs = clientDocumentsData.map((doc: any) => ({
              id: doc.id,
              name: doc.name || doc.filename || 'Document',
              path: doc.path || doc.file_path,
              bucket: doc.bucket || 'documents',
              type: doc.type || doc.file_type || 'document',
              category: doc.category || doc.document_category || 'Autre',
              size: doc.size || doc.file_size || 0,
              uploadedBy: doc.uploaded_by || doc.uploadedBy || 'Utilisateur',
              uploadedAt: doc.uploaded_at || doc.uploadedAt || doc.created_at,
              createdAt: doc.created_at || doc.createdAt,
              contactId: contactId,
              source: 'client',
            }));
            (contact as any).documents = [...existingDocs, ...clientDocs];
            console.log(`[GET /api/contacts/[id]] Added ${clientDocs.length} client documents to contact`);
          }

          // Add client devis to contact documents (as devis type)
          if (clientDevisData && clientDevisData.length > 0) {
            const existingDocs = (contact as any).documents || [];
            const devisDocs = clientDevisData.map((devis: any) => {
              // Extract filename from path if title is not available
              const filename = devis.fichier?.split('/').pop() || devis.fichier || 'Devis'
              const devisName = devis.title || filename
              
              return {
                id: `devis-${devis.id}`,
                name: devisName,
                path: devis.fichier || devis.path,
                url: devis.fichier || devis.path, // Add url field for file viewing
                bucket: devis.bucket || 'devis',
                type: 'devis',
                category: 'devis',
                size: devis.size || 0,
                uploadedBy: devis.created_by || devis.uploaded_by || 'Utilisateur',
                uploaded_by: devis.created_by || devis.uploaded_by || 'Utilisateur',
                uploadedAt: devis.date || devis.uploaded_at || devis.created_at,
                uploaded_at: devis.date || devis.uploaded_at || devis.created_at,
                createdAt: devis.date || devis.created_at || devis.uploaded_at,
                created_at: devis.date || devis.created_at || devis.uploaded_at,
                contactId: contactId,
                source: 'client',
                isDevis: true,
                devisTitle: devis.title,
                devisId: devis.id,
              }
            });
            (contact as any).documents = [...existingDocs, ...devisDocs];
            console.log(`[GET /api/contacts/[id]] Added ${devisDocs.length} devis files to contact documents:`, devisDocs.map(d => ({ id: d.id, name: d.name, path: d.path, date: d.uploadedAt })));
          } else {
            console.log(`[GET /api/contacts/[id]] No devis files found for related clients`);
          }

          // Log any errors
          if (devisError) {
            console.error('[GET /api/contacts/[id]] Error fetching client devis:', devisError)
          }
          if (paymentsError) {
            console.error('[GET /api/contacts/[id]] Error fetching client payments:', paymentsError)
          }
          
          // Add client payments to contact payments
          if (clientPaymentsData && clientPaymentsData.length > 0) {
            console.log(`[GET /api/contacts/[id]] Found ${clientPaymentsData.length} client payments`)
            const existingPayments = (contact as any).payments || [];
            const clientPayments = clientPaymentsData.map((payment: any) => ({
              id: payment.id,
              montant: payment.montant || payment.amount,
              date: payment.date,
              methode: payment.methode || payment.method,
              reference: payment.reference || payment.ref,
              description: payment.description || payment.notes || '',
              type: payment.type || 'paiement',
              createdBy: payment.created_by || payment.createdBy || 'Utilisateur',
              createdAt: payment.created_at || payment.createdAt,
              contactId: contactId,
              source: 'client',
            }));
            // Merge and deduplicate payments by id
            const allPayments = [...existingPayments, ...clientPayments]
            const uniquePayments = allPayments.filter((payment, index, self) => 
              index === self.findIndex(p => p.id === payment.id)
            )
            ;(contact as any).payments = uniquePayments.sort((a, b) => {
              const dateA = new Date(a.date || a.createdAt || a.created_at || 0).getTime()
              const dateB = new Date(b.date || b.createdAt || b.created_at || 0).getTime()
              return dateB - dateA // Newest first
            })
            console.log(`[GET /api/contacts/[id]] Added ${clientPayments.length} client payments to contact. Total: ${uniquePayments.length}`)
          } else {
            console.log(`[GET /api/contacts/[id]] No client payments found. Contact has ${(contact as any).payments?.length || 0} contact payments.`)
          }

          // Add client appointments to contact appointments
          if (clientAppointmentsData && clientAppointmentsData.length > 0) {
            const existingAppointments = (contact as any).appointments || [];
            const clientAppointments = clientAppointmentsData.map((appt: any) => ({
              id: appt.id,
              title: appt.title || appt.name || 'Rendez-vous',
              dateStart: appt.date_start || appt.dateStart || appt.start_date,
              dateEnd: appt.date_end || appt.dateEnd || appt.end_date,
              description: appt.description || appt.notes || '',
              location: appt.location || appt.address || '',
              status: appt.status || appt.state || 'scheduled',
              createdBy: appt.created_by || appt.createdBy || 'Utilisateur',
              createdAt: appt.created_at || appt.createdAt,
              contactId: contactId,
              source: 'client',
            }));
            (contact as any).appointments = [...existingAppointments, ...clientAppointments];
            console.log(`[GET /api/contacts/[id]] Added ${clientAppointments.length} client appointments to contact`);
          }

          // Add client tasks to contact tasks
          if (clientTasksData && clientTasksData.length > 0) {
            const existingTasks = (contact as any).tasks || [];
            const clientTasks = clientTasksData.map((task: any) => ({
              id: task.id,
              title: task.title || task.name || 'Tâche',
              description: task.description || task.notes || '',
              status: task.status || task.state || 'pending',
              priority: task.priority || 'medium',
              dueDate: task.due_date || task.dueDate,
              createdBy: task.created_by || task.createdBy || 'Utilisateur',
              assignedTo: task.assigned_to || task.assignedTo,
              createdAt: task.created_at || task.createdAt,
              contactId: contactId,
              source: 'client',
            }));
            (contact as any).tasks = [...existingTasks, ...clientTasks];
            console.log(`[GET /api/contacts/[id]] Added ${clientTasks.length} client tasks to contact`);
          }
        } else {
          console.log(`[GET /api/contacts/[id]] No related clients found for contact ${contactId}. Contact has ${(contact as any).payments?.length || 0} contact payments.`)
        }
      }
    } catch (error) {
      console.error('[GET /api/contacts/[id]] Error fetching client historique:', error);
    }

    // Build timeline - combine contact timeline with client historique
    try {
      const combinedTimeline = [
        ...timelineData,
        ...clientHistorique
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.date || 0).getTime();
        return dateB - dateA;
      });
      
      (contact as any).timeline = combinedTimeline;
    } catch (e) {
      console.error('Error setting timeline:', e);
      (contact as any).timeline = timelineData || [];
    }

    // Payments are already fetched in Promise.allSettled above
    // Client payments will be merged later if contact has been converted to client

    // Fetch notes - filter out system-generated notes, only show manually added notes
    try {
      const unifiedNotes = await prisma.note.findMany({
        where: {
          entityType: 'contact',
          entityId: contactId,
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Increased limit to ensure we get all notes before filtering
      });

      // Filter out system-generated notes - only show manually added notes
      const systemNotePatterns = [
        /^Lead créé par/i,
        /statut.*mis à jour/i,
        /déplacé/i,
        /mouvement/i,
        /Note de campagne/i,
        /^📝 Note de campagne/i,
        /Architecte assigné/i,
        /Gestionnaire assigné/i,
        /Opportunité créée/i,
        /Contact converti en Client/i,
        /Contact créé depuis Lead/i,
        /Statut changé/i,
        /Statut Lead mis à jour/i,
        /^✉️ Message WhatsApp envoyé/i,
        /^📅 Nouveau rendez-vous/i,
        /^✅ Statut mis à jour/i,
        /^Note ajoutée$/i, // Exclude timeline events with just "Note ajoutée"
        /^Note ajoutée \(Opportunité\)$/i, // Exclude timeline entries for opportunity notes
      ];

      const userNotes = unifiedNotes.filter(note => {
        const content = note.content.trim();
        // Exclude empty notes
        if (!content) return false;
        // Exclude system-generated notes
        return !systemNotePatterns.some(pattern => pattern.test(content));
      });

      // Format notes and identify opportunity notes
      const formattedNotes = userNotes.map((note) => {
        const content = note.content || '';
        const isOpportunityNote = content.trim().startsWith('[Opportunité:');
        
        return {
          id: note.id,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          createdBy: note.author,
          type: note.sourceType === 'lead' ? 'lead_note' : 'note',
          source: note.sourceType || 'contact',
          sourceId: note.sourceId,
          // Add metadata to help identify opportunity notes
          metadata: isOpportunityNote ? {
            source: 'opportunity',
            isOpportunityNote: true,
          } : undefined,
        };
      });

      // Combine contact notes with client notes for full traceability
      const allNotes = [
        ...formattedNotes,
        ...clientNotes
      ].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      // Set notes for frontend - all manually added notes (contact + client)
      (contact as any).notes = JSON.stringify(allNotes);
    } catch (e) {
      console.error('Error loading notes:', e);
      // Keep existing notes if any
      if (!(contact as any).notes) {
        (contact as any).notes = JSON.stringify([]);
      }
    }

    // Ensure all arrays are present (even if empty) for frontend compatibility
    if (!(contact as any).tasks) (contact as any).tasks = []
    if (!(contact as any).appointments) (contact as any).appointments = []
    if (!(contact as any).documents) (contact as any).documents = []
    if (!(contact as any).payments) (contact as any).payments = []
    if (!(contact as any).opportunities) (contact as any).opportunities = []
    
    // Log payment details for debugging
    const paymentDetails = (contact as any).payments?.map((p: any) => ({
      id: p.id,
      montant: p.montant || p.amount,
      methode: p.methode || p.method,
      type: p.type,
      source: p.source,
      date: p.date || p.createdAt || p.created_at,
    })) || []
    
    console.log('[GET /api/contacts/[id]] Contact loaded successfully', {
      contactId: contact.id,
      tasks: (contact as any).tasks?.length || 0,
      appointments: (contact as any).appointments?.length || 0,
      documents: (contact as any).documents?.length || 0,
      payments: (contact as any).payments?.length || 0,
      paymentDetails: paymentDetails,
      opportunities: (contact as any).opportunities?.length || 0,
      paymentsArray: (contact as any).payments,
    });
    
    // Ensure payments and leadCreatedAt are explicitly included in response
    const leadCreatedAtValue = (contact as any).leadCreatedAt;
    const responseData = {
      ...contact,
      payments: (contact as any).payments || [],
      leadCreatedAt: leadCreatedAtValue 
        ? (leadCreatedAtValue instanceof Date 
            ? leadCreatedAtValue.toISOString() 
            : typeof leadCreatedAtValue === 'string' 
              ? leadCreatedAtValue 
              : new Date(leadCreatedAtValue).toISOString())
        : null,
    };
    
    console.log('[GET /api/contacts/[id]] Response data includes:', {
      contactId: contact.id,
      leadId: (contact as any).leadId,
      leadCreatedAt: responseData.leadCreatedAt,
      leadCreatedAtRaw: (contact as any).leadCreatedAt,
      tag: contact.tag,
      convertedBy: (contact as any).convertedBy
    });
    
    return NextResponse.json(responseData);

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

    // Before deleting, find and delete any legacy clients with composite IDs referencing this contact's opportunities
    // Composite ID format: contactId-opportunityId
    if (contact.opportunities && contact.opportunities.length > 0) {
      for (const opportunity of contact.opportunities) {
        const compositeIdPattern = `${id}-${opportunity.id}`;
        try {
          const legacyClient = await prisma.client.findUnique({
            where: { id: compositeIdPattern },
          });

          if (legacyClient) {
            await prisma.client.delete({
              where: { id: compositeIdPattern },
            });
            console.log(`[DELETE /api/contacts/[id]] ✅ Deleted legacy client with composite ID: ${compositeIdPattern}`);
          }
        } catch (clientErr) {
          // If client doesn't exist or error occurs, continue
          console.log(`[DELETE /api/contacts/[id]] Legacy client not found or already deleted: ${compositeIdPattern}`);
        }
      }
    }

    // Delete the contact - Prisma will cascade delete all related records
    // due to onDelete: Cascade in the schema (opportunities, tasks, timeline, documents, payments, appointments)
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
