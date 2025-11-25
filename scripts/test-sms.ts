/**
 * Test SMS Notifications via Twilio
 * 
 * This script helps you test your Twilio configuration
 * and send test SMS messages.
 * 
 * Usage:
 *   npm run test:sms
 *   npm run test:sms +212612345678
 */

// Load environment variables from .env and .env.local files
import { config } from 'dotenv';
config(); // Load .env
config({ path: '.env.local' }); // Load .env.local (overrides .env)

import { testMoceanConfig, sendSMS, formatPhoneNumber } from '../lib/mocean-service';

async function main() {
  console.log('🔧 Testing MoceanAPI Configuration...\n');

  // Test 1: Check configuration
  console.log('Step 1: Checking MoceanAPI credentials...');
  const config = await testMoceanConfig();
  
  if (!config.configured) {
    console.error('❌ MoceanAPI is not configured properly!');
    console.error('Error:', config.error);
    console.log('\n📝 To configure MoceanAPI, add these to your .env file:');
    console.log('   MOCEAN_API_KEY=your_api_key');
    console.log('   MOCEAN_API_SECRET=your_api_secret');
    console.log('   MOCEAN_FROM_NUMBER=your_sender_id (optional)');
    console.log('\nGet your credentials from: https://moceanapi.com');
    process.exit(1);
  }

  console.log('✅ MoceanAPI configured successfully!');
  console.log(`   API Key: ${config.apiKey}`);
  console.log(`   From Number: ${config.fromNumber}\n`);

  // Test 2: Format phone numbers
  console.log('Step 2: Testing phone number formatting...');
  const testNumbers = [
    '0612345678',
    '612345678',
    '+212612345678',
    '212612345678',
  ];

  testNumbers.forEach(num => {
    const formatted = formatPhoneNumber(num);
    console.log(`   ${num} → ${formatted}`);
  });
  console.log('');

  // Test 3: Send test SMS
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.log('⚠️  No phone number provided for test SMS');
    console.log('   To send a test SMS, run:');
    console.log('   npm run test:sms +212612345678');
    console.log('');
    console.log('✅ Configuration test complete!');
    return;
  }

  console.log(`Step 3: Sending test SMS to ${phoneNumber}...`);
  
  const result = await sendSMS(
    phoneNumber,
    '🔔 Test Notification\n\nThis is a test SMS from Signature8 CRM.\nYour Twilio integration is working!\n\n— Signature8 CRM'
  );

  if (result.success) {
    console.log('✅ SMS sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log('\n🎉 MoceanAPI is configured and working!');
  } else {
    console.error('❌ Failed to send SMS');
    console.error('Error:', result.error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Verify your API Key and Secret are correct in .env.local');
    console.log('   2. Check IP whitelist is empty or contains your IP in MoceanAPI dashboard');
    console.log('   3. Ensure the token is active (not expired/deactivated)');
    console.log('   4. Try generating a new token in MoceanAPI dashboard');
    console.log('   5. Check MoceanAPI dashboard for error logs: https://moceanapi.com');
  }
}

main()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

