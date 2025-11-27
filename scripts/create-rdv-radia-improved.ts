
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
        console.log("❌ User 'Radia' not found.");
        return;
    }

    console.log(`✅ Found user: ${user.name} (${user.phone})`);

    if (!user.phone) {
        console.log("❌ User has no phone number.");
        return;
    }

    // Create RDV for Tomorrow at 14:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(15, 30, 0, 0);

    console.log(`\n📅 Creating Calendar Event (RDV) for ${tomorrow.toLocaleString()}...`);

    const rdv = await prisma.calendarEvent.create({
        data: {
            title: "RDV Client - Projet Appartement Luxe",
            description: "Présentation des plans 3D et choix des matériaux.",
            startDate: tomorrow,
            endDate: endTime,
            eventType: "rendez_vous",
            assignedTo: user.id,
            location: "Showroom Signature8",
            visibility: "team",
            createdBy: user.id,
            participants: [user.id]
        }
    });

    console.log(`✅ RDV Created! ID: ${rdv.id}`);

    // Construct the calendar link
    // Assuming the app URL is localhost:3000 for now, but in prod it would be the real domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const calendarLink = `${appUrl}/calendrier?event=${rdv.id}`;

    console.log("\n🚀 Sending Improved WhatsApp Notification...");

    // Format date nicely (e.g., "Vendredi 28 Nov.")
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    const formattedDate = tomorrow.toLocaleDateString('fr-FR', dateOptions);
    // Capitalize first letter
    const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const result = await sendTestNotification({
        userId: user.id,
        phone: user.phone,
        title: "Nouveau RDV Assigné",
        message: `📅 *Nouveau Rendez-vous Confirmé*\n\n` +
            `Bonjour ${user.name.split(' ')[0]},\n` +
            `Un nouveau rendez-vous a été ajouté à votre agenda.\n\n` +
            `📌 *${rdv.title}*\n` +
            `───────────────\n` +
            `📆 *Date :* ${finalDate}\n` +
            `⏰ *Heure :* ${tomorrow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n` +
            `📍 *Lieu :* ${rdv.location}\n` +
            `📝 *Détails :* ${rdv.description}\n\n` +
            `🔗 *Voir dans l'agenda :*\n` +
            `${calendarLink}\n\n` +
            `💡 *Action requise :*\n` +
            `Merci de confirmer votre présence.`,
        type: "rdv_created",
        priority: "high",
        linkedType: "calendar_event",
        linkedId: rdv.id,
        linkedName: rdv.title
    });

    console.log("\n📊 Result:");
    console.log(`Status: ${result.ok ? '✅ Success' : '❌ Failed'}`);
    console.log(`WhatsApp Sent: ${result.whatsappSent ? '✅ Yes' : '⚠️ No'}`);
}

main()
    .catch(e => {
        console.error("❌ Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
