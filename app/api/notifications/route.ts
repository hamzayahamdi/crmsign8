import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;
    const limit = parseInt(searchParams.get('limit') || '50');
    const onlyUnread = searchParams.get('onlyUnread') === 'true';

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error('[API] Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      type,
      priority,
      title,
      message,
      linkedType,
      linkedId,
      linkedName,
      metadata,
    } = body;

    // Validate required fields
    if (!userId || !type || !priority || !title || !message) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        priority,
        title,
        message,
        linkedType,
        linkedId,
        linkedName,
        metadata,
        createdBy: user.id,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}
