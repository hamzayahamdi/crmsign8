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

async function getUserFromToken(request?: NextRequest): Promise<JWTPayload | null> {
  try {
    let token: string | undefined;
    
    // First, try to get token from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('[Calendar Auth] Token found in Authorization header');
      }
    }
    
    // Fall back to cookies if no Authorization header
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
      if (token) {
        console.log('[Calendar Auth] Token found in cookies');
      }
    }
    
    if (!token) {
      console.log('[Calendar Auth] No token found');
      return null;
    }
    
    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    console.log('[Calendar Auth] User authenticated:', decoded.email, decoded.role);
    return decoded;
  } catch (error) {
    console.error('[Calendar Auth] Token verification failed:', error);
    return null;
  }
}

// GET - Fetch calendar events
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      console.log('[Calendar API GET] No user token found');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('[Calendar API GET] User:', user.userId, user.email, user.role);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const assignedTo = searchParams.get('assignedTo');

    // If fetching a single event by ID
    if (id) {
      const event = await prisma.calendarEvent.findUnique({
        where: { id }
      });

      if (!event) {
        return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
      }

      // Get user details
      const users = await prisma.user.findMany({
        where: { 
          id: { 
            in: [event.assignedTo, event.createdBy, ...(event.participants || [])] 
          } 
        },
        select: { id: true, name: true, email: true, role: true }
      });

      const userMap = new Map(users.map((u: any) => [u.id, u]));

      const enrichedEvent = {
        ...event,
        assignedToName: userMap.get(event.assignedTo)?.name || 'Inconnu',
        createdByName: userMap.get(event.createdBy)?.name || 'Inconnu',
        participantDetails: event.participants?.map((pId: string) => {
          const user = userMap.get(pId);
          return user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          } : null;
        }).filter(Boolean) || []
      };

      return NextResponse.json(enrichedEvent);
    }

    // Build filter for multiple events
    const where: any = { AND: [] };

    // Filter by date range
    if (startDate && endDate) {
      where.AND.push({
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      });
    }

    // Filter by event type
    if (eventType && eventType !== 'all') {
      where.AND.push({ eventType });
    }

    // Role-based visibility - MUST be applied first
    const isRestrictedRole = user.role === 'commercial' || 
                             user.role === 'architecte' || 
                             user.role === 'architect';
    
    console.log('[Calendar API] Role check - isRestrictedRole:', isRestrictedRole, 'role:', user.role);
    
    if (isRestrictedRole) {
      // Architects and commercials see: their own events + events they're invited to + public events
      where.AND.push({
        OR: [
          { createdBy: user.userId },
          { assignedTo: user.userId },
          { participants: { has: user.userId } },
          { visibility: 'all' }
        ]
      });
    }
    // Admins and gestionnaires see all events (no additional filter needed)

    // Filter by assigned user or participants (additional filter on top of visibility)
    if (assignedTo && assignedTo !== 'all') {
      where.AND.push({
        OR: [
          { assignedTo: assignedTo },
          { participants: { has: assignedTo } }
        ]
      });
    }

    // Clean up empty AND array
    const finalWhere = where.AND.length > 0 ? where : {};

    console.log('[Calendar API] Fetching events with filter:', JSON.stringify(finalWhere, null, 2));

    const events = await prisma.calendarEvent.findMany({
      where: finalWhere,
      orderBy: { startDate: 'asc' }
    });

    console.log('[Calendar API] Found events:', events.length);
    
    if (events.length > 0) {
      console.log('[Calendar API] Sample event:', {
        id: events[0].id,
        title: events[0].title,
        createdBy: events[0].createdBy,
        assignedTo: events[0].assignedTo,
        participants: events[0].participants,
        visibility: events[0].visibility
      });
    }

    // Get all unique user IDs (assigned, created, and participants)
    const allUserIds = new Set<string>();
    events.forEach((e: any) => {
      allUserIds.add(e.assignedTo);
      allUserIds.add(e.createdBy);
      if (e.participants) {
        e.participants.forEach((p: string) => allUserIds.add(p));
      }
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(allUserIds) } },
      select: { id: true, name: true, email: true, role: true }
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    // Enrich events with user details
    const enrichedEvents = events.map((event: any) => ({
      ...event,
      assignedToName: userMap.get(event.assignedTo)?.name || 'Inconnu',
      createdByName: userMap.get(event.createdBy)?.name || 'Inconnu',
      participantDetails: event.participants?.map((pId: string) => {
        const user = userMap.get(pId);
        return user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        } : null;
      }).filter(Boolean) || []
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
    const user = await getUserFromToken(request);
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
      linkedArchitectId,
      participants = [],
      visibility = 'team'
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
        participants: participants || [],
        visibility: visibility || 'team',
        createdBy: user.userId
      }
    });

    // Get creator name for notifications
    const creator = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true }
    });

    // Create notifications for participants and assigned user
    const notificationRecipients = new Set([assignedTo, ...participants]);
    notificationRecipients.delete(user.userId); // Don't notify the creator

    const notificationPromises = Array.from(notificationRecipients).map((recipientId) =>
      prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'rdv_created',
          priority: eventType === 'urgent' ? 'high' : 'medium',
          title: `Nouveau RDV : ${title}`,
          message: `${creator?.name || 'Un utilisateur'} vous a ajouté à un rendez-vous le ${new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`,
          linkedType: 'appointment',
          linkedId: event.id,
          linkedName: title,
          createdBy: user.userId,
          metadata: {
            eventType,
            startDate,
            location: location || null
          }
        }
      })
    );

    await Promise.all(notificationPromises);

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
    const user = await getUserFromToken(request);
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

    // Get updater name for notifications
    const updater = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true }
    });

    // Notify participants about the update
    const notificationRecipients = new Set([
      updatedEvent.assignedTo,
      ...updatedEvent.participants
    ]);
    notificationRecipients.delete(user.userId); // Don't notify the updater

    const notificationPromises = Array.from(notificationRecipients).map((recipientId) =>
      prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'rdv_updated',
          priority: updatedEvent.eventType === 'urgent' ? 'high' : 'medium',
          title: `RDV modifié : ${updatedEvent.title}`,
          message: `${updater?.name || 'Un utilisateur'} a modifié le rendez-vous du ${new Date(updatedEvent.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`,
          linkedType: 'appointment',
          linkedId: updatedEvent.id,
          linkedName: updatedEvent.title,
          createdBy: user.userId
        }
      })
    );

    await Promise.all(notificationPromises);

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
    const user = await getUserFromToken(request);
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
