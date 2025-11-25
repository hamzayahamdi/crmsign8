/**
 * Test Full Notification Flow with SMS
 * 
 * This script tests the complete notification flow:
 * - Create in-app notification
 * - Send SMS notification
 * 
 * Usage:
 *   npm run test:notification-sms <userId> <phoneNumber>
 *   npm run test:notification-sms cm123... +212612345678
 */

// Load environment variables
import { config } from 'dotenv';
config();
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { sendNotification } from '../lib/notification-service';
import { isMoceanConfigured } from '../lib/mocean-service';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  const phoneNumber = process.argv[3];

  if (!userId) {
    console.error('❌ Please provide a user ID');
    console.log('Usage: npm run test:notification-sms <userId> <phoneNumber>');
    console.log('');
    
    // List available users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true },
      take: 10,
    });

    console.log('Available users:');
    users.forEach(user => {
      console.log(`  ${user.id} - ${user.name} (${user.email}) - Phone: ${user.phone || 'N/A'}`);
    });
    
    process.exit(1);
  }

  console.log('🧪 Testing Notification with SMS...\n');

  // Check MoceanAPI configuration
  const moceanConfigured = isMoceanConfigured();
  console.log(`MoceanAPI Status: ${moceanConfigured ? '✅ Configured' : '⚠️  Not configured (SMS disabled)'}\n`);

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${userId}`);
    process.exit(1);
  }

  console.log('Target User:');
  console.log(`  Name: ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Phone: ${user.phone || 'N/A'}`);
  console.log('');

  // Update phone number if provided
  if (phoneNumber && phoneNumber !== user.phone) {
    console.log(`📝 Updating user phone number to: ${phoneNumber}`);
    await prisma.user.update({
      where: { id: userId },
      data: { phone: phoneNumber },
    });
    console.log('✅ Phone number updated\n');
  }

  // Send test notification
  console.log('📤 Sending notification...');
  
  const result = await sendNotification({
    userId: user.id,
    type: 'client_assigned',
    priority: 'high',
    title: 'Test: Nouveau Contact Assigné',
    message: 'Ceci est un test. Le contact "Client Test" vous a été assigné. Téléphone: +212612345678',
    linkedType: 'contact',
    linkedId: 'test-contact-id',
    linkedName: 'Client Test',
    metadata: {
      contactPhone: '+212612345678',
      contactVille: 'Casablanca',
      assignmentType: 'test',
    },
    sendSMS: true, // Enable SMS
  });

  if (result.success) {
    console.log('✅ Notification created successfully!');
    console.log(`   Notification ID: ${result.notification.id}`);
    console.log('');
    
    if (moceanConfigured && user.phone) {
      console.log('📱 SMS should have been sent to:', user.phone);
      console.log('   Check the console logs above for SMS delivery status');
    } else if (!moceanConfigured) {
      console.log('⚠️  SMS not sent (MoceanAPI not configured)');
      console.log('   Add MOCEAN_API_KEY and MOCEAN_API_SECRET to .env to enable SMS');
    } else if (!user.phone) {
      console.log('⚠️  SMS not sent (user has no phone number)');
    }
  } else {
    console.error('❌ Failed to create notification');
    console.error('Error:', result.error);
  }

  // Show recent notifications for this user
  console.log('\n📋 Recent notifications for this user:');
  const recentNotifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      priority: true,
      isRead: true,
      createdAt: true,
    },
  });

  recentNotifications.forEach(notif => {
    console.log(`  [${notif.priority}] ${notif.title}`);
    console.log(`    ${notif.message}`);
    console.log(`    Created: ${notif.createdAt.toISOString()}`);
    console.log(`    Status: ${notif.isRead ? 'Read' : 'Unread'}`);
    console.log('');
  });
}

main()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

