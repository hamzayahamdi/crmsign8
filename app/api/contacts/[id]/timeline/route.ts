"use server"

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * GET /api/contacts/[id]/timeline
 * Get the activity timeline for a contact
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

    // Await params in Next.js 15
    const { id: contactId } = await params;

    if (!contactId) {
      console.error('[GET /api/contacts/[id]/timeline] Missing contact id');
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    console.log('[GET /api/contacts/[id]/timeline] Fetching timeline for contact:', contactId);

    // First, verify that the contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!contact) {
      console.error('[GET /api/contacts/[id]/timeline] Contact not found:', contactId);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Fetch timeline entries for this contact
    const timeline = await prisma.timeline.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[GET /api/contacts/[id]/timeline] Found', timeline.length, 'timeline entries');

    return NextResponse.json({ timeline });

  } catch (error) {
    console.error('[GET /api/contacts/[id]/timeline] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch timeline';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
