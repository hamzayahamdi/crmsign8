/**
 * Simple WhatsApp Test - Direct API Call
 * 
 * This tests the WhatsApp notification API endpoint directly
 * Run with: npx tsx scripts/simple-test.ts YOUR_PHONE_NUMBER
 */

async function testWhatsAppAPI() {
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║     📱 WhatsApp Notification - Simple Test              ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    // Get phone number from command line
    const phoneNumber = process.argv[2];

    if (!phoneNumber) {
        console.log("❌ Please provide a phone number!\n");
        console.log("Usage: npx tsx scripts/simple-test.ts +212612345678\n");
        process.exit(1);
    }

    console.log(`📞 Testing with phone number: ${phoneNumber}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const testData = {
        userId: "test_user_123",
        phone: phoneNumber,
        title: "Test WhatsApp Notification",
        message: `🧪 *Test de Notification WhatsApp*\n\n` +
            `✅ Votre système fonctionne!\n\n` +
            `📅 ${new Date().toLocaleString('fr-FR')}\n\n` +
            `Si vous recevez ce message, tout est OK! 🎉`,
        type: "rdv_created",
        priority: "medium",
        linkedType: "test",
        linkedId: "test_123",
        linkedName: "Test Notification",
    };

    console.log("📤 Sending request to API...\n");
    console.log("Request data:");
    console.log(JSON.stringify(testData, null, 2));
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
        const response = await fetch("http://localhost:3000/api/notifications/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testData),
        });

        const result = await response.json();

        console.log("📥 Response received:\n");
        console.log(`  Status Code: ${response.status} ${response.ok ? '✅' : '❌'}`);
        console.log(`  Response:\n`);
        console.log(JSON.stringify(result, null, 2));
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        if (response.ok && result.ok) {
            console.log("✅ SUCCESS!\n");
            console.log(`  WhatsApp Sent: ${result.whatsappSent ? '✅ Yes' : '⚠️  No (but notification saved)'}`);
            console.log(`  Notification ID: ${result.savedNotification?.id || 'N/A'}`);
            console.log("\n🎉 Test completed successfully!\n");

            if (result.whatsappSent) {
                console.log("📱 Check your phone for the WhatsApp message!\n");
            } else {
                console.log("⚠️  WhatsApp may not have been sent, but notification was saved to database.\n");
                console.log("Possible reasons:");
                console.log("  - UltraMSG credentials not configured");
                console.log("  - UltraMSG instance not connected");
                console.log("  - Phone number not on WhatsApp\n");
            }
        } else {
            console.log("❌ TEST FAILED\n");
            console.log(`Error: ${result.error || 'Unknown error'}\n`);

            if (result.error?.includes("Missing required fields")) {
                console.log("Check that all required fields are provided.");
            } else if (result.error?.includes("not configured")) {
                console.log("Add UltraMSG credentials to .env.local:");
                console.log("  ULTRA_INSTANCE_ID=your_instance_id");
                console.log("  ULTRA_TOKEN=your_token\n");
            }
        }

    } catch (error: any) {
        console.log("❌ ERROR:\n");

        if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
            console.log("  Dev server is not running!\n");
            console.log("  Please start it with: npm run dev\n");
        } else {
            console.log(`  ${error.message}\n`);
        }

        process.exit(1);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

testWhatsAppAPI().catch(console.error);
