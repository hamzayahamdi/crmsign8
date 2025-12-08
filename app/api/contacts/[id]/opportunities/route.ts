"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Initialize Supabase client for client record creation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/contacts/[id]/opportunities
 * Create a new opportunity for a contact
 */
/**
 * POST /api/contacts/[id]/opportunities
 * Create a new opportunity for a contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: contactId } = await params;
    const body = await request.json();
    let { titre, type, budget, description, architecteAssigne, dateClotureAttendue } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      );
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { opportunities: true }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // CRITICAL: Ensure titre is never empty - generate default if not provided
    if (!titre || !titre.trim()) {
      const typeLabels: Record<string, string> = {
        villa: 'Villa',
        appartement: 'Appartement',
        magasin: 'Magasin',
        bureau: 'Bureau',
        riad: 'Riad',
        studio: 'Studio',
        renovation: 'Rénovation',
        autre: 'Autre'
      };
      const typeLabel = typeLabels[type] || 'Projet';
      const suffix = contact.ville || contact.nom;
      titre = `${typeLabel}${suffix ? ` - ${suffix}` : ''}`;
      console.log('[Create Opportunity] Auto-generated title:', titre);
    }

    console.log('[Create Opportunity] Creating opportunity:', { titre, type, contactId });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Determine pipeline stage based on contact status
    // If contact has already paid acompte (status === 'acompte_recu'), 
    // new opportunities should start at 'acompte_recu' stage
    // Otherwise, default to 'projet_accepte'
    const defaultPipelineStage = contact.status === 'acompte_recu' 
      ? 'acompte_recu' 
      : 'projet_accepte';

    console.log('[Create Opportunity] Contact status:', contact.status, 'Setting pipeline stage to:', defaultPipelineStage);

    // Create opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        contactId,
        titre,
        type: type as any,
        statut: 'open',
        pipelineStage: defaultPipelineStage, // Set based on contact status
        budget: budget ? parseFloat(budget) : undefined,
        description: description || undefined,
        architecteAssigne: architecteAssigne || undefined,
        dateClotureAttendue: dateClotureAttendue ? new Date(dateClotureAttendue) : undefined,
        createdBy: decoded.userId,
      },
    });

    // Check if this is the first opportunity (or if contact is not yet a client)
    // The requirement says: Contact becomes Client ONLY IF they have at least 1 opportunity created
    // OR Have Acompte Reçu already done (which is a prerequisite for creating opportunity anyway)

    // We update the contact to be a client if it's not already
    if (contact.tag !== 'client') {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          tag: 'client',
          clientSince: new Date(),
          // We don't change the 'status' field here (it remains 'acompte_recu' or whatever it was)
          // The 'tag' is what determines if they show up in the Clients page
        }
      });

      // Log conversion to client
      await prisma.timeline.create({
        data: {
          contactId,
          eventType: 'status_changed',
          title: 'Contact converti en Client',
          description: 'Le contact est devenu client suite à la création d\'une opportunité',
          metadata: {
            previousTag: contact.tag,
            newTag: 'client'
          },
          author: decoded.userId,
        },
      });
    }

    // Log to timeline - opportunity created
    try {
      await prisma.timeline.create({
        data: {
          contactId,
          opportunityId: opportunity.id,
          eventType: 'opportunity_created',
          title: 'Opportunité créée',
          description: `Opportunité "${titre}" ajoutée au contact`,
          metadata: {
            type: type,
            budget: budget ? parseFloat(budget) : null,
            pipelineStage: defaultPipelineStage
          },
          author: decoded.userId,
        },
      });
    } catch (timelineErr) {
      console.error('Error creating opportunity_created timeline entry:', timelineErr);
      // Continue even if timeline creation fails
    }

    // Log architect assignment if provided
    if (architecteAssigne) {
      try {
        await prisma.timeline.create({
          data: {
            contactId,
            opportunityId: opportunity.id,
            eventType: 'architect_assigned',
            title: 'Architecte assigné',
            description: `${architecteAssigne} assigné à l'opportunité`,
            author: decoded.userId,
          },
        });
      } catch (timelineErr) {
        console.error('Error creating architect_assigned timeline entry:', timelineErr);
        // Continue even if timeline creation fails
      }
    }

    // 🎯 AUTOMATICALLY CREATE CLIENT RECORD FOR TRACEABILITY
    // Each opportunity should have a corresponding client record in Supabase
    // This ensures the opportunity appears on the clients page with proper stage tracking
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const clientId = `${contactId}-${opportunity.id}`;
        const now = new Date().toISOString();

        // Map pipeline stage to client status
        const stageToStatusMap: Record<string, string> = {
          'prise_de_besoin': 'prise_de_besoin',
          'projet_accepte': 'acompte_recu',
          'acompte_recu': 'acompte_recu',
          'gagnee': 'projet_en_cours',
          'perdue': 'refuse',
        };
        const initialStatus = stageToStatusMap[defaultPipelineStage] || 'nouveau';

        // Map opportunity type to project type
        const typeMap: Record<string, string> = {
          villa: 'villa',
          appartement: 'appartement',
          magasin: 'magasin',
          bureau: 'bureau',
          riad: 'riad',
          studio: 'studio',
          renovation: 'autre',
          autre: 'autre',
        };

        // Get architect name if architect ID is provided
        let architectName = contact.architecteAssigne || '';
        if (architecteAssigne) {
          try {
            const architect = await prisma.user.findUnique({
              where: { id: architecteAssigne },
              select: { name: true },
            });
            if (architect?.name) {
              architectName = architect.name;
            } else {
              architectName = architecteAssigne; // Fallback to ID if name not found
            }
          } catch (err) {
            architectName = architecteAssigne; // Fallback to provided value
          }
        }

        console.log('[Create Opportunity] Creating client record:', {
          clientId,
          nom: contact.nom,
          status: initialStatus,
          pipelineStage: defaultPipelineStage,
        });

        // Create or update client record
        const { error: clientError } = await supabase
          .from('clients')
          .upsert({
            id: clientId,
            nom: contact.nom || 'Client',
            telephone: contact.telephone || '',
            ville: contact.ville || '',
            email: contact.email || null,
            adresse: contact.adresse || null,
            architecte_assigne: architectName || contact.architecteAssigne || '',
            statut_projet: initialStatus,
            type_projet: typeMap[type] || 'autre',
            budget: budget ? parseFloat(budget) : 0,
            derniere_maj: now,
            lead_id: contact.leadId || null,
            commercial_attribue: contact.createdBy || decoded.userId,
            created_at: now,
            updated_at: now,
          }, {
            onConflict: 'id',
          });

        if (clientError) {
          console.error('[Create Opportunity] Error creating client record:', clientError);
          // Continue even if client creation fails - opportunity was already created
        } else {
          console.log('[Create Opportunity] ✅ Client record created/updated');

          // Create initial historique entry for traceability
          const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error: historiqueError } = await supabase
            .from('historique')
            .insert({
              id: historyId,
              client_id: clientId,
              date: now,
              type: 'statut',
              description: `Opportunité créée: "${titre}". Statut initial: ${initialStatus}`,
              auteur: user.name || user.email || decoded.userId,
              previous_status: 'nouveau',
              new_status: initialStatus,
              timestamp_start: now,
              created_at: now,
              updated_at: now,
            });

          if (historiqueError) {
            console.error('[Create Opportunity] Error creating historique entry:', historiqueError);
          } else {
            console.log('[Create Opportunity] ✅ Historique entry created');
          }

          // Create initial stage history entry
          const stageHistoryId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const { error: stageHistoryError } = await supabase
            .from('client_stage_history')
            .insert({
              id: stageHistoryId,
              client_id: clientId,
              stage_name: initialStatus,
              started_at: now,
              ended_at: null,
              duration_seconds: null,
              changed_by: user.name || user.email || decoded.userId,
              created_at: now,
              updated_at: now,
            });

          if (stageHistoryError) {
            console.error('[Create Opportunity] Error creating stage history entry:', stageHistoryError);
          } else {
            console.log('[Create Opportunity] ✅ Stage history entry created');
          }
        }
      } catch (supabaseErr) {
        console.error('[Create Opportunity] Error with Supabase operations:', supabaseErr);
        // Continue even if Supabase operations fail - opportunity was already created
      }
    } else {
      console.warn('[Create Opportunity] Supabase not configured, skipping client record creation');
    }

    return NextResponse.json(opportunity, { status: 201 });

  } catch (error) {
    console.error('Error creating opportunity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create opportunity';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contacts/[id]/opportunities
 * Get all opportunities for a contact
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
      verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: contactId } = await params;
    const opportunities = await prisma.opportunity.findMany({
      where: { contactId },
      include: {
        timeline: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ opportunities });

  } catch (error) {
    console.error('Error fetching opportunities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch opportunities';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
