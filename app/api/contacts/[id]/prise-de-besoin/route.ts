"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
