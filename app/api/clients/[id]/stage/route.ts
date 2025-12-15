import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { prisma } from "@/lib/database";
import { verify } from "jsonwebtoken";
import { notifyStageChanged } from "@/lib/notification-creator";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("[POST /stage] ===== SIMPLIFIED VERSION START =====");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[POST /stage] Missing environment variables");
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

    const body = await request.json();
    const { newStage, changedBy } = body;

    if (!newStage || !changedBy) {
      return NextResponse.json(
        { error: "newStage et changedBy sont requis" },
        { status: 400 },
      );
    }

    const { id: clientId } = await params;
    console.log("[POST /stage] Client ID:", clientId);
    console.log("[POST /stage] New Stage:", newStage);
    console.log("[POST /stage] Changed By:", changedBy);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Get current status for better historique description
    let currentStatusForHistory = null;
    if (clientId.includes("-")) {
      // For opportunity clients, try to get from previous historique
      const { data: lastHistorique } = await supabase
        .from("historique")
        .select("new_status")
        .eq("client_id", clientId)
        .eq("type", "statut")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      currentStatusForHistory = lastHistorique?.new_status || "acompte_recu";
    } else {
      // For regular clients, get from clients table
      const { data: clientData } = await supabase
        .from("clients")
        .select("statut_projet")
        .eq("id", clientId)
        .single();
      currentStatusForHistory = clientData?.statut_projet;
    }

    // IMPORTANT: Create/update the client record FIRST to satisfy foreign key constraint
    console.log("[POST /stage] Updating client status...");

    if (clientId.includes("-")) {
      // For composite IDs (opportunity-based clients), update both opportunities table AND create/update client record
      console.log("[POST /stage] Updating opportunity-based client...");
      const [contactId, opportunityId] = clientId.split("-");

      console.log("[POST /stage] Using imported Prisma instance");

      try {
        console.log("[POST /stage] Fetching contact and opportunity data...");

        // Get contact and opportunity data
        const contact = await prisma.contact.findUnique({
          where: { id: contactId },
          include: {
            opportunities: {
              where: { id: opportunityId },
            },
          },
        });

        if (!contact) {
          console.error("[POST /stage] Contact not found:", contactId);
          return NextResponse.json(
            { error: "Contact introuvable" },
            { status: 404 },
          );
        }

        if (!contact.opportunities || contact.opportunities.length === 0) {
          console.error("[POST /stage] Opportunity not found:", opportunityId);
          return NextResponse.json(
            { error: "Opportunité introuvable" },
            { status: 404 },
          );
        }

        const opportunity = contact.opportunities[0];
        console.log(
          "[POST /stage] Found opportunity with current pipeline stage:",
          opportunity.pipelineStage,
        );

        // Map project status to pipeline stage - Support ALL stage transitions (forward and backward)
        // This allows opportunities to move to any stage, not just forward progression
        let pipelineStage = opportunity.pipelineStage; // Keep current stage as default
        
        // Map Kanban stages to pipeline stages - allow bidirectional movement
        if (newStage === "qualifie" || newStage === "nouveau") pipelineStage = "prise_de_besoin";
        if (newStage === "prise_de_besoin") pipelineStage = "prise_de_besoin";
        if (newStage === "acompte_recu" || newStage === "acompte_verse") pipelineStage = "acompte_recu";
        if (newStage === "conception" || newStage === "en_conception") pipelineStage = "acompte_recu";
        if (newStage === "devis_negociation" || newStage === "en_validation") pipelineStage = "acompte_recu";
        if (newStage === "accepte") pipelineStage = "projet_accepte";
        if (newStage === "refuse" || newStage === "perdu" || newStage === "annule" || newStage === "suspendu") pipelineStage = "perdue";
        if (newStage === "premier_depot") pipelineStage = "gagnee";
        if (newStage === "projet_en_cours" || newStage === "en_chantier" || newStage === "chantier") pipelineStage = "gagnee";
        if (newStage === "facture_reglee") pipelineStage = "gagnee";
        if (newStage === "livraison_termine" || newStage === "livraison" || newStage === "termine") pipelineStage = "gagnee";

        console.log("[POST /stage] Mapping:", newStage, "→", pipelineStage);

        // Update opportunity pipeline stage
        console.log("[POST /stage] Updating opportunity pipeline stage...");
        const updatedOpportunity = await prisma.opportunity.update({
          where: { id: opportunityId },
          data: {
            pipelineStage: pipelineStage,
            updatedAt: new Date(now),
          },
        });
        console.log(
          "[POST /stage] ✅ Opportunity pipeline stage updated from",
          opportunity.pipelineStage,
          "to",
          updatedOpportunity.pipelineStage,
        );

        // CRITICAL: Create/update client record BEFORE creating historique entry
        // This ensures the foreign key constraint is satisfied
        const typeMap = {
          villa: "villa",
          appartement: "appartement",
          magasin: "magasin",
          bureau: "bureau",
          riad: "riad",
          studio: "studio",
          renovation: "autre",
          autre: "autre",
        };

        console.log("[POST /stage] Creating/updating client record...");
        const { error: upsertError } = await supabase.from("clients").upsert({
          id: clientId,
          nom: contact.nom || "Client",
          telephone: contact.telephone || "",
          ville: contact.ville || "",
          architecte_assigne:
            opportunity.architecteAssigne || contact.architecteAssigne || "",
          statut_projet: newStage,
          type_projet: typeMap[opportunity.type] || "autre",
          derniere_maj: now,
          email: contact.email,
          adresse: contact.adresse,
          budget: opportunity.budget || 0,
          lead_id: contact.leadId,
          commercial_attribue: contact.createdBy,
          created_at: now,
          updated_at: now,
        });

        if (upsertError) {
          console.error("[POST /stage] Client upsert failed:", upsertError);
          return NextResponse.json(
            {
              error: "Erreur lors de la création du client",
              details: upsertError.message,
            },
            { status: 500 },
          );
        } else {
          console.log("[POST /stage] ✅ Client record created/updated");
        }
      } catch (opportunityError) {
        console.error(
          "[POST /stage] ❌ Critical error in opportunity update:",
          opportunityError,
        );
        console.error("[POST /stage] Error details:", {
          message: opportunityError.message,
          code: opportunityError.code,
          stack: opportunityError.stack,
        });

        return NextResponse.json(
          {
            error: "Erreur lors de la mise à jour de l'opportunité",
            details: opportunityError.message,
          },
          { status: 500 },
        );
      }
    } else {
      // For regular client IDs, update the clients table
      console.log("[POST /stage] Updating clients table...");
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          statut_projet: newStage,
          derniere_maj: now,
          updated_at: now,
        })
        .eq("id", clientId);

      if (updateError) {
        console.error("[POST /stage] Clients update failed:", updateError);
        return NextResponse.json(
          {
            error: "Erreur lors de la mise à jour du client",
            details: updateError.message,
          },
          { status: 500 },
        );
      } else {
        console.log("[POST /stage] ✅ Clients table updated");
      }
    }

    // NOW create the historique entry (after client record exists)
    console.log("[POST /stage] Creating stage history entry...");

    // Generate a simple ID
    const historyId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create descriptive status change message
    const statusLabels = {
      qualifie: "Qualifié",
      prise_de_besoin: "Prise de besoin",
      acompte_recu: "Acompte reçu",
      conception: "Conception",
      devis_negociation: "Devis/Négociation",
      accepte: "Accepté",
      refuse: "Refusé",
      premier_depot: "Premier dépôt",
      projet_en_cours: "Projet en cours",
      chantier: "Chantier",
      facture_reglee: "Facture réglée",
      livraison_termine: "Livraison & Terminé",
    };

    const fromLabel =
      statusLabels[currentStatusForHistory] || currentStatusForHistory;
    const toLabel = statusLabels[newStage] || newStage;

    // Insert into historique table for timeline tracking
    console.log("[POST /stage] Creating historique entry with data:", {
      id: historyId,
      client_id: clientId,
      date: now,
      type: "statut",
      description: `Statut changé de "${fromLabel}" vers "${toLabel}"`,
      auteur: changedBy,
      previous_status: currentStatusForHistory,
      new_status: newStage,
    });

    const { error: historiqueError } = await supabase
      .from("historique")
      .insert({
        id: historyId,
        client_id: clientId,
        date: now,
        type: "statut",
        description: `Statut changé de "${fromLabel}" vers "${toLabel}"`,
        auteur: changedBy,
        previous_status: currentStatusForHistory,
        new_status: newStage,
        timestamp_start: now,
        created_at: now,
        updated_at: now,
      });

    if (historiqueError) {
      console.error("[POST /stage] Historique insert failed:", historiqueError);
      console.error("[POST /stage] Full historique error:", {
        code: historiqueError.code,
        message: historiqueError.message,
        details: historiqueError.details,
        hint: historiqueError.hint,
      });
      return NextResponse.json(
        {
          error: "Erreur lors de la création de l'historique",
          details: historiqueError.message,
        },
        { status: 500 },
      );
    }

    console.log("[POST /stage] ✅ Historique entry created successfully");

    // Verify the historique entry was created by fetching it back
    const { data: verifyHistorique, error: verifyError } = await supabase
      .from("historique")
      .select("*")
      .eq("id", historyId)
      .single();

    if (verifyError) {
      console.error(
        "[POST /stage] ⚠️ Could not verify historique entry:",
        verifyError,
      );
    } else {
      console.log(
        "[POST /stage] ✅ Verified historique entry:",
        verifyHistorique,
      );
    }

    console.log("[POST /stage] ===== SUCCESS =====");

    // Fetch the updated client data to return
    const { data: updatedClient, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (fetchError) {
      console.error("[POST /stage] Error fetching updated client:", fetchError);
    }

    // Create notifications for relevant users (architect, commercial, etc.)
    try {
      // Get the user who made the change
      let currentUserId: string | null = null;
      try {
        const decoded = verify(authCookie.value, JWT_SECRET) as { userId: string; email: string; name?: string };
        currentUserId = decoded.userId;
      } catch (tokenError) {
        console.warn("[POST /stage] Could not decode token for notifications:", tokenError);
      }

      if (updatedClient && currentUserId) {
        const clientName = updatedClient.nom_projet || updatedClient.nom || "Client";
        const previousStage = currentStatusForHistory || "inconnu";
        const newStageLabel = newStage;

        // Get users to notify: architect assigned and commercial
        const usersToNotify: string[] = [];
        
        // Add architect if assigned
        if (updatedClient.architecte_assigne) {
          try {
            const architect = await prisma.user.findFirst({
              where: {
                OR: [
                  { id: updatedClient.architecte_assigne },
                  { name: { equals: updatedClient.architecte_assigne, mode: 'insensitive' } }
                ]
              },
              select: { id: true }
            });
            if (architect && architect.id !== currentUserId) {
              usersToNotify.push(architect.id);
            }
          } catch (architectError) {
            console.warn("[POST /stage] Could not find architect for notification:", architectError);
          }
        }

        // Add commercial if assigned
        if (updatedClient.commercial_attribue) {
          try {
            const commercial = await prisma.user.findFirst({
              where: {
                OR: [
                  { id: updatedClient.commercial_attribue },
                  { email: updatedClient.commercial_attribue }
                ]
              },
              select: { id: true }
            });
            if (commercial && commercial.id !== currentUserId && !usersToNotify.includes(commercial.id)) {
              usersToNotify.push(commercial.id);
            }
          } catch (commercialError) {
            console.warn("[POST /stage] Could not find commercial for notification:", commercialError);
          }
        }

        // Create notifications for all relevant users
        const notificationPromises = usersToNotify.map(userId =>
          notifyStageChanged({
            userId,
            clientName,
            clientId,
            previousStage,
            newStage: newStageLabel,
            createdBy: changedBy,
            projectName: updatedClient.nom_projet || undefined,
          }).catch(error => {
            console.error(`[POST /stage] Failed to create notification for user ${userId}:`, error);
            return null;
          })
        );

        await Promise.all(notificationPromises);
        console.log(`[POST /stage] ✅ Created ${usersToNotify.length} notifications for stage change`);
      }
    } catch (notificationError) {
      // Don't fail the request if notifications fail
      console.error("[POST /stage] Error creating notifications (non-critical):", notificationError);
    }

    return NextResponse.json({
      success: true,
      message: "Statut mis à jour avec succès",
      newStage: newStage,
      timestamp: now,
      data: updatedClient ? {
        id: updatedClient.id,
        nom: updatedClient.nom,
        telephone: updatedClient.telephone,
        ville: updatedClient.ville,
        architecteAssigne: updatedClient.architecte_assigne,
        statutProjet: updatedClient.statut_projet,
        typeProjet: updatedClient.type_projet,
        derniereMaj: updatedClient.derniere_maj,
        email: updatedClient.email,
        adresse: updatedClient.adresse,
        budget: updatedClient.budget,
        leadId: updatedClient.lead_id,
        commercialAttribue: updatedClient.commercial_attribue,
        createdAt: updatedClient.created_at,
        updatedAt: updatedClient.updated_at,
        nomProjet: updatedClient.nom_projet,
      } : null,
    });
  } catch (error) {
    console.error("[POST /stage] ===== ERROR =====");
    console.error("[POST /stage] Exception:", error);
    console.error("[POST /stage] Stack:", error.stack);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("[GET /stage] ===== START =====");

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
    console.log("[GET /stage] Client ID:", clientId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get history from the historique table instead
    const { data: history, error } = await supabase
      .from("historique")
      .select("*")
      .eq("client_id", clientId)
      .eq("type", "statut")
      .order("created_at", { ascending: false });

    console.log("[GET /stage] Query result:", {
      clientId,
      found: history?.length || 0,
      error: error?.message || null,
    });

    if (error) {
      console.error("[GET /stage] ERROR:", error);
      return NextResponse.json(
        {
          error: "Erreur lors de la récupération de l'historique",
          details: error.message,
        },
        { status: 500 },
      );
    }

    // Transform to match expected format
    const transformedHistory =
      history?.map((entry) => ({
        id: entry.id,
        clientId: entry.client_id,
        stageName: entry.new_status,
        startedAt: entry.timestamp_start || entry.created_at,
        endedAt: null,
        durationSeconds: null,
        changedBy: entry.auteur,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      })) || [];

    console.log("[GET /stage] Returning data:", {
      count: transformedHistory.length,
    });

    return NextResponse.json({
      success: true,
      data: transformedHistory,
    });
  } catch (error) {
    console.error("[GET /stage] Exception:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
