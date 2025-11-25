"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/contacts/[id]/mark-lost
 * Update contact status to "perdu"
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
        const { reason } = body;

        // Verify contact exists
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        // Update contact status to perdu
        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                status: 'perdu',
                notes: reason ? `${contact.notes || ''}\n\nPerdu: ${reason}` : contact.notes,
            },
        });

        // Create timeline entry
        await prisma.timeline.create({
            data: {
                contactId,
                eventType: 'status_changed',
                title: 'Contact marqué comme perdu',
                description: `Le contact a été marqué comme perdu. Raison: ${reason || 'Non spécifiée'}`,
                metadata: {
                    previousStatus: contact.status,
                    newStatus: 'perdu',
                    reason,
                },
                author: decoded.userId,
            },
        });

        return NextResponse.json({
            success: true,
            contact: updatedContact,
            message: 'Contact marqué comme perdu',
        });

    } catch (error) {
        console.error('Error marking contact as lost:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
