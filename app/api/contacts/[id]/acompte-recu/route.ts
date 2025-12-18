import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/database';

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
        const { montant, methode, reference, description, updateExisting, paymentId } = body;

        if (!montant) {
            return NextResponse.json(
                { error: 'Montant est requis' },
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

        // Update contact status to acompte_recu (if not already)
        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                status: 'acompte_recu',
            },
        });

        // Check if we should update existing payment or create new one
        if (updateExisting && paymentId) {
            // Update existing payment
            await prisma.contactPayment.update({
                where: { id: paymentId },
                data: {
                    montant: parseFloat(montant),
                    methode: methode || undefined,
                    reference: reference || undefined,
                    description: description || undefined,
                    updatedAt: new Date(),
                },
            });
        } else {
            // Check if acompte payment already exists
            const existingAcompte = await prisma.contactPayment.findFirst({
                where: {
                    contactId,
                    type: 'accompte',
                },
            });

            if (existingAcompte) {
                // Update existing acompte payment
                await prisma.contactPayment.update({
                    where: { id: existingAcompte.id },
                    data: {
                        montant: parseFloat(montant),
                        methode: methode || existingAcompte.methode || 'virement',
                        reference: reference || existingAcompte.reference || undefined,
                        description: description || existingAcompte.description || 'Acompte initial',
                        updatedAt: new Date(),
                    },
                });
            } else {
                // Create new payment record with type "accompte"
                await prisma.contactPayment.create({
                    data: {
                        contactId,
                        montant: parseFloat(montant),
                        methode: methode || 'virement',
                        reference: reference || undefined,
                        description: description || 'Acompte initial',
                        type: 'accompte', // Tag this payment as "accompte"
                        createdBy: decoded.userId,
                    },
                });
            }
        }

        // Create timeline entry only if this is a new payment (not an update)
        if (!updateExisting) {
            await prisma.timeline.create({
                data: {
                    contactId,
                    eventType: 'status_changed',
                    title: updateExisting ? 'Acompte mis à jour' : 'Acompte reçu',
                    description: updateExisting 
                        ? `Montant de l'acompte mis à jour: ${montant} MAD`
                        : `Statut mis à jour: Prise de besoin → Acompte reçu. Montant: ${montant} MAD`,
                    metadata: {
                        previousStatus: contact.status || 'prise_de_besoin',
                        newStatus: 'acompte_recu',
                        montant: parseFloat(montant),
                        methode: methode || 'virement',
                        reference,
                    },
                    author: decoded.userId,
                },
            });
        }

        return NextResponse.json({
            success: true,
            contact: updatedContact,
            message: updateExisting ? 'Acompte mis à jour avec succès' : 'Acompte enregistré avec succès',
        });

    } catch (error) {
        console.error('Error updating contact to acompte_recu:', error);
        
        // Handle database connection errors
        if (error instanceof Error) {
            if (error.message.includes('Can\'t reach database server') || 
                error.message.includes('Connection') ||
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ETIMEDOUT')) {
                return NextResponse.json(
                    { 
                        error: 'Database connection error. Please check your DATABASE_URL and ensure the database server is running.',
                        details: process.env.NODE_ENV === 'development' ? error.message : undefined
                    },
                    { status: 503 }
                );
            }
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to update contact';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
