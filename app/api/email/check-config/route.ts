import { NextRequest, NextResponse } from 'next/server';
import { isResendConfigured } from '@/lib/resend-service';

/**
 * Check email configuration endpoint
 * GET /api/email/check-config
 * 
 * This endpoint helps verify email configuration without sending emails
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Email Config Check] ========== CONFIGURATION CHECK START ==========');
    
    const rawApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const isConfigured = isResendConfigured();

    // Detailed analysis
    const analysis = {
      rawApiKey: {
        exists: !!rawApiKey,
        length: rawApiKey?.length || 0,
        preview: rawApiKey ? `${rawApiKey.substring(0, 5)}...` : 'N/A',
        hasQuotes: rawApiKey ? (rawApiKey.includes('"') || rawApiKey.includes("'")) : false,
        hasSpaces: rawApiKey ? (rawApiKey !== rawApiKey.trim()) : false,
        startsWithRe: rawApiKey ? rawApiKey.trim().startsWith('re_') : false,
      },
      sanitized: {
        // We'll check this in the service
        isValid: false,
        issues: [] as string[]
      },
      fromEmail: {
        exists: !!fromEmail,
        value: fromEmail || 'onboarding@resend.dev (default)'
      },
      configuration: {
        isConfigured,
        canSendEmails: isConfigured
      }
    };

    // Check for common issues
    if (rawApiKey) {
      const trimmed = rawApiKey.trim();
      let cleaned = trimmed;
      
      // Check for quotes
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
          (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
        analysis.sanitized.issues.push('API key has surrounding quotes - these will be removed automatically');
      }
      
      // Check for spaces
      if (trimmed !== rawApiKey) {
        analysis.sanitized.issues.push('API key has leading/trailing spaces - these will be trimmed automatically');
      }
      
      // Check format
      if (!cleaned.startsWith('re_')) {
        analysis.sanitized.issues.push('API key does not start with "re_" - invalid format');
        analysis.sanitized.isValid = false;
      } else if (cleaned.length < 20) {
        analysis.sanitized.issues.push('API key seems too short (expected 20+ characters)');
        analysis.sanitized.isValid = false;
      } else {
        analysis.sanitized.isValid = true;
      }
    } else {
      analysis.sanitized.issues.push('RESEND_API_KEY is not set in environment variables');
    }

    console.log('[Email Config Check] Analysis:', JSON.stringify(analysis, null, 2));
    console.log('[Email Config Check] ========== CONFIGURATION CHECK END ==========');

    const recommendations: string[] = [];
    
    if (!rawApiKey) {
      recommendations.push('Add RESEND_API_KEY to your .env file');
      recommendations.push('Get your API key from https://resend.com/api-keys');
      recommendations.push('Format: RESEND_API_KEY=re_xxxxxxxxxxxxx');
    } else if (!analysis.sanitized.isValid) {
      recommendations.push('Fix the RESEND_API_KEY format in your .env file');
      recommendations.push('Remove any quotes around the key');
      recommendations.push('Remove leading/trailing spaces');
      recommendations.push('Ensure it starts with "re_"');
    } else if (analysis.rawApiKey.hasQuotes || analysis.rawApiKey.hasSpaces) {
      recommendations.push('Clean up your .env file (remove quotes/spaces)');
      recommendations.push('The key will work but it\'s better to have it clean');
    } else if (!isConfigured) {
      recommendations.push('Restart your server after adding/changing RESEND_API_KEY');
      recommendations.push('Environment variables are loaded at server startup');
    }

    return NextResponse.json({
      success: isConfigured,
      configured: isConfigured,
      analysis,
      recommendations,
      nextSteps: isConfigured 
        ? [
            'Configuration looks good!',
            'Test email sending: GET /api/email/test?email=your@email.com',
            'Create a task to trigger an email notification'
          ]
        : [
            ...recommendations,
            'After fixing, restart your server',
            'Then test with: GET /api/email/test?email=your@email.com'
          ]
    });
  } catch (error: any) {
    console.error('[Email Config Check] Exception:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error occurred',
      debug: {
        errorName: error?.name,
        errorMessage: error?.message
      }
    }, { status: 500 });
  }
}






