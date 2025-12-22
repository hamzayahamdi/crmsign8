import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database";
import { getUserMapping } from "@/lib/user-cache";
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// OPTIMIZATION: Add revalidation for caching (30 seconds for detail pages)
export const revalidate = 30

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

    // OPTIMIZATION: Use cached user mapping instead of fetching all users on every request
    const userNameMap = await getUserMapping();

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

      // Get opportunity creator (who created the opportunity)
      const opportunityCreatorId = opportunity.createdBy || "";
      let opportunityCreatorName = "";
      if (opportunityCreatorId) {
        // Try to get name from user map
        opportunityCreatorName = userNameMap[opportunityCreatorId] || "";
        // If not found in map, try to fetch from database
        if (!opportunityCreatorName && opportunityCreatorId.length > 10) {
          try {
            const creator = await prisma.user.findUnique({
              where: { id: opportunityCreatorId },
              select: { name: true },
            });
            if (creator?.name) {
              opportunityCreatorName = creator.name;
              // Cache it in the map for future use
              userNameMap[opportunityCreatorId] = creator.name;
            }
          } catch (err) {
            console.error("[GET /api/clients/[id]] Error fetching opportunity creator:", err);
          }
        }
        // Fallback to ID if name still not found
        if (!opportunityCreatorName) {
          opportunityCreatorName = opportunityCreatorId;
        }
      }

      // Get contact creator (who created the contact, might be different from opportunity creator)
      const contactCreatorId = contact.createdBy || "";
      const contactCreatorName = contactCreatorId
        ? userNameMap[contactCreatorId] || contactCreatorId
        : "";

      // Use opportunity creator as the main creator, fallback to contact creator
      const commercialId = opportunityCreatorId || contactCreatorId;
      const commercialName = opportunityCreatorName || contactCreatorName;

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
        commercial_attribue: commercialName, // Use opportunity creator name (who created the opportunity)
        created_at: opportunity.createdAt,
        updated_at: opportunity.updatedAt,
        is_contact: true,
        contact_id: contactId,
        contactId: contactId, // Also add camelCase version for frontend
        opportunity_id: opportunityId,
        opportunityId: opportunityId, // Also add camelCase version for frontend
        // Add opportunity creator info for better traceability
        opportunityCreatedBy: opportunityCreatorName,
        contactCreatedBy: contactCreatorName,
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
    let leadFromDatabase: any = null;

    // Try to fetch the original lead if it still exists (for commercialMagasin)
    if (!isOpportunityClient && leadId) {
      try {
        leadFromDatabase = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { commercialMagasin: true, source: true }
        });
        if (leadFromDatabase) {
          console.log(`[GET /api/clients/[id]] Found original lead, commercialMagasin: ${leadFromDatabase.commercialMagasin}`);
        }
      } catch (error) {
        // Lead might be deleted (normal after conversion), ignore error
        console.log(`[GET /api/clients/[id]] Lead ${leadId} not found (likely converted/deleted)`);
      }
    }

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

    // Fetch notes from unified Note table if client has a contactId (converted from lead/contact)
    let unifiedNotesEntries: any[] = [];
    const contactIdForNotes = isOpportunityClient ? contactId : (client as any).contactId || (client as any).contact_id;
    
    if (contactIdForNotes) {
      try {
        const unifiedNotes = await prisma.note.findMany({
          where: {
            entityType: 'contact',
            entityId: contactIdForNotes,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });

        // Filter out system-generated notes
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
        ];

        const userNotes = unifiedNotes.filter(note => {
          const content = note.content.trim();
          if (!content) return false;
          return !systemNotePatterns.some(pattern => pattern.test(content));
        });

        unifiedNotesEntries = userNotes.map((note) => {
          let authorName = note.author || "Système";
          if (authorName && authorName.length > 20) {
            authorName = userNameMap[authorName] || userNameMap[authorName.toLowerCase()] || note.author;
          }
          
          return {
            id: `unified-note-${note.id}`,
            date: note.createdAt.toISOString(),
            type: 'note' as const,
            description: note.content,
            auteur: authorName,
            metadata: {
              source: note.sourceType === 'lead' ? 'lead' : 'contact',
              noteId: note.id,
              sourceId: note.sourceId,
            },
          };
        });
        
        console.log(`[GET /api/clients/[id]] Fetched ${unifiedNotesEntries.length} notes from unified Note table for contact ${contactIdForNotes}`);
      } catch (error) {
        console.error('[GET /api/clients/[id]] Error fetching unified notes:', error);
      }
    }

    const combinedHistorique = [
      ...supabaseHistorique,
      ...leadHistoriqueEntries,
      ...unifiedNotesEntries,
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
      commercialAttribue: (() => {
        // Priority: 1) commercialMagasin from leadData (most accurate source)
        // 2) commercialMagasin from original lead if it still exists
        // 3) stored commercial_attribue
        
        // Always prioritize commercialMagasin from leadData if it exists (most accurate)
        if (parsedLeadData && parsedLeadData.commercialMagasin) {
          console.log(`[GET /api/clients/[id]] ✅ Using commercialMagasin from leadData: ${parsedLeadData.commercialMagasin}`)
          return parsedLeadData.commercialMagasin
        }
        
        // Fallback: Try to get from original lead if it still exists
        if (leadFromDatabase && leadFromDatabase.commercialMagasin) {
          console.log(`[GET /api/clients/[id]] ✅ Using commercialMagasin from original lead: ${leadFromDatabase.commercialMagasin}`)
          return leadFromDatabase.commercialMagasin
        }
        
        // Otherwise, use the stored commercial_attribue
        const storedCommercial = client.commercial_attribue || client.commercialAttribue || ""
        const isMagasinLead = client.magasin || (parsedLeadData && parsedLeadData.source === 'magasin')
        
        if (storedCommercial) {
          console.log(`[GET /api/clients/[id]] Using commercial_attribue from client: ${storedCommercial}`)
        } else {
          console.log(`[GET /api/clients/[id]] ⚠️ No commercial name found - leadData:`, parsedLeadData ? 'exists' : 'missing', 'commercialMagasin:', parsedLeadData?.commercialMagasin, 'leadFromDB:', leadFromDatabase?.commercialMagasin)
        }
        return storedCommercial
      })(),
      opportunityCreatedBy:
        client.opportunityCreatedBy || client.opportunity_created_by || "",
      contactCreatedBy:
        client.contactCreatedBy || client.contact_created_by || "",
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
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
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
    if (body.nomProjet !== undefined) updateData.nom_projet = body.nomProjet; // CRITICAL: Update project name
    if (body.typeProjet !== undefined) updateData.type_projet = body.typeProjet;
    if (body.architecteAssigne !== undefined)
      updateData.architecte_assigne = body.architecteAssigne;
    if (body.statutProjet !== undefined) updateData.statut_projet = body.statutProjet; // CRITICAL: Update status
    if (body.email !== undefined) updateData.email = body.email;
    if (body.adresse !== undefined) updateData.adresse = body.adresse;
    if (body.budget !== undefined) updateData.budget = body.budget;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.magasin !== undefined) updateData.magasin = body.magasin;
    if (body.commercialAttribue !== undefined)
      updateData.commercial_attribue = body.commercialAttribue;

    // Check if this is an opportunity-based client (ID format: contactId-opportunityId)
    const isOpportunityBased = clientId.includes('-') && clientId.split('-').length === 2;
    
    let updatedClient: any = null;

    // Handle opportunity-based clients differently (they may not exist in clients table)
    if (isOpportunityBased) {
      console.log("[PATCH /api/clients/[id]] Opportunity-based client detected:", clientId);
      const [contactId, opportunityId] = clientId.split('-');
      const { JWT_SECRET } = process.env;
      const { verify } = await import('jsonwebtoken');
      
      // Verify token to get user info
      let decoded: any;
      try {
        const token = authCookie.value;
        decoded = verify(token, JWT_SECRET!) as any;
      } catch (err) {
        console.error("[PATCH /api/clients/[id]] Token verification failed:", err);
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 },
        );
      }

      if (!decoded) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 401 },
        );
      }

      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        // Verify contact and opportunity exist
        const contact = await prisma.contact.findUnique({
          where: { id: contactId }
        });
        
        const opportunity = await prisma.opportunity.findUnique({
          where: { id: opportunityId }
        });

        if (!contact || !opportunity) {
          await prisma.$disconnect();
          return NextResponse.json(
            { 
              error: "Client non trouvé",
              details: "Le contact ou l'opportunité n'existe pas",
            },
            { status: 404 },
          );
        }

        // Build contact update data
        const contactUpdateData: any = {};
        if (body.ville !== undefined) contactUpdateData.ville = body.ville;
        if (body.nom !== undefined) contactUpdateData.nom = body.nom;
        if (body.telephone !== undefined) contactUpdateData.telephone = body.telephone;
        if (body.email !== undefined) contactUpdateData.email = body.email;
        if (body.adresse !== undefined) contactUpdateData.adresse = body.adresse;
        if (body.architecteAssigne !== undefined) contactUpdateData.architecteAssigne = body.architecteAssigne;

        // Update contact if there are fields to update
        if (Object.keys(contactUpdateData).length > 0) {
          await prisma.contact.update({
            where: { id: contactId },
            data: contactUpdateData
          });
          console.log(`[PATCH /api/clients/[id]] ✅ Updated contact ${contactId}:`, Object.keys(contactUpdateData));
        }

        // Build opportunity update data
        const opportunityUpdateData: any = {};
        if (body.nomProjet !== undefined) opportunityUpdateData.titre = body.nomProjet;
        if (body.budget !== undefined) opportunityUpdateData.budget = body.budget;
        if (body.architecteAssigne !== undefined) opportunityUpdateData.architecteAssigne = body.architecteAssigne;
        if (body.typeProjet !== undefined) {
          const typeMap: Record<string, string> = {
            'villa': 'villa',
            'appartement': 'appartement',
            'magasin': 'magasin',
            'bureau': 'bureau',
            'riad': 'riad',
            'studio': 'studio',
            'autre': 'autre'
          };
          opportunityUpdateData.type = typeMap[body.typeProjet] || 'autre';
        }

        // Update opportunity if there are fields to update
        if (Object.keys(opportunityUpdateData).length > 0) {
          await prisma.opportunity.update({
            where: { id: opportunityId },
            data: opportunityUpdateData
          });
          console.log(`[PATCH /api/clients/[id]] ✅ Updated opportunity ${opportunityId}:`, Object.keys(opportunityUpdateData));
        }

        // Fetch updated opportunity and contact to build response
        const updatedOpportunity = await prisma.opportunity.findUnique({
          where: { id: opportunityId },
          include: { contact: true }
        });

        const updatedContact = await prisma.contact.findUnique({
          where: { id: contactId }
        });

        if (!updatedOpportunity || !updatedContact) {
          await prisma.$disconnect();
          return NextResponse.json(
            { error: "Erreur lors de la récupération des données mises à jour" },
            { status: 500 },
          );
        }

        // Build client object from updated opportunity and contact
        updatedClient = {
          id: clientId,
          nom: updatedContact.nom,
          telephone: updatedContact.telephone,
          ville: updatedContact.ville || "",
          typeProjet: updatedOpportunity.type,
          architecteAssigne: updatedOpportunity.architecteAssigne || updatedContact.architecteAssigne || "",
          statutProjet: updatedOpportunity.statut === 'won' ? 'projet_en_cours' :
            updatedOpportunity.statut === 'lost' ? 'perdu' :
              updatedOpportunity.pipelineStage === 'perdue' ? 'perdu' :
                updatedOpportunity.pipelineStage === 'gagnee' ? 'projet_en_cours' :
                  updatedOpportunity.pipelineStage === 'projet_accepte' ? 'accepte' :
                    updatedOpportunity.pipelineStage === 'acompte_recu' ? 'acompte_recu' :
                      updatedOpportunity.pipelineStage === 'prise_de_besoin' ? 'prise_de_besoin' :
                        'projet_en_cours',
          derniereMaj: updatedOpportunity.updatedAt.toISOString(),
          leadId: updatedContact.leadId,
          email: updatedContact.email,
          adresse: updatedContact.adresse,
          budget: updatedOpportunity.budget || 0,
          notes: updatedContact.notes || "",
          magasin: updatedContact.magasin,
          commercialAttribue: updatedContact.createdBy,
          createdAt: updatedOpportunity.createdAt.toISOString(),
          updatedAt: updatedOpportunity.updatedAt.toISOString(),
          nomProjet: updatedOpportunity.titre || "",
        };

        // Optionally upsert to clients table for consistency (if it exists)
        try {
          const { error: upsertError } = await supabase.from("clients").upsert({
            id: clientId,
            nom: updatedContact.nom,
            telephone: updatedContact.telephone,
            ville: updatedContact.ville || "",
            architecte_assigne: updatedOpportunity.architecteAssigne || updatedContact.architecteAssigne || "",
            statut_projet: updatedClient.statutProjet,
            type_projet: updatedOpportunity.type,
            derniere_maj: now,
            email: updatedContact.email,
            adresse: updatedContact.adresse,
            budget: updatedOpportunity.budget || 0,
            lead_id: updatedContact.leadId,
            commercial_attribue: updatedContact.createdBy,
            created_at: updatedOpportunity.createdAt.toISOString(),
            updated_at: now,
          }, { onConflict: 'id' });

          if (upsertError) {
            console.warn("[PATCH /api/clients/[id]] Could not upsert to clients table:", upsertError.message);
            // Don't fail - this is optional
          }
        } catch (upsertErr) {
          console.warn("[PATCH /api/clients/[id]] Error upserting to clients table:", upsertErr);
          // Don't fail - this is optional
        }

        await prisma.$disconnect();
      } catch (prismaError: any) {
        await prisma.$disconnect();
        console.error("[PATCH /api/clients/[id]] Prisma error:", prismaError);
        return NextResponse.json(
          { 
            error: "Erreur lors de la mise à jour",
            details: prismaError.message,
          },
          { status: 500 },
        );
      }
    } else {
      // Legacy client - update in Supabase clients table
      console.log("[PATCH /api/clients/[id]] Legacy client detected:", clientId);
      
      // CRITICAL: Check if nom_projet column exists in Supabase
      const updateDataForSupabase = { ...updateData };
      
      // First, check if client exists
      const { data: existingClient, error: checkError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

      if (checkError) {
        console.error("[PATCH /api/clients/[id]] Error checking client:", checkError);
        return NextResponse.json(
          { 
            error: "Erreur lors de la vérification du client",
            details: checkError.message,
          },
          { status: 500 },
        );
      }

      if (!existingClient) {
        console.error("[PATCH /api/clients/[id]] Client not found:", clientId);
        return NextResponse.json(
          { 
            error: "Client non trouvé",
            details: "Le client avec cet ID n'existe pas",
          },
          { status: 404 },
        );
      }

      // Update client (without .single() to avoid PGRST116 error)
      const { data: updateResult, error: updateError } = await supabase
        .from("clients")
        .update(updateDataForSupabase)
        .eq("id", clientId)
        .select();

      if (updateError) {
        console.error("[PATCH /api/clients/[id]] Update error:", updateError);
        console.error("[PATCH /api/clients/[id]] Update data sent:", updateData);
        console.error("[PATCH /api/clients/[id]] Client ID:", clientId);
        
        return NextResponse.json(
          { 
            error: "Erreur lors de la mise à jour du client",
            details: updateError.message,
            code: updateError.code,
            hint: updateError.hint
          },
          { status: 500 },
        );
      }

      // Check if update was successful and get the updated client
      if (!updateResult || updateResult.length === 0) {
        console.error("[PATCH /api/clients/[id]] Update returned no rows:", clientId);
        return NextResponse.json(
          { 
            error: "Erreur lors de la mise à jour du client",
            details: "Aucune ligne n'a été mise à jour",
          },
          { status: 500 },
        );
      }

      // Get the updated client (should be exactly one row)
      updatedClient = updateResult[0];
    }

    // Transform response - handle both opportunity-based and legacy clients
    const transformedClient = isOpportunityBased ? {
      // Opportunity-based client (already transformed above)
      ...updatedClient,
    } : {
      // Legacy client (from Supabase)
      id: updatedClient.id,
      nom: updatedClient.nom,
      telephone: updatedClient.telephone,
      ville: updatedClient.ville || "", // Ensure ville is always a string, never null/undefined
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
      nomProjet: updatedClient.nom_projet || "", // Get from Supabase
    };

    console.log(`[PATCH /api/clients/[id]] ✅ Updated client: ${clientId}`, {
      ville: transformedClient.ville,
      nomProjet: transformedClient.nomProjet
    });

    // OPTIMIZATION: Invalidate cache after updating client
    revalidatePath('/api/clients')
    revalidatePath(`/api/clients/${clientId}`)

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
