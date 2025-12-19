"use server"

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/database';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Generate CUID-like ID
function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 12);
  return `c${timestamp}${randomPart}`.substring(0, 25);
}

/**
 * POST /api/contacts/[id]/prise-de-besoin
 * Update contact status to "prise_de_besoin"
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
        const { notes } = body;

        // Verify contact exists
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        // Get current user name for note author
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        const authorName = user?.name || 'Utilisateur';

        // Update contact status to prise_de_besoin
        // Clean existing notes to remove placeholder text
        const existingNotes = (contact.notes || '')
          .replace(/===\s*Prise de besoin\s*===\s*/gi, '')
          .replace(/^\s*confirmer\s*$/gi, '')
          .trim()
        
        // Append new notes cleanly
        const updatedNotes = notes 
          ? existingNotes 
            ? `${existingNotes}\n\n${notes.trim()}`
            : notes.trim()
          : existingNotes

        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                status: 'prise_de_besoin',
                notes: updatedNotes || null,
            },
        });

        // Create note in unified Note table for notes history tracking
        await prisma.note.create({
            data: {
                content: notes.trim(),
                author: authorName,
                authorId: decoded.userId,
                entityType: 'contact',
                entityId: contactId,
                sourceType: 'contact',
                sourceId: contactId,
                createdAt: new Date(),
            },
        });

        // Create timeline entry
        await prisma.timeline.create({
            data: {
                contactId,
                eventType: 'status_changed',
                title: 'Prise de besoin effectuée',
                description: `Statut mis à jour: Qualifié → Prise de besoin`,
                metadata: {
                    previousStatus: 'qualifie',
                    newStatus: 'prise_de_besoin',
                    notes,
                },
                author: decoded.userId,
            },
        });

        // If contact has been converted to client, also add note to client historique
        if (supabaseUrl && supabaseServiceKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                
                // Find all clients related to this contact
                // Check for clients with composite IDs (format: contactId-opportunityId)
                const { data: clientsWithCompositeId } = await supabase
                    .from('clients')
                    .select('id')
                    .like('id', `${contactId}-%`);
                
                // Also check if contact has opportunities that might have clients
                const opportunities = await prisma.opportunity.findMany({
                    where: { contactId },
                    select: { id: true },
                });
                
                const clientIds: string[] = [];
                if (clientsWithCompositeId) {
                    clientIds.push(...clientsWithCompositeId.map(c => c.id));
                }
                // Add opportunity-based client IDs
                opportunities.forEach(opp => {
                    const compositeClientId = `${contactId}-${opp.id}`;
                    if (!clientIds.includes(compositeClientId)) {
                        clientIds.push(compositeClientId);
                    }
                });
                
                // Add note to historique for all related clients
                if (clientIds.length > 0) {
                    const now = new Date().toISOString();
                    const historiqueEntries = clientIds.map(clientId => ({
                        id: generateCuid(),
                        client_id: clientId,
                        date: now,
                        type: 'note',
                        description: notes.trim(),
                        auteur: authorName,
                        metadata: {
                            source: 'contact',
                            contactId: contactId,
                            noteType: 'prise_de_besoin',
                        },
                        created_at: now,
                        updated_at: now,
                    }));
                    
                    await supabase
                        .from('historique')
                        .insert(historiqueEntries);
                    
                    console.log(`[Prise de Besoin] ✅ Added note to ${clientIds.length} client(s) historique`);
                }
            } catch (clientError) {
                console.error('[Prise de Besoin] Error adding note to client historique (non-blocking):', clientError);
                // Don't fail the request if client historique update fails
            }
        }

        return NextResponse.json({
            success: true,
            contact: updatedContact,
            message: 'Prise de besoin enregistrée avec succès',
        });

    } catch (error) {
        console.error('Error updating contact to prise_de_besoin:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
