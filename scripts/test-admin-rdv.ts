
import { prisma } from "../lib/database";

// Custom implementation for testing to debug the issue
async function sendTestNotification(data: any) {
    const url = "http://localhost:3000/api/notifications/whatsapp";
    console.log(`\n📡 Sending request to: ${url}`);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const text = await res.text();
        console.log(`📥 Response Status: ${res.status}`);

        try {
            const json = JSON.parse(text);
            return json;
        } catch (e) {
            console.error("❌ Failed to parse JSON response:");
            console.error(text.substring(0, 500) + "..."); // Print first 500 chars
            throw new Error("Invalid JSON response from server");
        }
    } catch (err) {
        console.error("❌ Network or Fetch Error:", err);
        return { ok: false, error: String(err) };
    }
}

async function main() {
    console.log("🔍 Searching for admin user with phone number...");

    // Try to find an admin user with a phone number
    const admin = await prisma.user.findFirst({
        where: {
            role: {
                in: ['admin', 'ADMIN', 'superadmin', 'administrateur']
            },
            phone: {
                not: null
            }
        }
    });

    if (!admin) {
        console.log("❌ No admin user with a phone number found.");

        // Fallback: List available users with phone numbers to help debug
        const usersWithPhone = await prisma.user.findMany({
            where: { phone: { not: null } },
            select: { name: true, role: true, phone: true },
            take: 5
        });

        if (usersWithPhone.length > 0) {
            console.log("\nHere are some users with phone numbers you could test with:");
            console.table(usersWithPhone);
        } else {
            console.log("No users found with phone numbers in the database.");
        }
        return;
    }

    console.log(`✅ Found admin: ${admin.name}`);
    console.log(`📞 Phone: ${admin.phone}`);
    console.log(`🆔 ID: ${admin.id}`);

    console.log("\n🚀 Sending Test RDV Notification...");

    const rdvDate = new Date();
    rdvDate.setDate(rdvDate.getDate() + 1); // Tomorrow
    const dateStr = rdvDate.toLocaleDateString('fr-FR');

    // Use our custom sender for debugging
    const result = await sendTestNotification({
        userId: admin.id,
        phone: admin.phone!,
        title: "Nouveau RDV (Test Admin)",
        message: `📅 *Nouveau Rendez-vous (Test)*\n\n` +
            `Ceci est un test d'envoi automatique à l'admin.\n\n` +
            `👤 Client: Jean Dupont (Test)\n` +
            `📆 Date: ${dateStr}\n` +
            `⏰ Heure: 14:30\n` +
            `📍 Lieu: Showroom Principal\n\n` +
            `✅ Merci de confirmer la réception.`,
        type: "rdv_created",
        priority: "high",
        linkedType: "rdv",
        linkedId: "test-rdv-admin",
        linkedName: "Jean Dupont"
    });

    console.log("\n📊 Result:");
    console.log(`Status: ${result.ok ? '✅ Success' : '❌ Failed'}`);
    console.log(`WhatsApp Sent: ${result.whatsappSent ? '✅ Yes' : '⚠️ No (Check UltraMSG subscription)'}`);

    if (result.savedNotification) {
        console.log(`Notification Saved ID: ${result.savedNotification.id}`);
    }

    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
}

main()
    .catch(e => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
