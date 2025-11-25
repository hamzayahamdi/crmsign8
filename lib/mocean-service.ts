/**
 * MoceanAPI SMS Service
 * 
 * Handles SMS notifications via MoceanAPI SDK
 * 
 * Setup Instructions:
 * 1. Sign up for MoceanAPI: https://moceanapi.com
 * 2. Get your API Key and API Secret from dashboard
 * 3. Add these to your .env file:
 *    MOCEAN_API_KEY=your_api_key
 *    MOCEAN_API_SECRET=your_api_secret
 *    MOCEAN_FROM_NUMBER=your_sender_id (optional, can use default)
 */

const { Mocean, Client } = require('mocean-sdk');

// MoceanAPI client singleton
let moceanClient: any = null;
let moceanConfig: {
  apiKey: string;
  apiSecret: string;
  fromNumber?: string;
} | null = null;

/**
 * Get or create MoceanAPI client
 */
function getMoceanClient() {
  if (moceanClient) {
    return moceanClient;
  }

  const apiKey = process.env.MOCEAN_API_KEY;
  const apiSecret = process.env.MOCEAN_API_SECRET;
  const fromNumber = process.env.MOCEAN_FROM_NUMBER;

  if (!apiKey || !apiSecret) {
    console.warn('[MoceanAPI] Missing credentials. SMS notifications disabled.');
    console.warn('[MoceanAPI] Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env file');
    return null;
  }

  moceanConfig = {
    apiKey,
    apiSecret,
    fromNumber: fromNumber || undefined,
  };

  // Initialize MoceanAPI SDK client
  const client = new Client({
    apiKey: apiKey,
    apiSecret: apiSecret,
  });
  
  moceanClient = new Mocean(client);

  return moceanClient;
}

/**
 * Check if MoceanAPI is configured
 */
export function isMoceanConfigured(): boolean {
  return !!(
    process.env.MOCEAN_API_KEY &&
    process.env.MOCEAN_API_SECRET
  );
}

/**
 * Format phone number to international format
 * Handles Moroccan numbers specifically
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // If starts with 212 (Morocco code), add +
  if (cleaned.startsWith('212')) {
    return '+' + cleaned;
  }
  
  // If starts with 0 and is Moroccan (9 digits after 0), convert to +212
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+212' + cleaned.substring(1);
  }
  
  // If 9 digits, assume Moroccan
  if (cleaned.length === 9) {
    return '+212' + cleaned;
  }
  
  // Return with + if no other match
  return '+' + cleaned;
}

/**
 * Send SMS via MoceanAPI using SDK
 */
export async function sendSMS(
  to: string,
  message: string,
  options: {
    from?: string;
  } = {}
): Promise<{ success: boolean; messageId?: string; error?: any }> {
  try {
    const client = getMoceanClient();
    
    if (!client) {
      return {
        success: false,
        error: 'MoceanAPI not configured. Add credentials to .env file.',
      };
    }

    if (!moceanConfig) {
      return {
        success: false,
        error: 'MoceanAPI configuration not initialized.',
      };
    }

    // Format phone number
    const formattedTo = formatPhoneNumber(to);
    const fromNumber = options.from || moceanConfig.fromNumber || 'SIGNATURE8';

    console.log(`[MoceanAPI] Sending SMS to ${formattedTo} from ${fromNumber}`);

    // Send SMS using MoceanAPI - try SDK first, fallback to REST API
    try {
      // Use the MessageChannel API from SDK
      const messageChannel = client.messageChannel();
      const response = await messageChannel.send({
        'mocean-from': fromNumber,
        'mocean-to': formattedTo,
        'mocean-text': message,
      });

      if (response.status === '0') {
        const messageId = response.messages?.[0]?.['msgid'] || response['msgid'] || 'unknown';
        console.log(`[MoceanAPI] SMS sent successfully. Message ID: ${messageId}`);
        
        return {
          success: true,
          messageId: messageId,
        };
      } else {
        const errorMsg = response['err_msg'] || response.message || 'Unknown error';
        console.error(`[MoceanAPI] Error: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (sdkError: any) {
      // Fallback to REST API if SDK fails
      console.log('[MoceanAPI] SDK method failed, trying REST API...');
      
      const apiUrl = 'https://rest.moceanapi.com/rest/2/sms';
      const params = new URLSearchParams({
        'mocean-api-key': moceanConfig.apiKey,
        'mocean-api-secret': moceanConfig.apiSecret,
        'mocean-to': formattedTo,
        'mocean-from': fromNumber,
        'mocean-text': message,
      });

      const restResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const data = await restResponse.json();
      
      // MoceanAPI response structure: { messages: [{ status, msgid, err_msg }] }
      const msgResponse = data.messages?.[0] || data;
      const status = msgResponse.status || data.status;
      const errorMsg = msgResponse['err_msg'] || data['err_msg'] || msgResponse.message || data.message;

      if (status === '0') {
        const messageId = msgResponse['msgid'] || data['msgid'] || 'unknown';
        console.log(`[MoceanAPI] SMS sent successfully via REST API. Message ID: ${messageId}`);
        
        return {
          success: true,
          messageId: messageId,
        };
      } else {
        console.error(`[MoceanAPI] REST API Error: ${errorMsg || `Status: ${status}`}`);
        return {
          success: false,
          error: errorMsg || `Status: ${status}`,
        };
      }
    }
  } catch (error: any) {
    console.error('[MoceanAPI] Error sending SMS:', error);
    
    return {
      success: false,
      error: error.message || error,
    };
  }
}

/**
 * Send notification SMS (formatted for CRM notifications)
 */
export async function sendNotificationSMS(
  to: string,
  title: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: any }> {
  const fullMessage = `🔔 ${title}\n\n${message}\n\n— Signature8 CRM`;
  return sendSMS(to, fullMessage);
}

/**
 * Test MoceanAPI configuration
 */
export async function testMoceanConfig(): Promise<{
  configured: boolean;
  apiKey?: string;
  fromNumber?: string;
  error?: string;
}> {
  if (!isMoceanConfigured()) {
    return {
      configured: false,
      error: 'Missing MoceanAPI credentials in .env file',
    };
  }

  const client = getMoceanClient();
  
  if (!client) {
    return {
      configured: false,
      error: 'Failed to initialize MoceanAPI client',
    };
  }

  if (!moceanConfig) {
    return {
      configured: false,
      error: 'Failed to initialize MoceanAPI configuration',
    };
  }

  try {
    // Just verify credentials are present - actual test will be done when sending SMS
    // The SDK will validate credentials when making actual API calls
    return {
      configured: true,
      apiKey: moceanConfig.apiKey.substring(0, 8) + '...', // Show partial key for security
      fromNumber: moceanConfig.fromNumber || 'Default',
    };
  } catch (error: any) {
    return {
      configured: false,
      error: error.message || 'Failed to verify API credentials',
    };
  }
}

