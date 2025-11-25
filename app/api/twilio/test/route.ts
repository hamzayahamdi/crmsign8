/**
 * API Route: Test Twilio Configuration
 * 
 * GET /api/twilio/test - Check Twilio configuration
 * POST /api/twilio/test - Send test SMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { testMoceanConfig, sendSMS, isMoceanConfigured } from '@/lib/mocean-service';

/**
 * GET - Check MoceanAPI configuration status
 */
export async function GET() {
  try {
    const configured = isMoceanConfigured();

    if (!configured) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: 'MoceanAPI not configured. Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env',
      });
    }

    const testResult = await testMoceanConfig();

    if (!testResult.configured) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: testResult.error,
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      apiKey: testResult.apiKey,
      fromNumber: testResult.fromNumber,
      message: 'MoceanAPI is configured and ready to send SMS',
    });
  } catch (error: any) {
    console.error('[API] Error testing MoceanAPI:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to test MoceanAPI configuration',
    }, { status: 500 });
  }
}

/**
 * POST - Send test SMS
 * 
 * Body: {
 *   phoneNumber: "+212612345678",
 *   message?: "Custom test message"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required',
      }, { status: 400 });
    }

    // Check MoceanAPI configuration
    if (!isMoceanConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'MoceanAPI not configured. Add credentials to .env file',
      }, { status: 503 });
    }

    // Send test SMS
    const testMessage = message || '🔔 Test SMS from Signature8 CRM\n\nYour Twilio integration is working!\n\n— Signature8 CRM';
    
    const result = await sendSMS(phoneNumber, testMessage);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'SMS sent successfully',
      phoneNumber,
    });
  } catch (error: any) {
    console.error('[API] Error sending test SMS:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send test SMS',
    }, { status: 500 });
  }
}

