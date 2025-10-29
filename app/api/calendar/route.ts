import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

async function getUserFromToken(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      console.log('[Calendar Auth] No token found in cookies');
      return null;
    }
    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    console.log('[Calendar Auth] User authenticated:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('[Calendar Auth] Token verification failed:', error);
    return null;
  }
}

// GET - Fetch calendar events
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const assignedTo = searchParams.get('assignedTo');

    // Build filter
    const where: any = {};

    // Filter by date range
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Filter by event type
    if (eventType && eventType !== 'all') {
      where.eventType = eventType;
    }

    // Filter by assigned user
    if (assignedTo && assignedTo !== 'all') {
      where.assignedTo = assignedTo;
    }

    // Commercial users can only see their own events
    if (user.role === 'commercial') {
      where.assignedTo = user.userId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    // Get user names for assigned users
    const userIds = [...new Set(events.map((e: any) => e.assignedTo))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });

    const userMap = new Map(users.map((u: any) => [u.id, u.name]));

    // Enrich events with names
    const enrichedEvents = events.map((event: any) => ({
      ...event,
      assignedToName: userMap.get(event.assignedTo) || 'Inconnu'
    }));

    return NextResponse.json(enrichedEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    );
  }
}

// POST - Create new calendar event
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startDate,
      endDate,
      eventType,
      assignedTo,
      location,
      reminderType,
      linkedClientId,
      linkedLeadId,
      linkedArchitectId
    } = body;

    // Validation
    if (!title || !startDate || !endDate || !eventType || !assignedTo) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      );
    }

    // Create event
    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        eventType,
        assignedTo,
        location: location || null,
        reminderType: reminderType || 'none',
        reminderSent: false,
        linkedClientId: linkedClientId || null,
        linkedLeadId: linkedLeadId || null,
        linkedArchitectId: linkedArchitectId || null,
        createdBy: user.userId
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      );
    }

    // Check if event exists and user has permission
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    // Only admin or creator can update
    if (user.role !== 'admin' && existingEvent.createdBy !== user.userId) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier cet événement' },
        { status: 403 }
      );
    }

    // Update event
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined
      }
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'événement' },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'événement requis' },
        { status: 400 }
      );
    }

    // Check if event exists and user has permission
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    // Only admin or creator can delete
    if (user.role !== 'admin' && existingEvent.createdBy !== user.userId) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cet événement' },
        { status: 403 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    );
  }
}
