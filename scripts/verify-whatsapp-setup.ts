/**
 * Environment Verification Script
 * 
 * Checks if all required environment variables and user data are configured
 * for WhatsApp notifications to work properly.
 * 
 * Usage:
 *   npx tsx scripts/verify-whatsapp-setup.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySetup() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  🔍 WhatsApp Notification Setup Verification          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    let allGood = true;

    // Check 1: Environment Variables
    console.log('📋 Checking Environment Variables...\n');

    const ULTRA_INSTANCE_ID = process.env.ULTRA_INSTANCE_ID;
    const ULTRA_TOKEN = process.env.ULTRA_TOKEN;

    if (ULTRA_INSTANCE_ID) {
        console.log('✅ ULTRA_INSTANCE_ID is set');
        console.log(`   Value: ${ULTRA_INSTANCE_ID.substring(0, 10)}...`);
    } else {
        console.log('❌ ULTRA_INSTANCE_ID is NOT set');
        allGood = false;
    }

    if (ULTRA_TOKEN) {
        console.log('✅ ULTRA_TOKEN is set');
        console.log(`   Value: ${ULTRA_TOKEN.substring(0, 10)}...`);
    } else {
        console.log('❌ ULTRA_TOKEN is NOT set');
        allGood = false;
    }

    console.log();

    // Check 2: Database Connection
    console.log('🗄️  Checking Database Connection...\n');

    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');
    } catch (error) {
        console.log('❌ Database connection failed:', error);
        allGood = false;
        return;
    }

    console.log();

    // Check 3: Users with Phone Numbers
    console.log('👥 Checking Users with Phone Numbers...\n');

    try {
        const usersWithPhone = await prisma.user.findMany({
            where: {
                phone: { not: null }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true
            }
        });

        if (usersWithPhone.length === 0) {
            console.log('⚠️  No users have phone numbers configured!');
            console.log('   WhatsApp notifications will not be sent.');
            allGood = false;
        } else {
            console.log(`✅ Found ${usersWithPhone.length} user(s) with phone numbers:\n`);
            usersWithPhone.forEach((user, index) => {
                const phoneValid = user.phone?.startsWith('+');
                console.log(`   ${index + 1}. ${user.name} (${user.role})`);
                console.log(`      Email: ${user.email}`);
                console.log(`      Phone: ${user.phone} ${phoneValid ? '✅' : '⚠️ Should start with +'}`);
                console.log();
            });
        }

        // Check admin specifically
        const admin = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, name: true, phone: true }
        });

        if (admin) {
            if (admin.phone) {
                console.log('✅ Admin user has phone number configured');
            } else {
                console.log('⚠️  Admin user does NOT have phone number');
                console.log('   To add phone number, run:');
                console.log(`   UPDATE users SET phone = '+212612345678' WHERE id = '${admin.id}';`);
                allGood = false;
            }
        } else {
            console.log('❌ No admin user found');
            allGood = false;
        }

    } catch (error) {
        console.log('❌ Error checking users:', error);
        allGood = false;
    }

    console.log();

    // Check 4: Recent Notifications
    console.log('🔔 Checking Recent Notifications...\n');

    try {
        const recentNotifications = await prisma.notification.findMany({
            where: {
                type: { in: ['rdv_created', 'task_assigned'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                type: true,
                title: true,
                createdAt: true,
                metadata: true
            }
        });

        if (recentNotifications.length === 0) {
            console.log('ℹ️  No recent RDV or Task notifications found');
            console.log('   This is normal if you haven\'t created any yet.');
        } else {
            console.log(`Found ${recentNotifications.length} recent notification(s):\n`);
            recentNotifications.forEach((notif, index) => {
                const whatsappSent = notif.metadata && typeof notif.metadata === 'object' && 'whatsappSent' in notif.metadata
                    ? (notif.metadata as any).whatsappSent
                    : false;
                console.log(`   ${index + 1}. ${notif.title}`);
                console.log(`      Type: ${notif.type}`);
                console.log(`      WhatsApp: ${whatsappSent ? '✅ Sent' : '❌ Not sent'}`);
                console.log(`      Created: ${notif.createdAt.toLocaleString('fr-FR')}`);
                console.log();
            });
        }
    } catch (error) {
        console.log('⚠️  Error checking notifications:', error);
    }

    console.log();

    // Summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 Verification Summary                               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    if (allGood) {
        console.log('✅ All checks passed! Your WhatsApp notification system is ready.');
        console.log();
        console.log('📱 Next Steps:');
        console.log('   1. Run: npx tsx scripts/test-rdv-task-notifications.ts');
        console.log('   2. Create a test RDV or task in the app');
        console.log('   3. Check your phone for WhatsApp messages');
    } else {
        console.log('⚠️  Some issues were found. Please fix them before testing.');
        console.log();
        console.log('🔧 Common Fixes:');
        console.log('   1. Add ULTRA_INSTANCE_ID and ULTRA_TOKEN to .env file');
        console.log('   2. Update user phone numbers in database');
        console.log('   3. Ensure phone numbers start with + (international format)');
        console.log('   4. Verify UltraMSG instance is connected to WhatsApp');
    }

    console.log();

    await prisma.$disconnect();
}

// Run verification
verifySetup().catch(console.error);
