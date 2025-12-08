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

    // Get user email from User table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (preferences.length === 0) {
      // Return default preferences with user email if available
      return NextResponse.json({
        pushEnabled: false,
        emailEnabled: true,
        email: user?.email || undefined
      });
    }

    const pref = preferences[0];
    return NextResponse.json({
      pushEnabled: pref.push_enabled,
      emailEnabled: pref.email_enabled,
      email: user?.email || undefined
    });
  } catch (error) {
    console.error('[API] Error getting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// Email validation function
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return false;
  }
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmedEmail);
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

    // Validate email if email notifications are enabled
    if (emailEnabled) {
      if (!email || typeof email !== 'string' || !email.trim()) {
        return NextResponse.json(
          { error: 'Email address is required when email notifications are enabled' },
          { status: 400 }
        );
      }
      
      const trimmedEmail = email.trim();
      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address format' },
          { status: 400 }
        );
      }

      // Update user email
      await prisma.user.update({
        where: { id: userId },
        data: { email: trimmedEmail }
      });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating preferences:', error);
    
    // Handle Prisma errors
    if (error instanceof Error) {
      // Check for unique constraint violation (email already exists)
      if (error.message.includes('Unique constraint') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'This email address is already in use' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
