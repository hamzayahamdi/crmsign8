#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { verify, sign } = require('jsonwebtoken');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function simulateFullUIFlow() {
  console.log('🔍 SIMULATING COMPLETE UI TASK CREATION & CALENDAR DISPLAY FLOW\n');
  console.log('============================================================\n');

  try {
    // Step 1: Get users
    console.log('📍 Step 1: Getting test users...');
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    const architect = await prisma.user.findFirst({ where: { role: 'architect' } });
    if (!admin || !architect) {
      console.error('❌ Missing users');
      return;
    }
    console.log(`✅ Admin: ${admin.name} (${admin.id})`);
    console.log(`✅ Architect: ${architect.name} (${architect.id})`);

    // Step 2: Get client
    console.log('\n📍 Step 2: Getting test client...');
    const client = await prisma.client.findFirst();
    if (!client) {
      console.error('❌ No client found');
      return;
    }
    console.log(`✅ Client: ${client.nom} (${client.id})`);

    // Step 3: Create task (as the admin would do)
    console.log('\n📍 Step 3: Creating task via POST /api/tasks...');
    const dueDate = new Date(Date.now() + 86400000); // Tomorrow
    const taskTitle = `FLOW-TEST-${Date.now()}`;

    const taskPayload = {
      title: taskTitle,
      description: 'Test task from UI flow',
      dueDate: dueDate.toISOString(),
      assignedTo: architect.name, // ← IMPORTANT: Send name, not ID
      linkedType: 'client',
      linkedId: client.id,
      linkedName: client.nom,
      status: 'a_faire'
    };

    console.log('   Creating task with payload:', JSON.stringify(taskPayload, null, 2));

    // Simulate API call
    const adminToken = sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const taskResponse = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(taskPayload)
    }).catch(e => {
      console.log('   ⚠️  Could not make HTTP request (server not running), using direct DB instead');
      return null;
    });

    let task;
    if (taskResponse) {
      if (!taskResponse.ok) {
        console.error(`   ❌ API error: ${taskResponse.status}`);
        const error = await taskResponse.json();
        console.error('   ', error);
        return;
      }
      task = await taskResponse.json();
      console.log(`✅ Task created via API: ${task.id}`);
    } else {
      // Fallback: create directly
      console.log('   Using direct database creation...');
      task = await prisma.task.create({
        data: {
          ...taskPayload,
          dueDate: new Date(taskPayload.dueDate),
          createdBy: admin.name
        }
      });
      console.log(`✅ Task created directly: ${task.id}`);
    }

    // Step 4: Check if calendar event was created automatically
    console.log('\n📍 Step 4: Checking if calendar event was created...');
    const recentEvents = await prisma.calendarEvent.findMany({
      where: { title: taskTitle },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (recentEvents.length === 0) {
      console.error('❌ NO CALENDAR EVENT CREATED!');
      console.error('   This means createTaskWithEvent is not being called or is failing');
      return;
    }

    const event = recentEvents[0];
    console.log(`✅ Calendar event created: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Event Type: ${event.eventType}`);
    console.log(`   Assigned To: ${event.assignedTo}`);
    console.log(`   Created By: ${event.createdBy}`);
    console.log(`   Visibility: ${event.visibility}`);
    console.log(`   Participants: ${event.participants.length}`);

    // Step 5: Verify admin can fetch this event
    console.log('\n📍 Step 5: Fetching events as admin (like calendar page does)...');

    // Build the same query the calendar page would make
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    end.setDate(1);
    end.setDate(0);

    console.log(`   Date range: ${start.toISOString()} to ${end.toISOString()}`);

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: start,
          lte: end
        }
      }
    });

    console.log(`✅ Found ${calendarEvents.length} events in date range`);

    const foundEvent = calendarEvents.find(e => e.id === event.id);
    if (foundEvent) {
      console.log(`✅ Our event IS in the date range`);
    } else {
      console.error(`❌ Our event NOT in the date range!`);
      console.error(`   Event date: ${event.startDate}`);
      console.error(`   Range: ${start} to ${end}`);
    }

    // Step 6: Apply permission check (as store does)
    console.log('\n📍 Step 6: Checking permission (as Zustand store does)...');
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Event createdBy: ${event.createdBy}`);
    console.log(`   Event assignedTo: ${event.assignedTo}`);
    console.log(`   Event participants: [${event.participants.join(', ')}]`);
    console.log(`   Event visibility: ${event.visibility}`);

    const canSee = 
      event.visibility === 'all' ||
      event.createdBy === admin.id ||
      event.assignedTo === admin.id ||
      event.participants.includes(admin.id);

    console.log(`   Can admin see? ${canSee ? '✅ YES' : '❌ NO'}`);

    if (!canSee) {
      console.error('\n❌ PERMISSION CHECK FAILED!');
      console.error('   This is why the event won\'t show in the UI');
      console.error('\n   Debugging:');
      console.error(`   - createdBy match: ${event.createdBy === admin.id}`);
      console.error(`   - assignedTo match: ${event.assignedTo === admin.id}`);
      console.error(`   - in participants: ${event.participants.includes(admin.id)}`);
      console.error(`   - is team visibility: ${event.visibility === 'team'}`);
    }

    // Step 7: Check as architect
    console.log('\n📍 Step 7: Checking permission as architect...');
    const architectCanSee = 
      event.visibility === 'all' ||
      event.createdBy === architect.id ||
      event.assignedTo === architect.id ||
      event.participants.includes(architect.id);
    
    console.log(`   Can architect see? ${architectCanSee ? '✅ YES' : '❌ NO'}`);

    console.log('\n============================================================');
    console.log('📝 SUMMARY\n');
    console.log(`Task ID: ${task.id}`);
    console.log(`Event ID: ${event.id}`);
    console.log(`Admin can see event: ${canSee ? '✅' : '❌'}`);
    console.log(`Architect can see event: ${architectCanSee ? '✅' : '❌'}`);
    
    if (canSee && architectCanSee) {
      console.log('\n✅ EVERYTHING LOOKS GOOD!');
      console.log('If events still don\'t appear in UI:');
      console.log('1. Check browser Network tab to see API response');
      console.log('2. Check browser Console for JavaScript errors');
      console.log('3. Make sure you\'re viewing the correct date/month');
      console.log('4. Try refreshing the calendar page');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

simulateFullUIFlow();
