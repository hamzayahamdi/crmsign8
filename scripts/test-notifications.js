/**
 * Test Notifications Script
 * Creates sample notifications to test the notification system
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotifications() {
  console.log('🔔 Creating test notifications...\n');

  try {
    // Get first user to assign notifications to
    const users = await prisma.user.findMany({ take: 5 });
    
    if (users.length === 0) {
      console.error('❌ No users found. Please create users first.');
      return;
    }

    console.log(`Found ${users.length} users\n`);

    // Get a sample client if exists
    const client = await prisma.client.findFirst();
    const clientId = client?.id || 'sample-client-id';
    const clientName = client?.nom || 'Ahmed Test';

    const notifications = [];

    // Create different types of notifications for each user
    for (const user of users) {
      console.log(`Creating notifications for: ${user.name} (${user.email})`);

      // 1. High priority - RDV created
      notifications.push({
        userId: user.id,
        type: 'rdv_created',
        priority: 'high',
        title: 'Nouveau RDV assigné',
        message: `RDV avec ${clientName} le 12 nov à 08h00 à Rabat`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: false,
        metadata: {
          appointmentDate: '12 nov à 08h00',
          location: 'Rabat'
        }
      });

      // 2. High priority - Payment received
      notifications.push({
        userId: user.id,
        type: 'payment_received',
        priority: 'high',
        title: 'Paiement reçu',
        message: `Paiement de 50,000 DH reçu de ${clientName}`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: false,
        metadata: {
          amount: 50000
        }
      });

      // 3. Medium priority - Devis created
      notifications.push({
        userId: user.id,
        type: 'devis_created',
        priority: 'medium',
        title: 'Nouveau devis créé',
        message: `Devis de 120,000 DH pour ${clientName}`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: false,
        metadata: {
          devisAmount: 120000
        }
      });

      // 4. Medium priority - Stage changed
      notifications.push({
        userId: user.id,
        type: 'stage_changed',
        priority: 'medium',
        title: 'Changement d\'étape',
        message: `${clientName}: Qualifié → Acompte reçu`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: true, // This one is read
        metadata: {
          previousStage: 'Qualifié',
          newStage: 'Acompte reçu'
        }
      });

      // 5. High priority - Task assigned
      notifications.push({
        userId: user.id,
        type: 'task_assigned',
        priority: 'high',
        title: 'Nouvelle tâche assignée',
        message: 'Préparer devis - À faire avant le 15 nov 2024',
        linkedType: 'task',
        linkedId: 'task-sample-id',
        linkedName: clientName,
        isRead: false,
        metadata: {
          dueDate: '15 nov 2024'
        }
      });

      // 6. Low priority - Document uploaded
      notifications.push({
        userId: user.id,
        type: 'document_uploaded',
        priority: 'low',
        title: 'Document ajouté',
        message: `Plan d'architecture.pdf ajouté pour ${clientName}`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: true, // This one is read
        metadata: {
          documentName: 'Plan d\'architecture.pdf'
        }
      });

      // 7. High priority - RDV reminder (older)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      notifications.push({
        userId: user.id,
        type: 'rdv_reminder',
        priority: 'high',
        title: 'Rappel RDV',
        message: `RDV avec ${clientName} prévu pour aujourd'hui à 14h00`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: false,
        createdAt: yesterday,
        metadata: {
          appointmentDate: 'aujourd\'hui à 14h00'
        }
      });

      // 8. High priority - Client assigned (older)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      notifications.push({
        userId: user.id,
        type: 'client_assigned',
        priority: 'high',
        title: 'Nouveau client assigné',
        message: `Le client ${clientName} vous a été assigné`,
        linkedType: 'client',
        linkedId: clientId,
        linkedName: clientName,
        isRead: true, // This one is read
        createdAt: twoDaysAgo,
        metadata: {}
      });

      console.log(`  ✅ Created 8 notifications for ${user.name}\n`);
    }

    // Insert all notifications
    const result = await prisma.notification.createMany({
      data: notifications
    });

    console.log(`\n✅ Successfully created ${result.count} test notifications!`);
    console.log('\n📊 Summary:');
    console.log(`   - Total notifications: ${result.count}`);
    console.log(`   - Per user: ${notifications.length / users.length}`);
    console.log(`   - Unread: ~${Math.floor(result.count * 0.625)} (62.5%)`);
    console.log(`   - Read: ~${Math.floor(result.count * 0.375)} (37.5%)`);
    console.log('\n🎯 Now visit /notifications to see them!');

  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
