"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/opportunities/[id]/acompte-recu
 * Update opportunity pipeline to "acompte_recu" and record payment
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

        const { id: opportunityId } = await params;
        const body = await request.json();
        const { montant, methode, reference, description } = body;

        if (!montant || !methode) {
            return NextResponse.json(
                { error: 'Montant et méthode de paiement sont requis' },
                { status: 400 }
            );
        }

        // Verify opportunity exists
        const opportunity = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            include: { contact: true }
        });

        if (!opportunity) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
        }

        // Update opportunity pipeline to acompte_recu
        const updatedOpportunity = await prisma.opportunity.update({
            where: { id: opportunityId },
            data: {
                pipelineStage: 'acompte_recu',
            },
        });

        // Create payment record (associated with contact)
        await prisma.contactPayment.create({
            data: {
                contactId: opportunity.contactId,
                montant: parseFloat(montant),
                methode,
                reference: reference || undefined,
                description: description || 'Acompte initial',
                createdBy: decoded.userId,
            },
        });

        // Create timeline entry for the opportunity
        await prisma.timeline.create({
            data: {
                contactId: opportunity.contactId,
                opportunityId: opportunityId,
                eventType: 'status_changed',
                title: '💰 Acompte reçu',
                description: `Pipeline mis à jour: Acompte reçu. Montant: ${montant} MAD (${methode})`,
                metadata: {
                    previousStage: opportunity.pipelineStage,
                    newStage: 'acompte_recu',
                    montant: parseFloat(montant),
                    methode,
                    reference,
                },
                author: decoded.userId,
            },
        });

        return NextResponse.json({
            success: true,
            opportunity: updatedOpportunity,
            message: 'Acompte enregistré avec succès',
        });

    } catch (error) {
        console.error('Error updating opportunity to acompte_recu:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update opportunity';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}




