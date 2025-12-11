import { NextRequest, NextResponse } from 'next/server';
import { sendNotificationEmail, isResendConfigured } from '@/lib/resend-service';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
}

async function getUserFromToken(request?: NextRequest): Promise<JWTPayload | null> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('[Email Test] JWT_SECRET not configured');
      return null;
    }

    let token: string | undefined;

    // First, try to get token from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Fall back to cookies if no Authorization header
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
    console.error('[Email Test] Token verification failed:', error);
    return null;
  }
}

/**
 * Test email sending endpoint
 * GET /api/email/test
 * 
 * This endpoint helps debug email configuration
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Email Test] ========== EMAIL TEST START ==========');
    
    // Check authentication
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        requiresAuth: true
      }, { status: 401 });
    }

    // Get test email from query params or use user's email
    const { searchParams } = new URL(request.url);
    const testEmail = searchParams.get('email') || user.email;

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        error: 'No email address provided. Add ?email=your@email.com to the URL',
        debug: {
          userEmail: user.email,
          queryEmail: searchParams.get('email')
        }
      }, { status: 400 });
    }

    // Check Resend configuration
    const isConfigured = isResendConfigured();
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const apiKeyFormat = process.env.RESEND_API_KEY 
      ? (process.env.RESEND_API_KEY.startsWith('re_') ? 'valid' : 'invalid format (should start with re_)')
      : 'missing';

    console.log('[Email Test] Configuration check:');
    console.log('[Email Test] - RESEND_API_KEY exists:', hasApiKey);
    console.log('[Email Test] - RESEND_API_KEY format:', apiKeyFormat);
    console.log('[Email Test] - isResendConfigured():', isConfigured);
    console.log('[Email Test] - RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'not set (will use default)');
    console.log('[Email Test] - Test email:', testEmail);

    if (!isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Resend is not configured',
        debug: {
          hasApiKey,
          apiKeyFormat,
          isConfigured,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev (default)',
          testEmail,
          instructions: [
            '1. Sign up at https://resend.com',
            '2. Get your API key from the dashboard',
            '3. Add RESEND_API_KEY=re_xxxxxxxxxxxxx to your .env file',
            '4. Restart your server',
            '5. Try this endpoint again'
          ]
        }
      }, { status: 400 });
    }

    // Try to send a test email
    console.log('[Email Test] Attempting to send test email...');
    const result = await sendNotificationEmail(testEmail, {
      title: 'Test Email - Signature8 CRM',
      message: `Bonjour,\n\nCeci est un email de test pour vérifier la configuration de votre système d'emails.\n\nSi vous recevez cet email, cela signifie que votre configuration Resend fonctionne correctement.\n\nDate: ${new Date().toLocaleString('fr-FR')}\n\nCordialement,\nSignature8 CRM`,
      type: 'test'
    });

    console.log('[Email Test] Email send result:', result);
    console.log('[Email Test] ========== EMAIL TEST END ==========');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        debug: {
          testEmail,
          messageId: result.messageId,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          result: result.debug || result
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test email',
        debug: {
          testEmail,
          error: result.error,
          debugInfo: result.debug,
          configuration: {
            hasApiKey,
            apiKeyFormat,
            isConfigured,
            fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev (default)'
          }
        }
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Email Test] Exception:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error occurred',
      debug: {
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: error?.stack
      }
    }, { status: 500 });
  }
}

