
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
            // console.error(text.substring(0, 500) + "..."); 
            throw new Error("Invalid JSON response from server");
        }
    } catch (err) {
        console.error("❌ Network or Fetch Error:", err);
        return { ok: false, error: String(err) };
    }
}

async function main() {
    console.log("🔍 Searching for user 'Radia'...");

    const user = await prisma.user.findFirst({
        where: {
            name: {
                contains: 'Radia',
                mode: 'insensitive'
            }
        }
    });

    if (!user) {
        console.log("❌ User 'Radia' not found in database.");
        console.log("Listing first 5 users to help you find the right name:");
        const users = await prisma.user.findMany({ take: 5, select: { name: true, phone: true } });
        console.table(users);
        return;
    }

    console.log(`✅ Found user: ${user.name}`);
    console.log(`📞 Phone: ${user.phone || 'No phone number'}`);
    console.log(`🆔 ID: ${user.id}`);

    if (!user.phone) {
        console.log("❌ User has no phone number. Cannot send WhatsApp.");
        return;
    }

    // Create RDV for Tomorrow at 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    console.log(`\n📅 Creating Calendar Event (RDV) for ${tomorrow.toLocaleString()}...`);

    const rdv = await prisma.calendarEvent.create({
        data: {
            title: "RDV Client - Projet Villa (Test)",
            description: "Réunion de suivi projet villa (Test Automatique)",
            startDate: tomorrow,
            endDate: endTime,
            eventType: "rendez_vous",
            assignedTo: user.id,
            location: "Bureau Signature8",
            visibility: "team",
            createdBy: user.id, // Assigned to self for test
            participants: [user.id]
        }
    });

    console.log(`✅ RDV Created! ID: ${rdv.id}`);

    console.log("\n🚀 Sending WhatsApp Notification...");

    const result = await sendTestNotification({
        userId: user.id,
        phone: user.phone,
        title: "Nouveau RDV Assigné",
        message: `📅 *Nouveau Rendez-vous Assigné*\n\n` +
            `Un nouveau RDV a été ajouté à votre agenda.\n\n` +
            `📌 *Titre:* ${rdv.title}\n` +
            `📆 *Date:* ${tomorrow.toLocaleDateString('fr-FR')}\n` +
            `⏰ *Heure:* ${tomorrow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `📍 *Lieu:* ${rdv.location}\n\n` +
            `Merci de consulter votre agenda.`,
        type: "rdv_created",
        priority: "high",
        linkedType: "calendar_event",
        linkedId: rdv.id,
        linkedName: rdv.title
    });

    console.log("\n📊 Result:");
    console.log(`Status: ${result.ok ? '✅ Success' : '❌ Failed'}`);
    console.log(`WhatsApp Sent: ${result.whatsappSent ? '✅ Yes' : '⚠️ No'}`);

    if (result.savedNotification) {
        console.log(`Notification Saved ID: ${result.savedNotification.id}`);
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
