/**
 * WhatsApp Notification Helper
 * 
 * Reusable function to send WhatsApp notifications and store them in the database.
 * This function can be called from anywhere in the application (client or server).
 * 
 * @example
 * ```ts
 * await sendWhatsAppNotification({
 *   userId: architect.id,
 *   phone: architect.phone,
 *   title: "Nouveau RDV créé",
 *   message: `📅 Un nouveau RDV a été ajouté.\nClient: ${client.name}\nDate: ${date} ${time}`,
 *   type: "rdv_created",
 *   priority: "high",
 *   linkedType: "rdv",
 *   linkedId: rdv.id,
 *   linkedName: client.name,
 * });
 * ```
 */

export interface WhatsAppNotificationData {
    /** User ID to send notification to */
    userId: string;
    /** Phone number in international format (e.g., +212612345678) */
    phone: string;
    /** Notification title */
    title: string;
    /** WhatsApp message body */
    message: string;
    /** Notification type (must match NotificationType enum) */
    type: string;
    /** Priority level: "high" | "medium" | "low" */
    priority?: "high" | "medium" | "low";
    /** Type of linked entity (e.g., "rdv", "task", "contact", "opportunity") */
    linkedType?: string;
    /** ID of the linked entity */
    linkedId?: string;
    /** Name/title of the linked entity */
    linkedName?: string;
    /** Additional metadata to store with the notification */
    metadata?: any;
}

export interface WhatsAppNotificationResponse {
    ok: boolean;
    whatsappSent?: boolean;
    apiResponse?: any;
    savedNotification?: any;
    error?: string;
}

/**
 * Send a WhatsApp notification and store it in the database
 * 
 * This function handles both WhatsApp delivery and database storage.
 * If WhatsApp fails, the notification is still saved in the database.
 * 
 * @param data - Notification data
 * @returns Promise with response data
 */
export async function sendWhatsAppNotification(
    data: WhatsAppNotificationData
): Promise<WhatsAppNotificationResponse> {
    try {
        // Determine if we're in a browser or server environment
        const isServer = typeof window === 'undefined';

        // Build the API URL
        const baseUrl = isServer
            ? process.env.NEXT_PUBLIC_APP_URL || 'https://signature8-sketch.vercel.app'
            : '';

        const url = `${baseUrl}/api/notifications/whatsapp`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
            console.error("❌ WhatsApp Notification API Error:", result.error);
            return {
                ok: false,
                error: result.error || "Failed to send notification",
                ...result,
            };
        }

        console.log("✅ WhatsApp notification sent:", {
            to: data.phone,
            type: data.type,
            whatsappSent: result.whatsappSent,
        });

        return result;

    } catch (err: any) {
        console.error("❌ WhatsApp Notification Error:", err);
        return {
            ok: false,
            error: err.message || "Network error",
        };
    }
}

/**
 * Send multiple WhatsApp notifications in parallel
 * 
 * @param notifications - Array of notification data
 * @returns Promise with array of responses
 */
export async function sendBulkWhatsAppNotifications(
    notifications: WhatsAppNotificationData[]
): Promise<WhatsAppNotificationResponse[]> {
    try {
        const promises = notifications.map(data => sendWhatsAppNotification(data));
        return await Promise.all(promises);
    } catch (err: any) {
        console.error("❌ Bulk WhatsApp Notification Error:", err);
        return notifications.map(() => ({
            ok: false,
            error: err.message || "Bulk send failed",
        }));
    }
}

/**
 * Helper function to format phone numbers for WhatsApp
 * Ensures phone is in international format
 * 
 * @param phone - Phone number (can be with or without country code)
 * @param defaultCountryCode - Default country code if not present (e.g., "212" for Morocco)
 * @returns Formatted phone number
 */
export function formatPhoneForWhatsApp(
    phone: string,
    defaultCountryCode: string = "212"
): string {
    // Remove all spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-()]/g, '');

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // Add country code if not present
    if (!cleaned.startsWith('+')) {
        cleaned = `+${defaultCountryCode}${cleaned}`;
    }

    return cleaned;
}
