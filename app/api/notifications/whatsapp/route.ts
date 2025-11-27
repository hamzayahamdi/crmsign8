import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

/**
 * WhatsApp Notification API Route
 * 
 * Sends WhatsApp messages via UltraMSG API and stores notifications in the database.
 * 
 * @route POST /api/notifications/whatsapp
 * @body {
 *   userId: string;
 *   phone: string;
 *   title: string;
 *   message: string;
 *   type: NotificationType;
 *   priority?: NotificationPriority;
 *   linkedType?: string;
 *   linkedId?: string;
 *   linkedName?: string;
 *   metadata?: any;
 * }
 */
export async function POST(req: Request) {
    try {
        const {
            userId,
            phone,
            title,
            message,
            priority = "medium",
            type,
            linkedType,
            linkedId,
            linkedName,
            metadata,
        } = await req.json();

        // Validate required fields
        if (!userId || !phone || !message || !type) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    required: ["userId", "phone", "message", "type"]
                },
                { status: 400 }
            );
        }

        // Validate phone format (basic validation)
        const cleanPhone = phone.replace(/\s+/g, '');
        if (!cleanPhone.match(/^\+?[1-9]\d{1,14}$/)) {
            return NextResponse.json(
                { error: "Invalid phone number format. Use international format (e.g., +212612345678)" },
                { status: 400 }
            );
        }

        // Get UltraMSG credentials from environment
        const ULTRA_ID = process.env.ULTRA_INSTANCE_ID;
        const ULTRA_TOKEN = process.env.ULTRA_TOKEN;

        if (!ULTRA_ID || !ULTRA_TOKEN) {
            console.error("❌ UltraMSG credentials not configured");

            // Still save notification even if WhatsApp fails
            const saved = await prisma.notification.create({
                data: {
                    userId,
                    title: title || "Notification",
                    message: `${message}\n\n⚠️ WhatsApp delivery failed: API not configured`,
                    type,
                    priority,
                    linkedType,
                    linkedId,
                    linkedName,
                    metadata: {
                        ...metadata,
                        whatsappError: "UltraMSG credentials not configured",
                        attemptedPhone: phone,
                    },
                    createdBy: userId,
                },
            });

            return NextResponse.json({
                ok: false,
                error: "WhatsApp API not configured",
                savedNotification: saved,
            }, { status: 500 });
        }

        const url = `https://api.ultramsg.com/${ULTRA_ID}/messages/chat`;

        let apiResponse: any = null;
        let whatsappSuccess = false;

        // Attempt to send WhatsApp message
        try {
            const resp = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: ULTRA_TOKEN,
                    to: cleanPhone,
                    body: message,
                }),
            });

            apiResponse = await resp.json();
            whatsappSuccess = resp.ok;

            if (!resp.ok) {
                console.error("❌ UltraMSG API error:", apiResponse);
            } else {
                console.log("✅ WhatsApp message sent successfully to", cleanPhone);
            }
        } catch (whatsappError: any) {
            console.error("❌ WhatsApp sending failed:", whatsappError.message);
            apiResponse = { error: whatsappError.message };
        }

        // Save notification in database (always, regardless of WhatsApp success)
        const saved = await prisma.notification.create({
            data: {
                userId,
                title: title || "Notification",
                message: whatsappSuccess
                    ? message
                    : `${message}\n\n⚠️ WhatsApp delivery may have failed`,
                type,
                priority,
                linkedType,
                linkedId,
                linkedName,
                metadata: {
                    ...metadata,
                    whatsappSent: whatsappSuccess,
                    whatsappResponse: apiResponse,
                    phone: cleanPhone,
                    sentAt: new Date().toISOString(),
                },
                createdBy: userId,
            },
        });

        return NextResponse.json({
            ok: true,
            whatsappSent: whatsappSuccess,
            apiResponse,
            savedNotification: saved,
        });

    } catch (e: any) {
        console.error("❌ WhatsApp notification error:", e);

        return NextResponse.json(
            {
                error: e.message || "Internal server error",
                details: process.env.NODE_ENV === 'development' ? e.stack : undefined
            },
            { status: 500 }
        );
    }
}
