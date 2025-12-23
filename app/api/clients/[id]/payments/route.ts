import { prisma } from "@/lib/database";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(12)
    .toString("base64")
    .replace(/[^a-z0-9]/gi, "")
    .substring(0, 12);
  return `c${timestamp}${randomPart}`.substring(0, 25);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// POST /api/clients/[id]/payments - Add a payment to a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const clientId = resolvedParams.id;
    const body = await request.json();

    console.log("[Add Payment] Request for client:", clientId);
    console.log("[Add Payment] Payment data:", body);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify client exists
    const { data: client, error: fetchError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single();

    if (fetchError || !client) {
      console.error("[Add Payment] Client not found:", fetchError);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // 2. Determine payment type before creating payment
    const { data: clientDataForType } = await supabase
      .from("clients")
      .select("statut_projet")
      .eq("id", clientId)
      .single();

    const hasAcompteStatusForType =
      clientDataForType &&
      [
        "acompte_recu",
        "acompte_verse",
        "conception",
        "devis_negociation",
        "accepte",
        "premier_depot",
        "projet_en_cours",
        "chantier",
        "facture_reglee",
      ].includes(clientDataForType.statut_projet);

    // Check if client already has acompte payments specifically (not just any payment)
    // Query for payments with type = "accompte" (case-insensitive check)
    const { data: allPayments } = await supabase
      .from("payments")
      .select("id, type")
      .eq("client_id", clientId);

    // Filter for acompte payments (check both lowercase and capitalized)
    const existingAcomptePayments = (allPayments || []).filter(
      (p) => p.type && (p.type.toLowerCase() === "accompte" || p.type === "Acompte")
    );

    const hasExistingAcomptePayment = existingAcomptePayments.length > 0;
    
    console.log("[Add Payment] Payment type determination:", {
      hasAcompteStatus: hasAcompteStatusForType,
      hasExistingAcomptePayment,
      existingAcompteCount: existingAcomptePayments.length,
      providedPaymentType: body.paymentType,
    });
    
    // ALWAYS use paymentType from body if provided (frontend modal is source of truth)
    // Only determine it if not provided (fallback)
    let paymentType: string;
    if (body.paymentType && (body.paymentType === "accompte" || body.paymentType === "paiement")) {
      // Use the provided payment type from frontend (modal determines this)
      paymentType = body.paymentType;
      console.log("[Add Payment] ✅ Using provided payment type from modal:", paymentType);
    } else {
      // Fallback: determine payment type (shouldn't happen if modal is working correctly)
      const isFirstAcompte = !hasAcompteStatusForType && !hasExistingAcomptePayment;
      paymentType = isFirstAcompte ? "accompte" : "paiement";
      console.log("[Add Payment] ⚠️ Determined payment type (fallback):", paymentType, "(isFirstAcompte:", isFirstAcompte, ")");
    }

    // 2. Create payment in payments table
    const now = new Date().toISOString();
    const { data: newPayment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        id: generateCuid(),
        client_id: clientId,
        montant: body.montant !== undefined && body.montant !== null ? parseFloat(body.montant) : 0,
        date: body.date || now,
        methode: body.methode || "virement",
        reference: body.reference || null,
        description: body.description || "",
        type: paymentType, // Tag the payment type
        created_by: body.createdBy || "Utilisateur",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (paymentError || !newPayment) {
      console.error("[Add Payment] Payment creation error:", paymentError);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 },
      );
    }

    // 3. Create history entry (use the paymentType already determined above)
    const paymentTypeCapitalized = paymentType === "accompte" ? "Acompte" : "Paiement";

    // 4. Add entry to historique with dynamic terminology
    const { error: historiqueError } = await supabase
      .from("historique")
      .insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: paymentType,
        description: `${paymentTypeCapitalized} reçu: ${body.montant} MAD (${body.methode})${body.reference ? ` - Réf: ${body.reference}` : ""}`,
        auteur: body.createdBy || "Utilisateur",
        metadata: { paymentId: newPayment.id },
        created_at: now,
        updated_at: now,
      });

    // 4. Update client's derniere_maj
    await supabase
      .from("clients")
      .update({
        derniere_maj: now,
        updated_at: now,
      })
      .eq("id", clientId);

    // 5. Check if client should progress to next stage automatically
    // If client is in "qualifie" stage and now has a payment, move to "acompte_recu"
    const { data: currentStageHistory, error: stageError } = await supabase
      .from("client_stage_history")
      .select("stage_name, started_at")
      .eq("client_id", clientId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    console.log(
      "[Add Payment] Current stage from history:",
      currentStageHistory?.stage_name,
      "Error:",
      stageError?.message,
    );

    // Fallback: check client's statut_projet if no stage history exists
    let currentStageName = currentStageHistory?.stage_name;
    if (!currentStageName) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("statut_projet")
        .eq("id", clientId)
        .single();
      currentStageName = clientData?.statut_projet;
      console.log(
        "[Add Payment] No stage history found, using client.statut_projet:",
        currentStageName,
      );
    }

    console.log("[Add Payment] Condition check:", {
      hasStageHistory: !!currentStageHistory,
      stageName: currentStageName,
      isQualifie: currentStageName === "qualifie",
      justAddedPayment: true,
    });

    // Auto-progress if client is in "qualifie" or "prise_de_besoin" stage and this is an acompte payment
    let stageProgressed = false;
    
    // Normalize payment type for comparison (handle both "accompte" and "Acompte")
    const normalizedPaymentType = paymentType?.toLowerCase();
    const isAcomptePayment = normalizedPaymentType === "accompte";
    const isQualifieOrPriseDeBesoin = currentStageName === "qualifie" || currentStageName === "prise_de_besoin";
    const shouldProgressStage = isAcomptePayment && isQualifieOrPriseDeBesoin;
    
    console.log("[Add Payment] Stage progression check:", {
      paymentType,
      normalizedPaymentType,
      currentStageName,
      shouldProgressStage,
      isAcompte: isAcomptePayment,
      isQualifieOrPriseDeBesoin,
      willProgress: shouldProgressStage
    });
    
    if (shouldProgressStage) {
      const previousStage = currentStageName;
      console.log(
        `[Add Payment] ✅ Auto-progressing stage: ${previousStage} → acompte_recu (acompte payment added)`,
      );

      // Close current stage if it exists in history
      if (currentStageHistory) {
        const startedAt = new Date(currentStageHistory.started_at || now);
        const endedAt = new Date(now);
        const durationSeconds = Math.floor(
          (endedAt.getTime() - startedAt.getTime()) / 1000,
        );

        await supabase
          .from("client_stage_history")
          .update({
            ended_at: now,
            duration_seconds: durationSeconds,
            updated_at: now,
          })
          .eq("client_id", clientId)
          .is("ended_at", null);
      }

      // Create new stage entry
      const crypto = require("crypto");
      const stageId = crypto.randomUUID();

      await supabase.from("client_stage_history").insert({
        id: stageId,
        client_id: clientId,
        stage_name: "acompte_recu",
        started_at: now,
        ended_at: null,
        duration_seconds: null,
        changed_by: body.createdBy || "Système",
        created_at: now,
        updated_at: now,
      });

      // CRITICAL: ALWAYS update client's statut_projet directly in Supabase FIRST
      // This ensures the stage is updated immediately and reliably
      console.log("[Add Payment] 🔄 Updating client statut_projet to acompte_recu...");
      const { error: updateClientError, data: updatedClient } = await supabase
        .from("clients")
        .update({
          statut_projet: "acompte_recu",
          derniere_maj: now,
          updated_at: now,
        })
        .eq("id", clientId)
        .select("statut_projet")
        .single();

      if (updateClientError) {
        console.error("[Add Payment] ❌ Error updating client statut_projet:", updateClientError);
        // Try again without select to ensure update happens
        const { error: retryError } = await supabase
          .from("clients")
          .update({
            statut_projet: "acompte_recu",
            derniere_maj: now,
            updated_at: now,
          })
          .eq("id", clientId);
        
        if (retryError) {
          console.error("[Add Payment] ❌ Retry also failed:", retryError);
        } else {
          console.log("[Add Payment] ✅ Client statut_projet updated to acompte_recu (retry succeeded)");
          stageProgressed = true;
        }
      } else {
        console.log("[Add Payment] ✅ Client statut_projet updated to acompte_recu:", {
          statut_projet: updatedClient?.statut_projet,
          clientId
        });
        stageProgressed = true;
        
        // Verify the update actually worked
        if (updatedClient?.statut_projet !== "acompte_recu") {
          console.warn("[Add Payment] ⚠️ WARNING: Update returned but statut_projet doesn't match! Retrying...");
          // Force update again
          const { error: forceError } = await supabase
            .from("clients")
            .update({
              statut_projet: "acompte_recu",
            })
            .eq("id", clientId);
          
          if (!forceError) {
            console.log("[Add Payment] ✅ Force update succeeded");
          }
        }
      }

      // Add to historique
      const historiqueId = crypto.randomUUID();
      const { error: historiqueError } = await supabase.from("historique").insert({
        id: historiqueId,
        client_id: clientId,
        date: now,
        type: "statut",
        description:
          `Statut changé automatiquement vers: acompte_recu (premier acompte reçu)`,
        auteur: body.createdBy || "Système",
        previous_status: previousStage,
        new_status: "acompte_recu",
        timestamp_start: now,
        created_at: now,
        updated_at: now,
      });

      if (historiqueError) {
        console.error("[Add Payment] ❌ Error adding historique entry:", historiqueError);
      } else {
        console.log("[Add Payment] ✅ Historique entry added");
      }

      // OPTIONAL: Try to call stage API endpoint for opportunity synchronization (non-blocking)
      // This is a secondary step to ensure opportunity pipeline stages are also updated
      if (clientId.includes("-")) {
        // Only call stage API for opportunity-based clients
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
            (request.headers.get('host') ? `http://${request.headers.get('host')}` : 'http://localhost:3000');
          const stageApiUrl = `${baseUrl}/api/clients/${clientId}/stage`;
          
          console.log("[Add Payment] 📡 Calling stage API endpoint for opportunity sync...", {
            url: stageApiUrl,
            newStage: "acompte_recu",
            changedBy: body.createdBy || "Système"
          });
          
          // Get auth cookie from request to pass to stage API
          const authCookie = request.headers.get('cookie');
          
          // Don't await - fire and forget for opportunity sync
          fetch(stageApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': authCookie || '',
            },
            body: JSON.stringify({
              newStage: "acompte_recu",
              changedBy: body.createdBy || "Système",
            }),
          }).then(async (stageResponse) => {
            if (stageResponse.ok) {
              const stageResult = await stageResponse.json();
              console.log("[Add Payment] ✅ Stage API endpoint called successfully (opportunity sync):", {
                success: stageResult.success,
                newStage: stageResult.newStage
              });
            } else {
              const errorText = await stageResponse.text();
              console.warn("[Add Payment] ⚠️ Stage API endpoint failed (non-critical for opportunity sync):", {
                status: stageResponse.status,
                error: errorText
              });
            }
          }).catch((stageError) => {
            console.warn("[Add Payment] ⚠️ Stage API endpoint error (non-critical):", stageError);
          });
        } catch (stageError: any) {
          console.warn("[Add Payment] ⚠️ Error calling stage API endpoint (non-critical):", stageError);
        }
      }
      
      if (stageProgressed) {
        console.log("[Add Payment] ✅ Stage auto-progressed to acompte_recu");
      }
    } else if (paymentType === "paiement") {
      console.log(
        "[Add Payment] ℹ️ Regular payment added, no stage progression needed",
      );
    }

    console.log(
      `[Add Payment] ✅ ${paymentTypeCapitalized} created:`,
      newPayment.id,
    );

    // CRITICAL: Verify stage was updated correctly after stage progression
    let updatedStatus = null;
    let currentStageFromHistory = null;
    if (stageProgressed) {
      // Get updated client status - verify it was actually updated
      const { data: updatedClientData, error: statusError } = await supabase
        .from("clients")
        .select("statut_projet")
        .eq("id", clientId)
        .single();
      
      if (statusError) {
        console.error("[Add Payment] ❌ Error fetching updated client status:", statusError);
      } else {
        updatedStatus = updatedClientData?.statut_projet;
        console.log("[Add Payment] ✅ Verified client status after stage progression:", {
          statut_projet: updatedStatus,
          expected: "acompte_recu",
          matches: updatedStatus === "acompte_recu",
          clientId
        });
        
        // If status doesn't match, log warning and try to fix it
        if (updatedStatus !== "acompte_recu") {
          console.warn("[Add Payment] ⚠️ WARNING: Client status does not match expected stage! Attempting to fix...", {
            expected: "acompte_recu",
            actual: updatedStatus
          });
          
          // Force update again
          const { error: fixError } = await supabase
            .from("clients")
            .update({
              statut_projet: "acompte_recu",
              derniere_maj: now,
              updated_at: now,
            })
            .eq("id", clientId);
          
          if (!fixError) {
            updatedStatus = "acompte_recu";
            console.log("[Add Payment] ✅ Fixed client status to acompte_recu");
          } else {
            console.error("[Add Payment] ❌ Failed to fix client status:", fixError);
          }
        }
      }
      
      // Get current stage from history (source of truth)
      const { data: stageHistoryData, error: historyError } = await supabase
        .from("client_stage_history")
        .select("stage_name")
        .eq("client_id", clientId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();
      
      if (historyError) {
        console.error("[Add Payment] ❌ Error fetching stage history:", historyError);
      } else {
        currentStageFromHistory = stageHistoryData?.stage_name;
        console.log("[Add Payment] ✅ Verified stage from history:", {
          stage_from_history: currentStageFromHistory,
          expected: "acompte_recu",
          matches: currentStageFromHistory === "acompte_recu"
        });
      }
    }

    // Transform payment to frontend format
    const transformedPayment = {
      id: newPayment.id,
      amount: newPayment.montant,
      date: newPayment.date,
      method: newPayment.methode,
      reference: newPayment.reference,
      notes: newPayment.description,
      type: newPayment.type || paymentType, // Include payment type
      createdBy: newPayment.created_by,
      createdAt: newPayment.created_at,
    };

    // Ensure we return the correct stage information
    const finalStage = updatedStatus || (stageProgressed ? "acompte_recu" : null);
    
    console.log("[Add Payment] 📤 Returning response:", {
      success: true,
      stageProgressed,
      newStage: stageProgressed ? "acompte_recu" : null,
      updatedStatus: finalStage,
      currentStage: currentStageFromHistory || finalStage,
    });

    return NextResponse.json({
      success: true,
      data: transformedPayment,
      stageProgressed,
      newStage: stageProgressed ? "acompte_recu" : null,
      updatedStatus: finalStage,
      currentStage: currentStageFromHistory || finalStage,
      // Include explicit stage update confirmation
      stageUpdated: stageProgressed,
      clientStage: finalStage,
    });
  } catch (error: any) {
    console.error("[Add Payment] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// PATCH /api/clients/[id]/payments - Update a payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const clientId = resolvedParams.id;
    const body = await request.json();
    const { paymentId, montant, date, methode, reference, description, type, updatedBy } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 },
      );
    }

    console.log("[Update Payment] Request for client:", clientId, "payment:", paymentId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Try fetching current payment from Supabase payments list (preferred)
    const { data: currentPayment, error: fetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("client_id", clientId)
      .single();

    if (currentPayment && !fetchError) {
      // 2. Update payment in Supabase
      const now = new Date().toISOString();
      const updateData: any = {
        updated_at: now,
      };

      if (montant !== undefined) updateData.montant = parseFloat(montant);
      if (date !== undefined) updateData.date = date;
      if (methode !== undefined) updateData.methode = methode;
      if (reference !== undefined) updateData.reference = reference || null;
      if (description !== undefined) updateData.description = description || "";
      if (type !== undefined) updateData.type = type;

      const { data: updatedPayment, error: updateError } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId)
        .eq("client_id", clientId)
        .select()
        .single();

      if (updateError || !updatedPayment) {
        console.error("[Update Payment] Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update payment", details: updateError?.message },
          { status: 500 },
        );
      }

      // 3. Create history entry for traceability
      const changes: string[] = [];
      if (montant !== undefined && montant !== currentPayment.montant) {
        changes.push(`montant: ${formatCurrency(currentPayment.montant)} → ${formatCurrency(montant)}`);
      }
      if (date !== undefined && date !== currentPayment.date) {
        changes.push(`date: ${new Date(currentPayment.date).toLocaleDateString("fr-FR")} → ${new Date(date).toLocaleDateString("fr-FR")}`);
      }
      if (methode !== undefined && methode !== currentPayment.methode) {
        changes.push(`méthode: ${currentPayment.methode} → ${methode}`);
      }
      if (reference !== undefined && reference !== currentPayment.reference) {
        changes.push(`référence: ${currentPayment.reference || "N/A"} → ${reference || "N/A"}`);
      }
      if (description !== undefined && description !== currentPayment.description) {
        changes.push("description modifiée");
      }
      if (type !== undefined && type !== currentPayment.type) {
        const typeLabel = type === "accompte" ? "Acompte" : "Paiement";
        const oldTypeLabel = currentPayment.type === "accompte" ? "Acompte" : "Paiement";
        changes.push(`type: ${oldTypeLabel} → ${typeLabel}`);
      }

      if (changes.length > 0) {
        const paymentTypeCapitalized = updatedPayment.type === "accompte" ? "Acompte" : "Paiement";
        await supabase.from("historique").insert({
          id: generateCuid(),
          client_id: clientId,
          date: now,
          type: updatedPayment.type,
          description: `${paymentTypeCapitalized} modifié: ${changes.join(", ")}`,
          auteur: updatedBy || "Utilisateur",
          metadata: { paymentId, changes: changes },
          created_at: now,
          updated_at: now,
        });
      }

      // 4. Update client's derniere_maj
      await supabase
        .from("clients")
        .update({
          derniere_maj: now,
          updated_at: now,
        })
        .eq("id", clientId);

      console.log("[Update Payment] ✅ Payment updated successfully in Supabase");

      // Transform payment to frontend format
      const transformedPayment = {
        id: updatedPayment.id,
        amount: updatedPayment.montant,
        date: updatedPayment.date,
        method: updatedPayment.methode,
        reference: updatedPayment.reference,
        notes: updatedPayment.description,
        type: updatedPayment.type,
        createdBy: updatedPayment.created_by,
        createdAt: updatedPayment.created_at,
      };

      return NextResponse.json({
        success: true,
        data: transformedPayment,
      });
    }

    // Fallback: Check if payment exists in Prisma ContactPayment
    const isOpportunityClient = clientId.includes("-") && clientId.split("-").length === 2;
    if (!currentPayment && isOpportunityClient) {
      const [contactId] = clientId.split("-");
      console.log("[Update Payment] Checking Prisma ContactPayment for contact:", contactId);

      try {
        const contactPayment = await prisma.contactPayment.findUnique({
          where: { id: paymentId }
        });

        if (contactPayment) {
          // Update Prisma payment
          const updateData: any = {};
          if (montant !== undefined) updateData.montant = parseFloat(montant);
          if (date !== undefined) updateData.date = new Date(date);
          if (methode !== undefined) updateData.methode = methode;
          if (reference !== undefined) updateData.reference = reference || null;
          if (description !== undefined) updateData.description = description || "";
          if (type !== undefined) updateData.type = type;

          const updatedPrismaPayment = await prisma.contactPayment.update({
            where: { id: paymentId },
            data: updateData
          });

          console.log("[Update Payment] ✅ Payment updated successfully in Prisma");

          // Transform for frontend
          const transformedPrismaPayment = {
            id: updatedPrismaPayment.id,
            amount: updatedPrismaPayment.montant,
            date: updatedPrismaPayment.date,
            method: updatedPrismaPayment.methode,
            reference: updatedPrismaPayment.reference,
            notes: updatedPrismaPayment.description,
            type: updatedPrismaPayment.type,
            createdBy: updatedPrismaPayment.createdBy,
            createdAt: updatedPrismaPayment.createdAt,
          };

          return NextResponse.json({
            success: true,
            data: transformedPrismaPayment,
          });
        }
      } catch (prismaError) {
        console.error("[Update Payment] Prisma error:", prismaError);
      }
    }

    // If we're here, payment wasn't found in either place
    console.error("[Update Payment] Payment not found:", fetchError);
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[Update Payment] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// DELETE /api/clients/[id]/payments - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const clientId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 },
      );
    }

    console.log(
      "[Delete Payment] Request for client:",
      clientId,
      "payment:",
      paymentId,
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Try deleting from Supabase payments table
    const { data: deletedPayment, error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("client_id", clientId)
      .select()
      .single();

    if (!deleteError && deletedPayment) {
      const now = new Date().toISOString();
      const wasAcompte = deletedPayment.type === "accompte" || deletedPayment.type === "Acompte";
      
      // 2. Create history entry
      await supabase.from("historique").insert({
        id: generateCuid(),
        client_id: clientId,
        date: now,
        type: wasAcompte ? "accompte" : "modification",
        description: wasAcompte ? "Acompte supprimé" : "Paiement supprimé",
        auteur: "Admin",
        metadata: { paymentId, wasAcompte },
        created_at: now,
        updated_at: now,
      });

      // 3. Check if we need to revert stage (if acompte was deleted and no more acompte payments exist)
      let stageReverted = false;
      if (wasAcompte) {
        // Check if there are any remaining acompte payments
        const { data: remainingPayments } = await supabase
          .from("payments")
          .select("id, type")
          .eq("client_id", clientId);

        const remainingAcomptePayments = (remainingPayments || []).filter(
          (p) => p.type && (p.type.toLowerCase() === "accompte" || p.type === "Acompte")
        );

        // If no more acompte payments, revert stage to "prise_de_besoin"
        if (remainingAcomptePayments.length === 0) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("statut_projet")
            .eq("id", clientId)
            .single();

          const currentStatus = clientData?.statut_projet;
          
          // Only revert if currently in acompte_recu or later stages
          if (currentStatus === "acompte_recu" || currentStatus === "acompte_verse") {
            console.log("[Delete Payment] Reverting stage: acompte_recu → prise_de_besoin (no more acompte payments)");

            // Close current stage in history
            const { data: currentStageHistory } = await supabase
              .from("client_stage_history")
              .select("stage_name, started_at")
              .eq("client_id", clientId)
              .is("ended_at", null)
              .order("started_at", { ascending: false })
              .limit(1)
              .single();

            if (currentStageHistory) {
              const startedAt = new Date(currentStageHistory.started_at || now);
              const endedAt = new Date(now);
              const durationSeconds = Math.floor(
                (endedAt.getTime() - startedAt.getTime()) / 1000,
              );

              await supabase
                .from("client_stage_history")
                .update({
                  ended_at: now,
                  duration_seconds: durationSeconds,
                  updated_at: now,
                })
                .eq("client_id", clientId)
                .is("ended_at", null);
            }

            // Create new stage entry for "prise_de_besoin"
            const crypto = require("crypto");
            const stageId = crypto.randomUUID();

            await supabase.from("client_stage_history").insert({
              id: stageId,
              client_id: clientId,
              stage_name: "prise_de_besoin",
              started_at: now,
              ended_at: null,
              duration_seconds: null,
              changed_by: "Système",
              created_at: now,
              updated_at: now,
            });

            // Update client's statut_projet
            await supabase
              .from("clients")
              .update({
                statut_projet: "prise_de_besoin",
                derniere_maj: now,
                updated_at: now,
              })
              .eq("id", clientId);

            // Add to historique
            await supabase.from("historique").insert({
              id: crypto.randomUUID(),
              client_id: clientId,
              date: now,
              type: "statut",
              description: "Statut changé automatiquement vers: prise_de_besoin (acompte supprimé)",
              auteur: "Système",
              previous_status: currentStatus,
              new_status: "prise_de_besoin",
              timestamp_start: now,
              created_at: now,
              updated_at: now,
            });

            stageReverted = true;
            console.log("[Delete Payment] ✅ Stage reverted to prise_de_besoin");
          }
        }
      }

      // 4. Update client's derniere_maj (if stage wasn't already updated)
      if (!stageReverted) {
        await supabase
          .from("clients")
          .update({
            derniere_maj: now,
            updated_at: now,
          })
          .eq("id", clientId);
      }

      console.log("[Delete Payment] ✅ Payment deleted successfully from Supabase");

      return NextResponse.json({
        success: true,
        message: "Payment deleted successfully",
        stageReverted,
      });
    }

    // Fallback: Try deleting from Prisma ContactPayment (if linked to contact)
    // Check if this is an opportunity-based client (composite ID: contactId-opportunityId)
    const isOpportunityClient =
      clientId.includes("-") && clientId.split("-").length === 2;

    if (isOpportunityClient) {
      const [contactId] = clientId.split("-");
      console.log("[Delete Payment] Checking Prisma ContactPayment for contact:", contactId);

      try {
        // Verify payment belongs to contact first (optional but safer)
        const contactPayment = await prisma.contactPayment.findFirst({
          where: {
            id: paymentId,
            contactId: contactId
          }
        });

        if (contactPayment) {
          await prisma.contactPayment.delete({
            where: { id: paymentId }
          });

          console.log("[Delete Payment] ✅ Payment deleted successfully from Prisma");

          return NextResponse.json({
            success: true,
            message: "Payment deleted successfully",
          });
        }
      } catch (prismaError) {
        console.error("[Delete Payment] Prisma error:", prismaError);
      }
    }

    // If we reached here, payment wasn't found in either place or error occurred
    if (deleteError) {
      console.error("[Delete Payment] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete payment", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Payment not found" },
      { status: 404 },
    );

  } catch (error: any) {
    console.error("[Delete Payment] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
