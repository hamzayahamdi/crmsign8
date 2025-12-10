import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/clients/[id] - Fetch single client with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get("token");

    if (!authCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all users to map IDs to names (architects and commercials)
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
    });
    const userNameMap: Record<string, string> = {};
    allUsers.forEach((user: { id: string; name: string; email: string; role: string }) => {
      userNameMap[user.id] = user.name;
    });

    // Check if this is an opportunity-based client (composite ID: contactId-opportunityId)
    const isOpportunityClient =
      clientId.includes("-") && clientId.split("-").length === 2;

    let client: any = null;
    let contactId: string | null = null;
    let opportunityId: string | null = null;

    if (isOpportunityClient) {
      // Fetch from contacts/opportunities using Prisma
      const [contactIdPart, opportunityIdPart] = clientId.split("-");
      contactId = contactIdPart;
      opportunityId = opportunityIdPart;

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          opportunities: {
            where: { id: opportunityId },
          },
        },
      });

      if (
        !contact ||
        !contact.opportunities ||
        contact.opportunities.length === 0
      ) {
        return NextResponse.json(
          { error: "Client non trouvé" },
          { status: 404 },
        );
      }

      const opportunity = contact.opportunities[0];

      // Map opportunity pipeline stage to project status
      // First check historique table for latest status update
      const { data: latestHistorique } = await supabase
        .from("historique")
        .select("new_status")
        .eq("client_id", clientId)
        .eq("type", "statut")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let status = "nouveau";

      // Use status from historique if available (more recent updates)
      if (latestHistorique?.new_status) {
        status = latestHistorique.new_status;
        console.log("[GET /api/clients] Using status from historique:", status);
      } else {
        // Fallback to pipeline stage mapping
        if (opportunity.pipelineStage === "prise_de_besoin")
          status = "prise_de_besoin";
        if (opportunity.pipelineStage === "projet_accepte")
          status = "acompte_recu";
        if (opportunity.pipelineStage === "acompte_recu")
          status = "acompte_recu";
        if (opportunity.pipelineStage === "gagnee") status = "projet_en_cours";
        // When opportunity is marked as "perdue", it should show as "refuse" (Refused)
        if (opportunity.pipelineStage === "perdue" || opportunity.statut === "lost") {
          status = "refuse";
        }
        console.log(
          "[GET /api/clients] Using status from pipeline stage:",
          status,
          "pipelineStage:",
          opportunity.pipelineStage,
          "statut:",
          opportunity.statut,
        );
      }

      // Map opportunity type to project type
      const typeMap: Record<string, string> = {
        villa: "villa",
        appartement: "appartement",
        magasin: "magasin",
        bureau: "bureau",
        riad: "riad",
        studio: "studio",
        renovation: "autre",
        autre: "autre",
      };
      const typeProjet = typeMap[opportunity.type] || "autre";

      // Map architect and commercial IDs to names
      const architectId =
        opportunity.architecteAssigne || contact.architecteAssigne || "";
      const architectName = architectId
        ? userNameMap[architectId] || architectId
        : "";

      const commercialId = contact.createdBy || "";
      const commercialName = commercialId
        ? userNameMap[commercialId] || commercialId
        : "";

      // Transform to client format
      client = {
        id: clientId,
        nom: contact.nom,
        nomProjet: opportunity.titre, // Store opportunity title
        telephone: contact.telephone,
        ville: contact.ville || "",
        type_projet: typeProjet,
        architecte_assigne: architectName, // Use mapped name instead of ID
        statut_projet: status,
        derniere_maj: opportunity.updatedAt,
        lead_id: contact.leadId,
        email: contact.email,
        adresse: contact.adresse,
        budget: opportunity.budget || 0,
        notes:
          [
            contact.notes || "",
            opportunity.notes || "",
            opportunity.description || "",
          ]
            .filter(Boolean)
            .filter((note) => {
              // Remove placeholder/template text
              const cleanNote = note.trim();
              return (
                cleanNote &&
                !cleanNote.match(/^===.*===\s*$/i) &&
                cleanNote !== "confirmer" &&
                !cleanNote.match(/^===\s*Prise de besoin\s*===\s*confirmer$/i)
              );
            })
            .join("\n\n") || "", // Combine contact notes, opportunity notes, and description
        magasin: contact.magasin,
        commercial_attribue: commercialName, // Use mapped name instead of ID
        created_at: opportunity.createdAt,
        updated_at: opportunity.updatedAt,
        is_contact: true,
        contact_id: contactId,
        contactId: contactId, // Also add camelCase version for frontend
        opportunity_id: opportunityId,
        opportunityId: opportunityId, // Also add camelCase version for frontend
      };
    } else {
      // Legacy client - fetch from Supabase
      const { data: legacyClient, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError || !legacyClient) {
        return NextResponse.json(
          { error: "Client non trouvé" },
          { status: 404 },
        );
      }
      client = legacyClient;

      // Map architect and commercial IDs to names for legacy clients
      if (client.architecte_assigne) {
        const mappedArchitect = userNameMap[client.architecte_assigne];
        if (mappedArchitect) {
          client.architecte_assigne = mappedArchitect;
        }
      }

      if (client.commercial_attribue) {
        const mappedCommercial = userNameMap[client.commercial_attribue];
        if (mappedCommercial) {
          client.commercial_attribue = mappedCommercial;
        }
      }
    }

    // Fetch related data in parallel (only for legacy clients)
    let historique: any[] = [];
    let appointments: any[] = [];
    let devis: any[] = [];
    let documents: any[] = [];
    let payments: any[] = [];
    let currentStage: any = null;

    if (!isOpportunityClient) {
      // Legacy client - fetch from Supabase
      const [
        { data: histData },
        { data: apptData },
        { data: devisData },
        { data: docsData },
        { data: paymentsData },
        { data: stageData },
      ] = await Promise.all([
        supabase
          .from("historique")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .eq("client_id", clientId)
          .order("date_start", { ascending: false }),
        supabase
          .from("devis")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false }),
        supabase
          .from("documents")
          .select("*")
          .eq("client_id", clientId)
          .order("uploaded_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("client_id", clientId)
          .order("date", { ascending: false }),
        // Fetch current stage from stage history (source of truth)
        supabase
          .from("client_stage_history")
          .select("stage_name")
          .eq("client_id", clientId)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      historique = histData || [];
      appointments = apptData || [];
      devis = devisData || [];
      documents = docsData || [];
      payments = paymentsData || [];
      currentStage = stageData;
    } else {
      // Opportunity-based client - fetch both timeline AND historique entries
      if (contactId && opportunityId) {
        try {
          // Fetch timeline entries for this contact/opportunity
          const timelineEntries = await prisma.timeline.findMany({
            where: {
              OR: [{ contactId: contactId }, { opportunityId: opportunityId }],
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          });

          // Fetch historique entries (including status changes) from Supabase
          const { data: historiqueEntries } = await supabase
            .from("historique")
            .select("*")
            .eq("client_id", clientId)
            .order("date", { ascending: false });

          // Transform timeline to historique format and map user IDs to names
          const transformedTimeline = timelineEntries.map((entry: any) => {
            let authorName = "Système";
            if (entry.author) {
              // Map user ID to name
              authorName =
                userNameMap[entry.author] ||
                userNameMap[entry.author.toLowerCase()] ||
                entry.author;
            }

            return {
              id: entry.id,
              date: entry.createdAt.toISOString(),
              type:
                entry.eventType === "note_added"
                  ? "note"
                  : entry.eventType === "appointment_created"
                    ? "rdv"
                    : entry.eventType === "status_changed"
                      ? "statut"
                      : "note",
              description: entry.title || entry.description || "",
              auteur: authorName,
              metadata: entry.metadata || {},
            };
          });

          // Transform historique entries and map user IDs to names
          const transformedHistorique = (historiqueEntries || []).map(
            (entry) => {
              let authorName = entry.auteur || "Système";
              // Map user ID to name if it looks like an ID
              if (authorName && authorName.length > 20) {
                authorName =
                  userNameMap[authorName] ||
                  userNameMap[authorName.toLowerCase()] ||
                  entry.auteur;
              }

              return {
                id: entry.id,
                date: entry.date,
                type: entry.type,
                description: entry.description,
                auteur: authorName,
                metadata: entry.metadata || {},
                previousStatus: entry.previous_status,
                newStatus: entry.new_status,
                durationInHours: entry.duration_in_hours,
                timestampStart: entry.timestamp_start,
                timestampEnd: entry.timestamp_end,
              };
            },
          );

          // Combine timeline and historique entries
          historique = [...transformedHistorique, ...transformedTimeline].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

          // Fetch appointments for this client from Supabase (uses client_id)
          const { data: oppAppointments } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', clientId)
            .order('date_start', { ascending: false });

          appointments = oppAppointments || [];
        } catch (error) {
          console.error(
            "[GET /api/clients/[id]] Error fetching opportunity data:",
            error,
          );
        }
      }

      // Fetch payments for opportunity-based clients from Supabase
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      // Also fetch contact payments if this is an opportunity-based client
      let contactPayments: any[] = [];
      if (contactId) {
        try {
          const contactPaymentsData = await prisma.contactPayment.findMany({
            where: { contactId },
            orderBy: { date: 'desc' },
          });
          // Transform contact payments to match client payment format
          contactPayments = contactPaymentsData.map((cp: any) => ({
            id: cp.id,
            client_id: clientId, // Map to client_id for consistency
            montant: cp.montant,
            date: cp.date instanceof Date ? cp.date.toISOString() : cp.date,
            methode: cp.methode,
            reference: cp.reference,
            description: cp.description,
            type: cp.type || 'accompte', // Contact payments are typically acompte
            created_by: cp.createdBy,
            created_at: cp.createdAt instanceof Date ? cp.createdAt.toISOString() : cp.createdAt,
            updated_at: cp.updatedAt instanceof Date ? cp.updatedAt.toISOString() : cp.updatedAt,
          }));
          console.log(`[GET /api/clients/[id]] Fetched ${contactPayments.length} contact payments for client ${clientId}`);
        } catch (error) {
          console.error('[GET /api/clients/[id]] Error fetching contact payments:', error);
        }
      }

      // Merge both payment sources (contact payments + client payments)
      payments = [...contactPayments, ...(paymentsData || [])].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // CRITICAL FIX: Fetch devis for opportunity-based clients from Supabase
      const { data: devisData } = await supabase
        .from("devis")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      devis = devisData || [];
      console.log(`[GET /api/clients/[id]] Fetched ${devis.length} devis for opportunity client ${clientId}`);

      // Fetch documents for opportunity-based clients from Supabase
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientId)
        .order("uploaded_at", { ascending: false });

      documents = docsData || [];

      currentStage = null;
    }

    // Prepare lead data & notes (include legacy lead notes for complete history)
    let parsedLeadData: any = null;
    let leadNotesFromLeadData: any[] = [];
    const leadId = isOpportunityClient ? contactId : client.lead_id;

    if (!isOpportunityClient && client.lead_data) {
      try {
        parsedLeadData =
          typeof client.lead_data === "string"
            ? JSON.parse(client.lead_data)
            : client.lead_data;

        if (Array.isArray(parsedLeadData?.notes)) {
          leadNotesFromLeadData = parsedLeadData.notes;
        }
      } catch (error) {
        console.error(
          "[GET /api/clients/[id]] Failed to parse lead_data JSON:",
          error,
        );
      }
    }

    let leadNotesFromTable: any[] = [];
    if (leadId) {
      try {
        const { data: leadNotesData, error: leadNotesError } = await supabase
          .from("lead_notes")
          .select("*")
          .eq("leadId", leadId)
          .order("createdAt", { ascending: false });

        if (leadNotesError) {
          console.warn(
            "[GET /api/clients/[id]] Failed to fetch lead notes from table:",
            leadNotesError,
          );
        } else if (leadNotesData) {
          leadNotesFromTable = leadNotesData;
        }
      } catch (error) {
        console.error(
          "[GET /api/clients/[id]] Unexpected error when fetching lead notes:",
          error,
        );
      }
    }

    const leadNotesMap = new Map<string, any>();
    const mergeLeadNote = (note: any) => {
      if (!note) return;
      const rawKey =
        note.id ?? note.noteId ?? note.createdAt ?? note.created_at;
      const key =
        typeof rawKey === "string" && rawKey.trim().length > 0
          ? rawKey
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!leadNotesMap.has(key)) {
        leadNotesMap.set(key, note);
      }
    };

    leadNotesFromLeadData.forEach(mergeLeadNote);
    leadNotesFromTable.forEach(mergeLeadNote);

    const mergedLeadNotes = Array.from(leadNotesMap.values());

    const leadHistoriqueEntries = mergedLeadNotes
      .map((note) => {
        const rawDate =
          note.createdAt ??
          note.created_at ??
          note.date ??
          note.timestamp ??
          null;

        const dateObj = rawDate ? new Date(rawDate) : null;
        const isoDate =
          dateObj && !Number.isNaN(dateObj.getTime())
            ? dateObj.toISOString()
            : null;

        const description = note.content ?? note.description ?? "";
        const auteur = note.author ?? note.auteur ?? "Lead";

        if (!isoDate || !description) {
          return null;
        }

        const historyIdBase = note.id ?? note.noteId ?? isoDate;
        const historyId = `lead-note-${historyIdBase}`;

        return {
          id: historyId,
          date: isoDate,
          type: "note" as const,
          description,
          auteur,
          metadata: {
            source: "lead",
            leadNoteId: note.id ?? null,
            leadId: note.leadId ?? note.lead_id ?? leadId ?? null,
          },
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: string;
          date: string;
          type: "note";
          description: string;
          auteur: string;
          metadata: {
            source: string;
            leadNoteId: any;
            leadId: any;
          };
        } => Boolean(entry),
      )
      .map((entry) => {
        // Map user ID to name if it looks like an ID
        let authorName = entry.auteur || "Système";
        if (authorName && authorName.length > 20) {
          authorName =
            userNameMap[authorName] ||
            userNameMap[authorName.toLowerCase()] ||
            entry.auteur;
        }
        return {
          ...entry,
          auteur: authorName,
        };
      });

    // Use stage from history as source of truth, fallback to client.statut_projet
    const actualStatus =
      currentStage?.stage_name ||
      client.statut_projet ||
      (isOpportunityClient ? client.statut_projet : "nouveau");

    console.log("[GET /api/clients/[id]] Status resolution:", {
      clientId,
      fromHistory: currentStage?.stage_name,
      fromClient: client.statut_projet,
      using: actualStatus,
    });

    // Transform to frontend format and map user IDs to names
    const supabaseHistorique = (historique || []).map((h) => {
      let authorName = h.auteur || "Système";
      // Map user ID to name if it looks like an ID
      if (authorName && authorName.length > 20) {
        authorName =
          userNameMap[authorName] ||
          userNameMap[authorName.toLowerCase()] ||
          h.auteur;
      }

      return {
        id: h.id,
        date: h.date,
        type: h.type,
        description: h.description,
        auteur: authorName,
        previousStatus: h.previous_status,
        newStatus: h.new_status,
        durationInHours: h.duration_in_hours,
        timestampStart: h.timestamp_start,
        timestampEnd: h.timestamp_end,
        metadata: h.metadata,
      };
    });

    const combinedHistorique = [
      ...supabaseHistorique,
      ...leadHistoriqueEntries,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const transformedClient = {
      id: client.id,
      nom: client.nom,
      nomProjet: client.nomProjet || "",
      contactId: isOpportunityClient ? contactId : undefined,
      opportunityId: isOpportunityClient ? opportunityId : undefined,
      telephone: client.telephone,
      ville: client.ville || "",
      typeProjet: client.type_projet || client.typeProjet || "autre",
      architecteAssigne:
        client.architecte_assigne || client.architecteAssigne || "",
      statutProjet: actualStatus,
      derniereMaj:
        client.derniere_maj ||
        client.derniereMaj ||
        client.updated_at ||
        client.updatedAt,
      leadId: client.lead_id || client.leadId || leadId || null,
      leadData: parsedLeadData,
      email: client.email,
      adresse: client.adresse,
      budget: client.budget || 0,
      notes: (() => {
        const rawNotes = client.notes || "";
        // Clean up placeholder text
        if (
          rawNotes.match(/^===\s*Prise de besoin\s*===\s*confirmer$/i) ||
          rawNotes.trim() === "confirmer" ||
          rawNotes.match(/^===.*===\s*$/i)
        ) {
          return "";
        }
        return rawNotes;
      })(),
      magasin: client.magasin,
      commercialAttribue:
        client.commercial_attribue || client.commercialAttribue || "",
      createdAt: client.created_at || client.createdAt,
      updatedAt: client.updated_at || client.updatedAt,
      isContact: isOpportunityClient,
      // Traceability metadata
      metadata: isOpportunityClient
        ? {
          contactId: contactId,
          opportunityId: opportunityId,
          source: "opportunity",
          createdBy:
            client.commercial_attribue || client.commercialAttribue || "",
          createdAt: client.created_at || client.createdAt,
        }
        : {
          source: "legacy_client",
          createdBy:
            client.commercial_attribue || client.commercialAttribue || "",
          createdAt: client.created_at || client.createdAt,
        },
      historique: combinedHistorique,
      rendezVous:
        appointments?.map((a) => ({
          id: a.id,
          title: a.title,
          dateStart: a.date_start,
          dateEnd: a.date_end,
          description: a.description,
          location: a.location,
          locationUrl: a.location_url,
          status: a.status,
          clientId: a.client_id,
          clientName: a.client_name,
          architecteId: a.architecte_id,
          notes: a.notes,
          createdBy: a.created_by,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        })) || [],
      devis:
        devis?.map((d) => ({
          id: d.id,
          title: d.title,
          montant: d.montant,
          date: d.date,
          statut: d.statut,
          facture_reglee: d.facture_reglee,
          description: d.description,
          fichier: d.fichier,
          createdBy: d.created_by,
          createdAt: d.created_at,
          validatedAt: d.validated_at,
          notes: d.notes,
        })) || [],
      documents: await Promise.all(
        (documents || []).map(async (d) => {
          // Generate signed URL for each document
          let signedUrl = null;
          try {
            const { data: signed } = await supabase.storage
              .from(d.bucket || "documents")
              .createSignedUrl(d.path, 60 * 60 * 24 * 7); // 7 days
            signedUrl = signed?.signedUrl || null;
          } catch (err) {
            console.error("[Documents] Failed to generate signed URL:", err);
          }

          return {
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size,
            category: d.category,
            uploadedBy: d.uploaded_by,
            uploadedAt: d.uploaded_at,
            url: signedUrl,
            path: d.path,
            bucket: d.bucket,
          };
        }),
      ),
      payments:
        payments?.map((p) => ({
          id: p.id,
          amount: p.montant,
          date: p.date instanceof Date ? p.date.toISOString() : (typeof p.date === 'string' ? p.date : new Date(p.date).toISOString()),
          method: p.methode,
          reference: p.reference,
          notes: p.description,
          type: p.type || "paiement", // Include payment type (accompte or paiement)
          createdBy: p.created_by,
          createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : (typeof p.created_at === 'string' ? p.created_at : new Date(p.created_at).toISOString()),
        })) || [],
    };

    return NextResponse.json({
      success: true,
      data: transformedClient,
    });
  } catch (error) {
    console.error("[GET /api/clients/[id]] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/clients/[id] - Update client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get("token");

    if (!authCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Build update object (convert camelCase to snake_case)
    const updateData: any = {
      updated_at: now,
      derniere_maj: now,
    };

    if (body.nom !== undefined) updateData.nom = body.nom;
    if (body.telephone !== undefined) updateData.telephone = body.telephone;
    if (body.ville !== undefined) updateData.ville = body.ville;
    if (body.typeProjet !== undefined) updateData.type_projet = body.typeProjet;
    if (body.architecteAssigne !== undefined)
      updateData.architecte_assigne = body.architecteAssigne;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.adresse !== undefined) updateData.adresse = body.adresse;
    if (body.budget !== undefined) updateData.budget = body.budget;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.magasin !== undefined) updateData.magasin = body.magasin;
    if (body.commercialAttribue !== undefined)
      updateData.commercial_attribue = body.commercialAttribue;

    // Update client
    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", clientId)
      .select()
      .single();

    if (updateError) {
      console.error("[PATCH /api/clients/[id]] Update error:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du client" },
        { status: 500 },
      );
    }

    // Transform response
    const transformedClient = {
      id: updatedClient.id,
      nom: updatedClient.nom,
      telephone: updatedClient.telephone,
      ville: updatedClient.ville,
      typeProjet: updatedClient.type_projet,
      architecteAssigne: updatedClient.architecte_assigne,
      statutProjet: updatedClient.statut_projet,
      derniereMaj: updatedClient.derniere_maj,
      leadId: updatedClient.lead_id,
      email: updatedClient.email,
      adresse: updatedClient.adresse,
      budget: updatedClient.budget,
      notes: updatedClient.notes,
      magasin: updatedClient.magasin,
      commercialAttribue: updatedClient.commercial_attribue,
      createdAt: updatedClient.created_at,
      updatedAt: updatedClient.updated_at,
    };

    console.log(`[PATCH /api/clients/[id]] ✅ Updated client: ${clientId}`);

    return NextResponse.json({
      success: true,
      data: transformedClient,
    });
  } catch (error) {
    console.error("[PATCH /api/clients/[id]] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[id] - Delete client and restore lead if it was converted
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get("token");

    if (!authCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if this is an opportunity-based client (composite ID: contactId-opportunityId)
    const isOpportunityClient =
      clientId.includes("-") && clientId.split("-").length === 2;

    if (isOpportunityClient) {
      const [contactId, opportunityId] = clientId.split("-");

      try {
        // Delete the opportunity using Prisma
        await prisma.opportunity.delete({
          where: { id: opportunityId },
        });

        console.log(
          `[DELETE /api/clients/[id]] ✅ Deleted opportunity: ${opportunityId}`,
        );

        return NextResponse.json({
          success: true,
          message: "Client (Opportunité) supprimé avec succès",
        });
      } catch (err) {
        console.error(
          "[DELETE /api/clients/[id]] Error deleting opportunity:",
          err,
        );
        return NextResponse.json(
          { error: "Erreur lors de la suppression de l'opportunité" },
          { status: 500 },
        );
      }
    }

    // 2. Check 'clients' table (Legacy Client)
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (client && !fetchError) {
      let restoredLead = null;

      // If client has leadData, restore the lead before deleting the client
      if (client.lead_data && client.lead_id) {
        console.log(
          `[DELETE /api/clients/[id]] 🔄 Restoring lead from client data...`,
        );

        try {
          const leadData = client.lead_data as any;

          // Restore the lead with all original data
          restoredLead = await prisma.lead.create({
            data: {
              id: leadData.id,
              nom: leadData.nom,
              telephone: leadData.telephone,
              ville: leadData.ville,
              typeBien: leadData.typeBien,
              statut: "nouveau", // Reset to 'nouveau'
              statutDetaille:
                "🔄 Lead restauré après suppression du client - À requalifier",
              message: leadData.message,
              assignePar: leadData.assignePar,
              source: leadData.source,
              priorite: leadData.priorite,
              magasin: leadData.magasin,
              commercialMagasin: leadData.commercialMagasin,
              month: leadData.month,
              campaignName: leadData.campaignName,
              uploadedAt: leadData.uploadedAt
                ? new Date(leadData.uploadedAt)
                : null,
              convertedAt: null,
              createdBy: leadData.createdBy,
              createdAt: leadData.createdAt
                ? new Date(leadData.createdAt)
                : new Date(),
              derniereMaj: new Date(),
            },
          });

          // Restore lead notes if they exist
          if (leadData.notes && Array.isArray(leadData.notes)) {
            await prisma.leadNote.createMany({
              data: leadData.notes.map((note: any) => ({
                id: note.id,
                leadId: leadData.id,
                content: note.content,
                author: note.author,
                createdAt: note.createdAt
                  ? new Date(note.createdAt)
                  : new Date(),
              })),
            });
          }

          console.log(
            `[DELETE /api/clients/[id]] ✅ Lead restored: ${restoredLead.id}`,
          );
        } catch (restoreError) {
          console.error(
            "[DELETE /api/clients/[id]] ❌ Failed to restore lead:",
            restoreError,
          );
        }
      }

      // Delete client (cascade will handle related data)
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (deleteError) {
        console.error("[DELETE /api/clients/[id]] Delete error:", deleteError);
        return NextResponse.json(
          { error: "Erreur lors de la suppression du client" },
          { status: 500 },
        );
      }

      console.log(
        `[DELETE /api/clients/[id]] ✅ Deleted legacy client: ${clientId}`,
      );

      return NextResponse.json({
        success: true,
        message: restoredLead
          ? "Client supprimé et lead restauré avec succès"
          : "Client supprimé avec succès",
        restoredLead: restoredLead
          ? {
            id: restoredLead.id,
            nom: restoredLead.nom,
            statut: restoredLead.statut,
          }
          : null,
      });
    }

    // 3. If not found in 'clients' table, check if it's a Contact
    try {
      const contact = await prisma.contact.findUnique({
        where: { id: clientId },
      });

      if (contact) {
        // Delete the contact (cascade will delete opportunities)
        await prisma.contact.delete({
          where: { id: clientId },
        });

        console.log(
          `[DELETE /api/clients/[id]] ✅ Deleted contact: ${clientId}`,
        );

        return NextResponse.json({
          success: true,
          message: "Client (Contact) et ses opportunités supprimés avec succès",
        });
      }
    } catch (err) {
      console.error("[DELETE /api/clients/[id]] Error deleting contact:", err);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du contact" },
        { status: 500 },
      );
    }

    // If neither found
    console.error("[DELETE /api/clients/[id]] Client not found in any table");
    return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
  } catch (error) {
    console.error("[DELETE /api/clients/[id]] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
