/**
 * WhatsApp Notification System Test Script
 * 
 * This script tests the WhatsApp notification system to ensure everything is working properly.
 * 
 * Usage:
 *   npx tsx scripts/test-whatsapp.ts
 * 
 * Or with phone number:
 *   npx tsx scripts/test-whatsapp.ts +212612345678
 */

import { sendWhatsAppNotification } from "../lib/sendWhatsAppNotification";

async function testWhatsAppNotification() {
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║  📱 WhatsApp Notification System - Test Script          ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    // Check environment variables
    console.log("🔍 Checking environment variables...\n");

    const ULTRA_ID = process.env.ULTRA_INSTANCE_ID;
    const ULTRA_TOKEN = process.env.ULTRA_TOKEN;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

    console.log(`  ULTRA_INSTANCE_ID: ${ULTRA_ID ? '✅ Set' : '❌ Not set'}`);
    console.log(`  ULTRA_TOKEN: ${ULTRA_TOKEN ? '✅ Set' : '❌ Not set'}`);
    console.log(`  NEXT_PUBLIC_APP_URL: ${APP_URL || 'http://localhost:3000 (default)'}\n`);

    if (!ULTRA_ID || !ULTRA_TOKEN) {
        console.log("❌ ERROR: Missing UltraMSG credentials!\n");
        console.log("Please add the following to your .env.local file:\n");
        console.log("  ULTRA_INSTANCE_ID=your_instance_id");
        console.log("  ULTRA_TOKEN=your_token");
        console.log("  NEXT_PUBLIC_APP_URL=http://localhost:3000\n");
        console.log("Get credentials from: https://ultramsg.com/\n");
        process.exit(1);
    }

    // Get phone number from command line or use default
    const phoneNumber = process.argv[2] || "+212612345678";

    console.log(`📞 Testing with phone number: ${phoneNumber}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Test 1: Simple notification
    console.log("🧪 TEST 1: Sending simple WhatsApp notification...\n");

    try {
        const result = await sendWhatsAppNotification({
            userId: "test_user_123",
            phone: phoneNumber,
            title: "Test WhatsApp Notification",
            message: `🧪 *Test de Notification WhatsApp*\n\n` +
                `✅ Votre système de notifications WhatsApp fonctionne correctement!\n\n` +
                `📅 Date: ${new Date().toLocaleString('fr-FR')}\n` +
                `🔧 Environnement: ${process.env.NODE_ENV || 'development'}\n\n` +
                `Si vous recevez ce message, votre intégration UltraMSG est configurée avec succès! 🎉`,
            type: "rdv_created",
            priority: "medium",
            linkedType: "test",
            linkedId: "test_123",
            linkedName: "Test Notification",
            metadata: {
                testMode: true,
                timestamp: new Date().toISOString(),
            },
        });

        console.log("📊 Result:\n");
        console.log(`  Status: ${result.ok ? '✅ Success' : '❌ Failed'}`);
        console.log(`  WhatsApp Sent: ${result.whatsappSent ? '✅ Yes' : '❌ No'}`);

        if (result.savedNotification) {
            console.log(`  Notification Saved: ✅ Yes (ID: ${result.savedNotification.id})`);
        } else {
            console.log(`  Notification Saved: ❌ No`);
        }

        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Test 2: Check database
        console.log("🧪 TEST 2: Verifying database storage...\n");

        if (result.savedNotification) {
            console.log("✅ Notification saved to database:");
            console.log(`   ID: ${result.savedNotification.id}`);
            console.log(`   Type: ${result.savedNotification.type}`);
            console.log(`   Priority: ${result.savedNotification.priority}`);
            console.log(`   Title: ${result.savedNotification.title}`);
            console.log(`   Created: ${result.savedNotification.createdAt}`);

            if (result.savedNotification.metadata) {
                console.log(`   Metadata: ${JSON.stringify(result.savedNotification.metadata, null, 2)}`);
            }
        } else {
            console.log("❌ Notification was not saved to database");
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        // Summary
        console.log("📋 TEST SUMMARY\n");

        if (result.ok && result.whatsappSent && result.savedNotification) {
            console.log("✅ ALL TESTS PASSED!\n");
            console.log("Your WhatsApp notification system is working perfectly! 🎉\n");
            console.log("Next steps:");
            console.log("  1. Check your phone for the WhatsApp message");
            console.log("  2. Integrate into your CRM workflows");
            console.log("  3. See lib/whatsapp-integration-examples.ts for examples\n");
        } else if (result.ok && !result.whatsappSent && result.savedNotification) {
            console.log("⚠️  PARTIAL SUCCESS\n");
            console.log("Notification was saved to database, but WhatsApp delivery may have failed.\n");
            console.log("Possible reasons:");
            console.log("  - UltraMSG instance not connected to WhatsApp");
            console.log("  - Phone number not on WhatsApp");
            console.log("  - Rate limit exceeded");
            console.log("  - Invalid credentials\n");
            console.log("Check UltraMSG dashboard: https://ultramsg.com/\n");
        } else {
            console.log("❌ TESTS FAILED\n");
            console.log("Please check the error messages above and try again.\n");
        }

    } catch (error: any) {
        console.log("❌ ERROR during testing:\n");
        console.log(`  ${error.message}\n`);
        console.log("Stack trace:");
        console.log(error.stack);
        process.exit(1);
    }
}

// Run the test
testWhatsAppNotification()
    .then(() => {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        console.log("Test completed! ✅\n");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Fatal error:", error);
        process.exit(1);
    });
