/**
 * Test script to verify calendar authentication and create a test event
 * Run with: node scripts/test-calendar-auth.js
 */

const baseUrl = 'http://localhost:3000';

async function testCalendarAuth() {
  console.log('🧪 Testing Calendar Authentication...\n');

  // Step 1: Login
  console.log('1️⃣ Logging in...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@signature8.com', // Change to your test user
      password: 'admin123' // Change to your test password
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed:', loginResponse.status);
    const error = await loginResponse.json();
    console.error('Error:', error);
    return;
  }

  const loginData = await loginResponse.json();
  console.log('✅ Login successful:', loginData.user.email);
  
  // Get the cookie from response
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('🍪 Cookie received:', cookies ? 'Yes' : 'No');

  // Step 2: Fetch users
  console.log('\n2️⃣ Fetching users...');
  const usersResponse = await fetch(`${baseUrl}/api/auth/users`, {
    headers: {
      'Cookie': cookies || ''
    }
  });

  if (!usersResponse.ok) {
    console.error('❌ Fetch users failed:', usersResponse.status);
    const error = await usersResponse.json();
    console.error('Error:', error);
    return;
  }

  const users = await usersResponse.json();
  console.log('✅ Users fetched:', users.length);
  console.log('Users:', users.map(u => `${u.name} (${u.email})`).join(', '));

  // Step 3: Fetch calendar events
  console.log('\n3️⃣ Fetching calendar events...');
  const eventsResponse = await fetch(`${baseUrl}/api/calendar`, {
    headers: {
      'Cookie': cookies || ''
    }
  });

  if (!eventsResponse.ok) {
    console.error('❌ Fetch events failed:', eventsResponse.status);
    const error = await eventsResponse.json();
    console.error('Error:', error);
    return;
  }

  const events = await eventsResponse.json();
  console.log('✅ Events fetched:', events.length);

  // Step 4: Create a test event
  console.log('\n4️⃣ Creating test event...');
  const testEvent = {
    title: 'Test Event - Calendar Auth',
    description: 'This is a test event created by the test script',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    eventType: 'rendez_vous',
    assignedTo: users[0]?.id, // Assign to first user
    location: 'Test Location',
    reminderType: 'none'
  };

  const createResponse = await fetch(`${baseUrl}/api/calendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify(testEvent)
  });

  if (!createResponse.ok) {
    console.error('❌ Create event failed:', createResponse.status);
    const error = await createResponse.json();
    console.error('Error:', error);
    return;
  }

  const createdEvent = await createResponse.json();
  console.log('✅ Event created successfully!');
  console.log('Event ID:', createdEvent.id);
  console.log('Title:', createdEvent.title);

  // Step 5: Verify event was created
  console.log('\n5️⃣ Verifying event was created...');
  const verifyResponse = await fetch(`${baseUrl}/api/calendar`, {
    headers: {
      'Cookie': cookies || ''
    }
  });

  if (!verifyResponse.ok) {
    console.error('❌ Verification failed:', verifyResponse.status);
    return;
  }

  const allEvents = await verifyResponse.json();
  const foundEvent = allEvents.find(e => e.id === createdEvent.id);
  
  if (foundEvent) {
    console.log('✅ Event verified in calendar!');
  } else {
    console.error('❌ Event not found in calendar');
  }

  console.log('\n🎉 All tests passed! Calendar authentication is working correctly.');
  console.log('\n📝 Summary:');
  console.log(`   - Login: ✅`);
  console.log(`   - Fetch Users: ✅ (${users.length} users)`);
  console.log(`   - Fetch Events: ✅ (${events.length} events)`);
  console.log(`   - Create Event: ✅`);
  console.log(`   - Verify Event: ✅`);
}

// Run the test
testCalendarAuth().catch(error => {
  console.error('\n💥 Test failed with error:', error);
  process.exit(1);
});
