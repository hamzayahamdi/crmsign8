import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const preferences = await prisma.$queryRaw<Array<{
      push_enabled: boolean;
      email_enabled: boolean;
      push_subscription: any;
    }>>`
      SELECT push_enabled, email_enabled, push_subscription
      FROM notification_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (preferences.length === 0) {
      // Return default preferences
      return NextResponse.json({
        pushEnabled: false,
        emailEnabled: true,
        email: undefined
      });
    }

    const pref = preferences[0];
    return NextResponse.json({
      pushEnabled: pref.push_enabled,
      emailEnabled: pref.email_enabled,
      email: undefined // Email is stored in User table
    });
  } catch (error) {
    console.error('[API] Error getting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pushEnabled, emailEnabled, email } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Update or create preferences
    await prisma.$executeRaw`
      INSERT INTO notification_preferences (id, user_id, push_enabled, email_enabled, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}, ${pushEnabled}, ${emailEnabled}, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        push_enabled = ${pushEnabled},
        email_enabled = ${emailEnabled},
        updated_at = NOW()
    `;

    // Update user email if provided
    if (email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
