import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    }

    if (!token) {
      return null;
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('[Calendar Cleanup Auth] Token verification failed:', error);
    return null;
  }
}

/**
 * POST - Cleanup orphaned calendar events
 * Removes calendar events that were created for tasks that no longer exist
 * Only accessible by admin/operator
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Only admin and operator can run cleanup
    if (user.role !== 'admin' && user.role !== 'operator') {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent exécuter le nettoyage.' },
        { status: 403 }
      );
    }

    console.log('[Calendar Cleanup] Starting cleanup of orphaned calendar events...');

    // Get all tasks
    const allTasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignedTo: true,
        createdAt: true,
      },
    });

    console.log(`[Calendar Cleanup] Found ${allTasks.length} existing tasks`);

    // Get all calendar events of type 'suivi_projet' (created from tasks)
    const taskEvents = await prisma.calendarEvent.findMany({
      where: {
        eventType: 'suivi_projet',
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        assignedTo: true,
        createdAt: true,
      },
    });

    console.log(`[Calendar Cleanup] Found ${taskEvents.length} calendar events of type 'suivi_projet'`);

    // Get all users to map names to IDs
    const users = await prisma.user.findMany({
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.name, u.id]));
    const userIdToNameMap = new Map(users.map((u) => [u.id, u.name]));

    const orphanedEvents: string[] = [];

    // Check each calendar event to see if it has a matching task
    for (const event of taskEvents) {
      let hasMatchingTask = false;

      // Get the user name from the assignedTo ID
      const assignedUserName = userIdToNameMap.get(event.assignedTo);

      if (assignedUserName) {
        // Find tasks that match this event
        const matchingTasks = allTasks.filter((task) => {
          // Check if title matches (exact match)
          if (task.title !== event.title) {
            return false;
          }

          // Check if assignedTo matches
          if (task.assignedTo !== assignedUserName) {
            return false;
          }

          // Check if dates match (within 1 hour tolerance)
          const taskStartDate = new Date(task.dueDate);
          const taskEndDate = new Date(task.dueDate);
          taskEndDate.setHours(taskEndDate.getHours() + 1);

          if (
            event.startDate < taskStartDate ||
            event.startDate > taskEndDate
          ) {
            return false;
          }

          // Check if created around the same time (within 5 minutes)
          const taskCreatedStart = new Date(task.createdAt);
          taskCreatedStart.setMinutes(taskCreatedStart.getMinutes() - 5);
          const taskCreatedEnd = new Date(task.createdAt);
          taskCreatedEnd.setMinutes(taskCreatedEnd.getMinutes() + 5);

          if (
            event.createdAt < taskCreatedStart ||
            event.createdAt > taskCreatedEnd
          ) {
            return false;
          }

          return true;
        });

        if (matchingTasks.length > 0) {
          hasMatchingTask = true;
        }
      }

      if (!hasMatchingTask) {
        orphanedEvents.push(event.id);
      }
    }

    console.log(`[Calendar Cleanup] Found ${orphanedEvents.length} orphaned calendar events`);

    if (orphanedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun événement orphelin trouvé',
        deletedCount: 0,
      });
    }

    // Delete event reminders first
    await prisma.eventReminder.deleteMany({
      where: {
        eventId: { in: orphanedEvents },
      },
    });

    // Delete the orphaned calendar events
    const deleteResult = await prisma.calendarEvent.deleteMany({
      where: {
        id: { in: orphanedEvents },
      },
    });

    console.log(
      `[Calendar Cleanup] Successfully deleted ${deleteResult.count} orphaned calendar events`
    );

    return NextResponse.json({
      success: true,
      message: `Nettoyage terminé: ${deleteResult.count} événement(s) orphelin(s) supprimé(s)`,
      deletedCount: deleteResult.count,
      orphanedEventIds: orphanedEvents,
    });
  } catch (error) {
    console.error('[Calendar Cleanup] Error during cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage des événements orphelins',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}




