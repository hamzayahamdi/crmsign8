import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Update push subscription status
    await prisma.$executeRaw`
      UPDATE notification_preferences
      SET 
        push_enabled = false,
        push_subscription = NULL,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error unsubscribing from push:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}
