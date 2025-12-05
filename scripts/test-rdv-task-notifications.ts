/**
 * Test Script: RDV and Task Notification System
 * 
 * This script tests that WhatsApp notifications are sent when:
 * 1. Creating a new RDV (appointment)
 * 2. Creating a new task
 * 
 * Usage:
 *   npx tsx scripts/test-rdv-task-notifications.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRdvTaskNotifications() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📱 RDV & Task Notification System - Test Script      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    try {
        // Get admin user for testing
        const admin = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, name: true, email: true, phone: true }
        });

        if (!admin) {
            console.error('❌ No admin user found. Please create an admin user first.');
            return;
        }

        console.log('✅ Admin user found:', admin.name);
        console.log('   Email:', admin.email);
        console.log('   Phone:', admin.phone || '⚠️ NO PHONE NUMBER');
        console.log();

        // Get a test client
        const client = await prisma.client.findFirst({
            select: { id: true, nom: true }
        });

        if (!client) {
            console.error('❌ No client found. Please create a client first.');
            return;
        }

        console.log('✅ Test client found:', client.nom);
        console.log();

        // Test 1: Create RDV via Calendar API
        console.log('🧪 TEST 1: Creating RDV via Calendar API...\n');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);

        const endTime = new Date(tomorrow);
        endTime.setHours(15, 0, 0, 0);

        const rdvData = {
            title: '🧪 Test RDV - Notification System',
            description: 'This is a test RDV to verify WhatsApp notifications are working',
            startDate: tomorrow.toISOString(),
            endDate: endTime.toISOString(),
            eventType: 'rendez_vous',
            assignedTo: admin.id,
            location: 'Bureau Test',
            reminderType: 'day_1',
            linkedClientId: client.id,
            participants: [],
            visibility: 'team'
        };

        console.log('   Creating RDV with data:');
        console.log('   - Title:', rdvData.title);
        console.log('   - Assigned to:', admin.name);
        console.log('   - Date:', tomorrow.toLocaleString('fr-FR'));
        console.log('   - Location:', rdvData.location);
        console.log();

        const rdvResponse = await fetch('http://localhost:3000/api/calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rdvData),
            credentials: 'include'
        });

        if (!rdvResponse.ok) {
            const error = await rdvResponse.json();
            console.error('❌ RDV creation failed:', error);
        } else {
            const rdv = await rdvResponse.json();
            console.log('✅ RDV created successfully!');
            console.log('   RDV ID:', rdv.id);
            console.log();

            // Check notifications
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

            const notifications = await prisma.notification.findMany({
                where: {
                    userId: admin.id,
                    linkedId: rdv.id,
                    type: 'rdv_created'
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            console.log(`   Found ${notifications.length} notification(s) for admin:`);
            notifications.forEach((notif, index) => {
                const whatsappSent = notif.metadata && typeof notif.metadata === 'object' && 'whatsappSent' in notif.metadata
                    ? (notif.metadata as any).whatsappSent
                    : false;
                console.log(`   ${index + 1}. ${notif.title}`);
                console.log(`      WhatsApp Sent: ${whatsappSent ? '✅ Yes' : '❌ No'}`);
                console.log(`      Created: ${notif.createdAt.toLocaleString('fr-FR')}`);
            });
            console.log();
        }

        // Test 2: Create Task
        console.log('🧪 TEST 2: Creating Task...\n');

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        dueDate.setHours(17, 0, 0, 0);

        const taskData = {
            title: '🧪 Test Task - Notification System',
            description: 'This is a test task to verify WhatsApp notifications are working',
            dueDate: dueDate.toISOString(),
            assignedTo: admin.name, // Tasks use name, not ID
            linkedType: 'client',
            linkedId: client.id,
            linkedName: client.nom,
            status: 'a_faire',
            reminderEnabled: true,
            reminderDays: 1,
            createdBy: 'Test System'
        };

        console.log('   Creating task with data:');
        console.log('   - Title:', taskData.title);
        console.log('   - Assigned to:', taskData.assignedTo);
        console.log('   - Due date:', dueDate.toLocaleString('fr-FR'));
        console.log('   - Linked to:', taskData.linkedName);
        console.log();

        const taskResponse = await fetch('http://localhost:3000/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
            credentials: 'include'
        });

        if (!taskResponse.ok) {
            const error = await taskResponse.json();
            console.error('❌ Task creation failed:', error);
        } else {
            const taskResult = await taskResponse.json();
            console.log('✅ Task created successfully!');
            console.log('   Task ID:', taskResult.data?.id);
            console.log();

            // Check notifications
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

            const notifications = await prisma.notification.findMany({
                where: {
                    userId: admin.id,
                    linkedId: taskResult.data?.id,
                    type: 'task_assigned'
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            console.log(`   Found ${notifications.length} notification(s) for admin:`);
            notifications.forEach((notif, index) => {
                const whatsappSent = notif.metadata && typeof notif.metadata === 'object' && 'whatsappSent' in notif.metadata
                    ? (notif.metadata as any).whatsappSent
                    : false;
                console.log(`   ${index + 1}. ${notif.title}`);
                console.log(`      WhatsApp Sent: ${whatsappSent ? '✅ Yes' : '❌ No'}`);
                console.log(`      Created: ${notif.createdAt.toLocaleString('fr-FR')}`);
            });
            console.log();
        }

        // Summary
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  📊 Test Summary                                       ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        console.log('✅ Tests completed!');
        console.log();
        console.log('📱 What to check:');
        console.log('   1. Check if admin received WhatsApp messages on phone:', admin.phone || 'N/A');
        console.log('   2. Check notifications in the app');
        console.log('   3. Verify both RDV and Task notifications were sent');
        console.log();
        console.log('🔍 Troubleshooting:');
        console.log('   - If WhatsApp not sent, check ULTRA_INSTANCE_ID and ULTRA_TOKEN in .env');
        console.log('   - Verify phone number is in international format (+212...)');
        console.log('   - Check UltraMSG instance is connected to WhatsApp');
        console.log('   - Review server logs for detailed error messages');
        console.log();

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testRdvTaskNotifications();
