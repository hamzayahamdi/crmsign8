/**
 * Test script to verify WhatsApp notifications for calendar events
 * 
 * This script creates a test calendar event and sends WhatsApp notifications
 * to verify the integration is working correctly.
 */

import { prisma } from '../lib/database';

async function testCalendarWhatsApp() {
    console.log('\n🧪 Testing Calendar WhatsApp Notifications...\n');

    try {
        // 1. Find a user with a phone number (e.g., Radia)
        const testUser = await prisma.user.findFirst({
            where: {
                phone: { not: null }
            },
            select: { id: true, name: true, email: true, phone: true }
        });

        if (!testUser) {
            console.error('❌ No user found with a phone number');
            return;
        }

        console.log('✅ Found test user:', testUser.name, testUser.phone);

        // 2. Find the current user (admin or any user to be the creator)
        const creator = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, name: true }
        });

        if (!creator) {
            console.error('❌ No admin user found');
            return;
        }

        console.log('✅ Creator:', creator.name);

        // 3. Create a test calendar event
        const testEvent = {
            title: 'Test RDV WhatsApp',
            description: 'Test de notification WhatsApp pour RDV',
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
            eventType: 'rendez_vous',
            assignedTo: creator.id,
            location: 'Bureau Signature8',
            reminderType: 'none',
            participants: [testUser.id],
            visibility: 'team',
            createdBy: creator.id
        };

        console.log('\n📅 Creating test event...');
        console.log('   Participants:', [testUser.name]);

        // 4. Make API call to create event (this will trigger WhatsApp)
        const response = await fetch('http://localhost:3000/api/calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testEvent)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Failed to create event:', error);
            return;
        }

        const createdEvent = await response.json();
        console.log('✅ Event created:', createdEvent.id);

        // 5. Wait a bit for WhatsApp to be sent
        console.log('\n⏳ Waiting for WhatsApp notification to be sent...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 6. Check if notification was saved in database
        const notifications = await prisma.notification.findMany({
            where: {
                linkedId: createdEvent.id,
                linkedType: 'calendar_event'
            },
            select: {
                id: true,
                userId: true,
                title: true,
                metadata: true,
                createdAt: true
            }
        });

        console.log(`\n📊 Found ${notifications.length} notification(s) in database`);

        notifications.forEach(notif => {
            const metadata = notif.metadata as any;
            console.log(`\n   Notification ID: ${notif.id}`);
            console.log(`   User ID: ${notif.userId}`);
            console.log(`   Title: ${notif.title}`);
            console.log(`   WhatsApp Sent: ${metadata?.whatsappSent ? '✅ YES' : '❌ NO'}`);
            console.log(`   Phone: ${metadata?.phone || 'N/A'}`);
            if (metadata?.whatsappResponse) {
                console.log(`   UltraMSG Response:`, metadata.whatsappResponse);
            }
        });

        console.log('\n✅ Test completed!');
        console.log('\n📱 Check the phone number:', testUser.phone);
        console.log('   to verify WhatsApp message was received.\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testCalendarWhatsApp();
