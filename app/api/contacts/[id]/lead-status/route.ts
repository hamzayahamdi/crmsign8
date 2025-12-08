"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * PATCH /api/contacts/[id]/lead-status
 * 
 * Update the lead status of a contact
 * Creates a notification when status changes
 * Updates both Contact and Lead for full traceability
 * 
 * Request body:
 * {
 *   leadStatus: LeadStatus
 * }
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        // Handle both Next.js 14 (async params) and Next.js 13 (sync params)
        const params = await Promise.resolve(context.params);
        const contactId = params.id;

        console.log('🔍 PATCH /api/contacts/[id]/lead-status');
        console.log('📋 Contact ID:', contactId);

        if (!contactId) {
            console.error('❌ No contact ID provided');
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }

        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.error('❌ No authorization header');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const decoded = verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        console.log('👤 User ID:', userId);

        // 2. Get user details
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.error('❌ User not found:', userId);
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        console.log('✅ User found:', user.name);

        // 3. Parse request body
        const body = await request.json();
        const { leadStatus } = body;

        console.log('📝 New lead status:', leadStatus);

        if (!leadStatus) {
            return NextResponse.json({ error: 'leadStatus is required' }, { status: 400 });
        }

        // Validate leadStatus
        const validStatuses = ['nouveau', 'a_recontacter', 'sans_reponse', 'non_interesse', 'qualifie', 'refuse'];
        if (!validStatuses.includes(leadStatus)) {
            console.error('❌ Invalid lead status:', leadStatus);
            return NextResponse.json({ error: 'Invalid leadStatus' }, { status: 400 });
        }

        // 4. Get the contact
        console.log('🔍 Finding contact:', contactId);
        const contact = await prisma.contact.findUnique({
            where: { id: contactId }
        });

        if (!contact) {
            console.error('❌ Contact not found:', contactId);
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        console.log('✅ Contact found:', contact.nom);
        const previousStatus = contact.leadStatus;
        const previousContactStatus = contact.status;
        console.log('📊 Previous leadStatus:', previousStatus, '→ New leadStatus:', leadStatus);
        console.log('📊 Previous contact status:', previousContactStatus);

        // 5. Prepare update data - sync status field when leadStatus changes
        const updateData: any = {
            leadStatus: leadStatus,
        };

        // Sync contact status field based on leadStatus for traceability
        // When leadStatus is "refuse", set status to "perdu"
        // When leadStatus changes from "refuse" to something else, reset status to "qualifie" if it was "perdu"
        if (leadStatus === 'refuse') {
            updateData.status = 'perdu';
            console.log('🔄 Syncing contact status to "perdu" because leadStatus is "refuse"');
        } else if (previousStatus === 'refuse' && previousContactStatus === 'perdu') {
            // If changing from "refuse" to another status, reset to "qualifie"
            updateData.status = 'qualifie';
            console.log('🔄 Resetting contact status to "qualifie" because leadStatus changed from "refuse"');
        }

        // 5. Update contact lead status and status
        const updatedContact = await prisma.contact.update({
            where: { id: contactId },
            data: updateData,
        });

        console.log('✅ Contact updated successfully');
        if (updateData.status) {
            console.log(`✅ Contact status also updated to "${updateData.status}"`);
        }

        // 5.1. ALSO UPDATE THE ORIGINAL LEAD (for traceability across pages)
        if (contact.leadId) {
            try {
                await prisma.lead.update({
                    where: { id: contact.leadId },
                    data: { statut: leadStatus },
                });
                console.log(`✅ Also updated original Lead ${contact.leadId} status to ${leadStatus}`);
            } catch (error) {
                console.warn(`⚠️ Could not update original lead: ${error}`);
                // Don't fail the request if lead update fails
            }
        } else {
            console.log('ℹ️ No linked lead to update');
        }

        // 6. Create timeline entry for status change
        const statusChangeDescription = updateData.status
            ? `Statut Lead changé de "${previousStatus || 'aucun'}" à "${leadStatus}" et statut Contact changé de "${previousContactStatus}" à "${updateData.status}" par ${user.name}`
            : `Statut Lead changé de "${previousStatus || 'aucun'}" à "${leadStatus}" par ${user.name}`;

        await prisma.timeline.create({
            data: {
                contactId: contact.id,
                eventType: 'status_changed',
                title: 'Statut Lead modifié',
                description: statusChangeDescription,
                metadata: {
                    previousLeadStatus: previousStatus,
                    newLeadStatus: leadStatus,
                    previousContactStatus: previousContactStatus,
                    newContactStatus: updateData.status || previousContactStatus,
                    changedByUserId: userId,
                    changedByUserName: user.name,
                },
                author: userId,
            },
        });

        console.log('✅ Timeline entry created');

        // 7. Create notification for architect if assigned
        if (contact.architecteAssigne) {
            // Find architect user
            const architect = await prisma.user.findFirst({
                where: {
                    OR: [
                        { id: contact.architecteAssigne },
                        { name: { equals: contact.architecteAssigne, mode: 'insensitive' } }
                    ]
                }
            });

            if (architect) {
                await prisma.notification.create({
                    data: {
                        userId: architect.id,
                        type: 'client_assigned',
                        priority: 'medium',
                        title: 'Statut Lead modifié',
                        message: `Le statut Lead du contact "${contact.nom}" a été changé à "${leadStatus}"`,
                        linkedType: 'contact',
                        linkedId: contact.id,
                        linkedName: contact.nom,
                        metadata: {
                            previousLeadStatus: previousStatus,
                            newLeadStatus: leadStatus,
                            changedBy: user.name,
                        },
                        createdBy: userId,
                    },
                });
                console.log('✅ Notification created for architect:', architect.name);
            }
        }

        console.log('🎉 Lead status update completed successfully');

        return NextResponse.json({
            success: true,
            contact: updatedContact,
            message: `Statut Lead mis à jour avec succès`,
        });

    } catch (error) {
        console.error('❌ Error updating contact lead status:', error);
        return NextResponse.json(
            { error: 'Failed to update lead status', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
