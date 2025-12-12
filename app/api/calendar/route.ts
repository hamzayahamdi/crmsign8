import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { shouldViewOwnDataOnly } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
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
    const isRestrictedRole = shouldViewOwnDataOnly(user.role);

    console.log('[Calendar API] Role check - isRestrictedRole:', isRestrictedRole, 'role:', user.role);

    if (isRestrictedRole) {
      // Only Gestionnaire is restricted: their own events + events they're invited to + public events
      where.AND.push({
        OR: [
          { createdBy: user.userId },
          { assignedTo: user.userId },
          { participants: { has: user.userId } },
          { visibility: 'all' }
        ]
      });
    }
    // Admins, Operators, and Architects see all events (no additional filter needed)

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
      if (e.assignedTo && e.assignedTo !== 'Système' && e.assignedTo.length > 5) {
        allUserIds.add(e.assignedTo);
      }
      if (e.createdBy && e.createdBy !== 'Système' && e.createdBy.length > 5) {
        allUserIds.add(e.createdBy);
      }
      if (e.participants) {
        e.participants.forEach((p: string) => {
          if (p && p !== 'Système' && p.length > 5) {
            allUserIds.add(p);
          }
        });
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
      assignedToName: userMap.get(event.assignedTo)?.name || event.assignedTo || 'Inconnu',
      createdByName: userMap.get(event.createdBy)?.name || event.createdBy || 'Inconnu',
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
    // IMPORTANT: Include assignedTo even if they're the creator
    const notificationRecipients = new Set([assignedTo, ...participants]);

    // Only exclude creator if they're NOT the assigned user
    // This ensures the organizer/assigned user always gets notified
    if (user.userId !== assignedTo) {
      notificationRecipients.delete(user.userId);
    }

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

    // Send WhatsApp notifications to participants AND assigned user
    try {
      // Get all recipients (assigned user + participants) with phone numbers
      const participantUsers = await prisma.user.findMany({
        where: {
          id: { in: Array.from(notificationRecipients) },
          phone: { not: null }
        },
        select: { id: true, name: true, phone: true }
      });

      console.log(`[Calendar] Sending WhatsApp to ${participantUsers.length} recipients (including assigned user)`);

      // Format date and time for WhatsApp message
      const eventDate = new Date(startDate);
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
      const formattedDate = eventDate.toLocaleDateString('fr-FR', dateOptions);
      const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      const timeStr = eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = new Date(endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // Construct calendar link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://signature8-sketch.vercel.app";
      const calendarLink = `${appUrl}/calendrier?event=${event.id}`;

      // UltraMSG API credentials
      const ULTRA_INSTANCE_ID = process.env.ULTRA_INSTANCE_ID;
      const ULTRA_TOKEN = process.env.ULTRA_TOKEN;

      if (!ULTRA_INSTANCE_ID || !ULTRA_TOKEN) {
        console.error('[Calendar] UltraMSG credentials not configured');
      } else {
        // Send WhatsApp notification to each recipient
        const whatsappPromises = participantUsers.map(async (participant) => {
          try {
            const isOrganizer = participant.id === assignedTo;
            const message = `📅 *Nouveau Rendez-vous ${isOrganizer ? 'Créé' : 'Confirmé'}*\n\n` +
              `Bonjour ${participant.name.split(' ')[0]},\n` +
              `${isOrganizer ? 'Vous avez créé un nouveau rendez-vous.' : 'Un nouveau rendez-vous a été ajouté à votre agenda.'}\n\n` +
              `📌 *${title}*\n` +
              `───────────────\n` +
              `📆 *Date :* ${finalDate}\n` +
              `⏰ *Heure :* ${timeStr} - ${endTimeStr}\n` +
              `${location ? `📍 *Lieu :* ${location}\n` : ''}` +
              `${description ? `📝 *Détails :* ${description}\n` : ''}` +
              `\n🔗 *Voir dans l'agenda :*\n` +
              `${calendarLink}\n\n` +
              `${isOrganizer ? `💡 *Rappel :*\nN'oubliez pas de confirmer ce rendez-vous.\n\n` : `💡 *Action requise :*\nMerci de confirmer votre présence.\n\n`}` +
              `_${isOrganizer ? 'Créé par vous' : `Organisé par ${creator?.name || 'Signature8'}`}_`;

            // Send via UltraMSG
            const ultraResponse = await fetch(
              `https://api.ultramsg.com/${ULTRA_INSTANCE_ID}/messages/chat`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  token: ULTRA_TOKEN,
                  to: participant.phone!,
                  body: message,
                  priority: '10',
                  referenceId: event.id
                })
              }
            );

            const ultraResult = await ultraResponse.json();
            console.log(`[Calendar] UltraMSG response for ${participant.name}:`, ultraResult);

            // Save notification to database
            await prisma.notification.create({
              data: {
                userId: participant.id,
                type: 'rdv_created',
                priority: eventType === 'urgent' ? 'high' : 'medium',
                title: `Nouveau RDV : ${title}`,
                message: `WhatsApp envoyé: ${message.substring(0, 100)}...`,
                linkedType: 'calendar_event',
                linkedId: event.id,
                linkedName: title,
                createdBy: user.userId,
                metadata: {
                  whatsappSent: ultraResult.sent === 'true' || ultraResult.sent === true,
                  whatsappResponse: ultraResult,
                  phone: participant.phone,
                  eventType,
                  startDate,
                  endDate,
                  location: location || null,
                  creatorName: creator?.name,
                  isOrganizer
                }
              }
            });

            if (ultraResult.sent === 'true' || ultraResult.sent === true) {
              console.log(`[Calendar] ✅ WhatsApp sent successfully to ${participant.name} (${participant.phone})${isOrganizer ? ' [ORGANIZER]' : ''}`);
            } else {
              console.error(`[Calendar] ❌ WhatsApp failed for ${participant.name}:`, ultraResult);
            }
          } catch (error) {
            console.error(`[Calendar] Error sending WhatsApp to ${participant.name}:`, error);
          }
        });

        await Promise.allSettled(whatsappPromises);
      }
    } catch (error) {
      console.error('[Calendar] Error sending WhatsApp notifications:', error);
      // Don't fail the request if WhatsApp fails
    }

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

    // Admin, Operator, Gestionnaire can update their own events, or Admin/Operator can update any event
    const canUpdate =
      user.role === 'admin' ||
      user.role === 'operator' ||
      (existingEvent.createdBy === user.userId &&
        (user.role === 'gestionnaire' || user.role === 'architect'));

    if (!canUpdate) {
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

    // Admin, Operator can delete any event, Gestionnaire/Architect can delete their own
    const canDelete =
      user.role === 'admin' ||
      user.role === 'operator' ||
      (existingEvent.createdBy === user.userId &&
        (user.role === 'gestionnaire' || user.role === 'architect'));

    if (!canDelete) {
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
