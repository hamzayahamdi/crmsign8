import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    if (!userId || !subscription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store or update push subscription
    await prisma.$executeRaw`
      INSERT INTO notification_preferences (id, user_id, push_enabled, push_subscription, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}, true, ${JSON.stringify(subscription)}::jsonb, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        push_enabled = true,
        push_subscription = ${JSON.stringify(subscription)}::jsonb,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error subscribing to push:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    );
  }
}
