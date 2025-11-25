/**
 * API Route: Twilio Status
 * 
 * GET /api/twilio/status - Quick status check (lightweight)
 */

import { NextResponse } from 'next/server';
import { isMoceanConfigured } from '@/lib/mocean-service';

export async function GET() {
  const configured = isMoceanConfigured();

  return NextResponse.json({
    configured,
    message: configured 
      ? 'MoceanAPI SMS is enabled' 
      : 'MoceanAPI SMS is disabled (add credentials to .env)',
  });
}

