import { NextResponse } from "next/server";
import { sendWhatsAppNotification } from "@/lib/sendWhatsAppNotification";

/**
 * Test WhatsApp Notification API
 * 
 * Use this endpoint to test your WhatsApp integration
 * 
 * @route GET /api/notifications/whatsapp/test
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');
        const userId = searchParams.get('userId') || 'test_user';

        if (!phone) {
            return NextResponse.json(
                {
                    error: "Missing phone parameter",
                    usage: "GET /api/notifications/whatsapp/test?phone=+212612345678&userId=user_123"
                },
                { status: 400 }
            );
        }

        // Send test notification
        const result = await sendWhatsAppNotification({
            userId,
            phone,
            title: "Test WhatsApp Notification",
            message: `🧪 *Test de Notification WhatsApp*\n\n` +
                `✅ Votre système de notifications WhatsApp fonctionne correctement!\n\n` +
                `📅 Date: ${new Date().toLocaleString('fr-FR')}\n` +
                `🔧 Environnement: ${process.env.NODE_ENV}\n\n` +
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

        return NextResponse.json({
            success: true,
            message: "Test notification sent",
            result,
            info: {
                phone,
                userId,
                timestamp: new Date().toISOString(),
            },
        });

    } catch (e: any) {
        console.error("❌ Test notification error:", e);

        return NextResponse.json(
            {
                error: e.message || "Test failed",
                details: process.env.NODE_ENV === 'development' ? e.stack : undefined
            },
            { status: 500 }
        );
    }
}

/**
 * Send a custom test message via POST
 * 
 * @route POST /api/notifications/whatsapp/test
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { phone, message, userId = 'test_user' } = body;

        if (!phone || !message) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    required: ["phone", "message"]
                },
                { status: 400 }
            );
        }

        const result = await sendWhatsAppNotification({
            userId,
            phone,
            title: "Custom Test Message",
            message,
            type: "rdv_created",
            priority: "medium",
            linkedType: "test",
            linkedId: "custom_test",
            linkedName: "Custom Test",
            metadata: {
                testMode: true,
                customMessage: true,
                timestamp: new Date().toISOString(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Custom test message sent",
            result,
        });

    } catch (e: any) {
        console.error("❌ Custom test error:", e);

        return NextResponse.json(
            {
                error: e.message || "Test failed",
            },
            { status: 500 }
        );
    }
}
