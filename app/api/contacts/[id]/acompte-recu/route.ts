"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/contacts/[id]/acompte-recu
 * Update contact status to "acompte_recu" and record payment
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
        const { montant, methode, reference, description } = body;

        if (!montant || !methode) {
            return NextResponse.json(
                { error: 'Montant et méthode de paiement sont requis' },
                { status: 400 }
            );
        }

        // Verify contact exists
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        // Update contact status to acompte_recu
        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                status: 'acompte_recu',
            },
        });

        // Create payment record
        await prisma.contactPayment.create({
            data: {
                contactId,
                montant: parseFloat(montant),
                methode,
                reference: reference || undefined,
                description: description || 'Acompte initial',
                createdBy: decoded.userId,
            },
        });

        // Create timeline entry
        await prisma.timeline.create({
            data: {
                contactId,
                eventType: 'status_changed',
                title: 'Acompte reçu',
                description: `Statut mis à jour: Prise de besoin → Acompte reçu. Montant: ${montant} MAD`,
                metadata: {
                    previousStatus: 'prise_de_besoin',
                    newStatus: 'acompte_recu',
                    montant: parseFloat(montant),
                    methode,
                    reference,
                },
                author: decoded.userId,
            },
        });

        return NextResponse.json({
            success: true,
            contact: updatedContact,
            message: 'Acompte enregistré avec succès',
        });

    } catch (error) {
        console.error('Error updating contact to acompte_recu:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
