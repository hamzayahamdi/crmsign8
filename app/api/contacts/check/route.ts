"use server"

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/contacts/check
 * Diagnostic endpoint to check database state
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    try {
      verify(token, JWT_SECRET) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Count contacts
    const totalContacts = await prisma.contact.count();
    console.log('Total contacts in database:', totalContacts);

    // Get all contacts (limited)
    const contacts = await prisma.contact.findMany({
      take: 5,
      select: {
        id: true,
        nom: true,
        telephone: true,
        tag: true,
        _count: {
          select: {
            opportunities: true,
            tasks: true,
            appointments: true,
            documents: true,
            timeline: true,
          },
        },
      },
    });

    console.log('Sample contacts:', contacts);

    return NextResponse.json({
      success: true,
      totalContacts,
      sampleContacts: contacts,
    });

  } catch (error) {
    console.error('Error in check endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
