"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/contacts
 * List all contacts with filters
 * 
 * Query params:
 * - search: Search by name
 * - tag: Filter by tag (prospect, vip, converted, archived)
 * - architectId: Filter by assigned architect
 * - magasin: Filter by store
 * - limit: Results per page (default 20)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // 2. Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 3. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const tag = searchParams.get('tag') || null;
    const architectId = searchParams.get('architectId') || null;
    const magasin = searchParams.get('magasin') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 4. Build filter
    const where: any = {};
    
    // Auto-filter for architects - they ONLY see contacts assigned to them
    // Architects are NOT admins, so they should NOT see all contacts
    if (user.role?.toLowerCase() === 'architect') {
      where.architecteAssigne = user.name;
      console.log(`[Contacts API] Architect filter: showing ONLY contacts assigned to "${user.name}"`);
    } else {
      console.log(`[Contacts API] User role: ${user.role} - showing ALL contacts (including converted)`);
    }
    
    if (search) {
      const searchConditions = {
        OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { telephone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      };
      
      // Combine search with existing where conditions
      if (where.OR) {
        // If we already have OR conditions (from architect filter), combine with AND
        where.AND = [
          { OR: where.OR },
          searchConditions
        ];
        delete where.OR;
      } else {
        Object.assign(where, searchConditions);
      }
      
      console.log(`[Contacts API] Search filter: "${search}"`);
    }

    if (tag) {
      where.tag = tag;
    }

    if (architectId && user.role?.toLowerCase() !== 'architect') {
      where.architecteAssigne = architectId;
    }

    if (magasin) {
      where.magasin = magasin;
    }

    // 5. Fetch contacts
    console.log(`[Contacts API] Fetching contacts with filter:`, JSON.stringify(where, null, 2));
    
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          opportunities: true,
          timeline: { 
            where: { eventType: 'contact_converted_from_lead' },
            take: 1,
            orderBy: { createdAt: 'desc' } 
          },
        },
        // typeBien and source are now direct fields on Contact model, so they're automatically included
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contact.count({ where }),
    ]);

    // Contacts now have typeBien and source fields directly from database
    // Only enrich from opportunities if typeBien is missing (for backward compatibility)
    const enrichedContacts = contacts.map((contact: any) => {
      // If contact already has typeBien from database, use it directly
      if (contact.typeBien) {
        return contact;
      }

      // Fallback: Try to get from opportunities if typeBien is missing
      if (contact.opportunities && contact.opportunities.length > 0) {
        // Count opportunity types to get most common
        const typeCounts: Record<string, number> = {};
        contact.opportunities.forEach((opp: any) => {
          typeCounts[opp.type] = (typeCounts[opp.type] || 0) + 1;
        });
        
        const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostCommon) {
          const oppType = mostCommon[0];
          const typeBienMap: Record<string, string> = {
            'villa': 'Villa',
            'appartement': 'Appartement',
            'magasin': 'Magasin',
            'bureau': 'Bureau',
            'riad': 'Riad',
            'studio': 'Studio',
            'renovation': 'Rénovation',
            'autre': 'Autre'
          };
          contact.typeBien = typeBienMap[oppType] || oppType;
        }
      }
      
      return contact;
    });

    console.log(`[Contacts API] Found ${contacts.length} contacts (total: ${total}, limit: ${limit}, offset: ${offset})`);
    if (contacts.length > 0) {
      console.log(`[Contacts API] Sample contacts:`, contacts.slice(0, 3).map(c => ({
        id: c.id,
        nom: c.nom,
        telephone: c.telephone,
        tag: c.tag,
        architecteAssigne: c.architecteAssigne,
        leadId: c.leadId
      })));
    }

    return NextResponse.json({
      data: enrichedContacts,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * Create a new contact manually (not from lead conversion)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // 2. Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // 3. Parse body
    const body = await request.json();
    const { nom, telephone, email, ville, adresse, architecteAssigne, magasin, notes } = body;

    if (!nom || !telephone) {
      return NextResponse.json(
        { error: 'nom and telephone are required' },
        { status: 400 }
      );
    }

    // 4. Create contact
    const contact = await prisma.contact.create({
      data: {
        nom,
        telephone,
        email: email || undefined,
        ville: ville || undefined,
        adresse: adresse || undefined,
        architecteAssigne: architecteAssigne || undefined,
        magasin: magasin || undefined,
        notes: notes || undefined,
        tag: 'prospect',
        createdBy: userId,
      },
      include: {
        opportunities: true,
      },
    });

    // 5. Create timeline entry
    await prisma.timeline.create({
      data: {
        contactId: contact.id,
        eventType: 'contact_created',
        title: 'Contact créé',
        description: `Contact "${nom}" créé manuellement`,
        author: userId,
      },
    });

    // 6. Send notification if architect is assigned
    if (architecteAssigne) {
      // Find the architect user by name
      const architect = await prisma.user.findFirst({
        where: { 
          name: architecteAssigne,
          role: { equals: 'architect', mode: 'insensitive' }
        },
      });

      if (architect) {
        await prisma.notification.create({
          data: {
            userId: architect.id,
            type: 'client_assigned',
            priority: 'high',
            title: 'Nouveau Contact Assigné',
            message: `Le contact "${contact.nom}" vous a été assigné. Téléphone: ${contact.telephone}`,
            linkedType: 'contact',
            linkedId: contact.id,
            linkedName: contact.nom,
            metadata: {
              contactPhone: contact.telephone,
              contactVille: contact.ville,
              createdManually: true,
            },
            createdBy: userId,
          },
        });
      }
    }

    return NextResponse.json(contact, { status: 201 });

  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
