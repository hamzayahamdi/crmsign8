/**
 * WhatsApp Notification System - Complete Test Guide
 * 
 * Follow these steps to test your WhatsApp notification system
 */

// ============================================
// STEP 1: Start Your Dev Server
// ============================================
// Run in terminal: npm run dev
// Wait for: "Ready on http://localhost:3000"

// ============================================
// STEP 2: Setup Environment Variables
// ============================================
// Add to .env.local file:
/*
ULTRA_INSTANCE_ID=your_instance_id_here
ULTRA_TOKEN=your_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
*/

// Get credentials from: https://ultramsg.com/

// ============================================
// STEP 3: Test via Browser (Easiest!)
// ============================================
// Open in browser (replace with your phone number):
// http://localhost:3000/api/notifications/whatsapp/test?phone=+212612345678

// ============================================
// STEP 4: Test via Command Line
// ============================================
// Run: npx tsx scripts/simple-test.ts +212612345678

// ============================================
// STEP 5: Test via Code
// ============================================

import { sendWhatsAppNotification } from "../lib/sendWhatsAppNotification";

export async function testInCode() {
    const result = await sendWhatsAppNotification({
        userId: "test_user",
        phone: "+212612345678", // Replace with your phone
        title: "Test Notification",
        message: "🧪 Test WhatsApp notification from code!",
        type: "rdv_created",
        priority: "medium",
    });

    console.log("Result:", result);

    if (result.ok) {
        console.log("✅ Success!");
        console.log("WhatsApp sent:", result.whatsappSent);
        console.log("Notification ID:", result.savedNotification?.id);
    } else {
        console.log("❌ Failed:", result.error);
    }
}

// ============================================
// STEP 6: Check Database
// ============================================
// Run in Prisma Studio: npx prisma studio
// Or query: SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

// ============================================
// TROUBLESHOOTING
// ============================================

/*
❌ "Dev server is not running"
   → Run: npm run dev

❌ "WhatsApp API not configured"
   → Add ULTRA_INSTANCE_ID and ULTRA_TOKEN to .env.local

❌ "Invalid phone number format"
   → Use international format: +212612345678

❌ "WhatsApp not received but notification saved"
   → Check UltraMSG dashboard
   → Verify instance is connected to WhatsApp
   → Verify phone number is on WhatsApp

❌ "Notification not saved to database"
   → Check database connection
   → Run: npx prisma db push
   → Run: npx prisma generate
*/

// ============================================
// QUICK TEST COMMANDS
// ============================================

/*
# 1. Start dev server
npm run dev

# 2. In another terminal, test with browser:
# Open: http://localhost:3000/api/notifications/whatsapp/test?phone=+212612345678

# 3. Or test with script:
npx tsx scripts/simple-test.ts +212612345678

# 4. Check database:
npx prisma studio
*/

// ============================================
// EXPECTED RESULTS
// ============================================

/*
✅ SUCCESS:
{
  "ok": true,
  "whatsappSent": true,
  "savedNotification": {
    "id": "notif_xxx",
    "userId": "test_user",
    "type": "rdv_created",
    "priority": "medium",
    "title": "Test Notification",
    "message": "...",
    "metadata": {
      "whatsappSent": true,
      "phone": "+212612345678",
      "sentAt": "2025-11-27T10:00:00Z"
    }
  }
}

You should receive a WhatsApp message on your phone! 📱
*/

export default {
    testInCode,
};
