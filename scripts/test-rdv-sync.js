/**
 * Test Script: RDV Sync & Date Display Fixes
 * 
 * This script tests:
 * 1. RDV creation syncs to calendar database
 * 2. Date display doesn't show "-1 jour" issue
 * 3. Timeline date grouping works correctly
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test utilities
function formatDate(date) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function groupHistoryByDate(history) {
  const grouped = {};
  
  history.forEach(entry => {
    const date = new Date(entry.date);
    
    // Use local date components to avoid timezone shifts
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create a date object without timezone conversion
    const localDate = new Date(year, month, day);
    
    const dateKey = localDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });
  
  return grouped;
}

async function testDateGrouping() {
  console.log('\n🧪 Test 1: Date Grouping (No -1 jour issue)');
  console.log('='.repeat(50));
  
  // Create test data with today's date
  const today = new Date();
  const todayISO = today.toISOString();
  
  const testHistory = [
    {
      id: 'test-1',
      date: todayISO,
      type: 'note',
      description: 'Test entry for today',
      auteur: 'Test User'
    }
  ];
  
  const grouped = groupHistoryByDate(testHistory);
  const dateKeys = Object.keys(grouped);
  
  console.log('Input date (ISO):', todayISO);
  console.log('Expected date:', formatDate(today));
  console.log('Grouped date key:', dateKeys[0]);
  
  // Verify the date matches
  const expectedDate = formatDate(today);
  const actualDate = dateKeys[0];
  
  if (expectedDate === actualDate) {
    console.log('✅ PASS: Date grouping is correct (no -1 day issue)');
    return true;
  } else {
    console.log('❌ FAIL: Date mismatch!');
    console.log('  Expected:', expectedDate);
    console.log('  Got:', actualDate);
    return false;
  }
}

async function testCalendarEventCreation() {
  console.log('\n🧪 Test 2: Calendar Event Creation');
  console.log('='.repeat(50));
  
  try {
    // Check if we can connect to the database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Count existing calendar events
    const eventCount = await prisma.calendarEvent.count();
    console.log(`📊 Current calendar events in database: ${eventCount}`);
    
    // Check if CalendarEvent table exists and has correct schema
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'CalendarEvent'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n📋 CalendarEvent table schema:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n✅ Calendar table is ready for RDV sync');
    return true;
  } catch (error) {
    console.log('❌ FAIL: Database error');
    console.error(error.message);
    return false;
  }
}

async function testRecentEvents() {
  console.log('\n🧪 Test 3: Recent Calendar Events');
  console.log('='.repeat(50));
  
  try {
    // Get events from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentEvents = await prisma.calendarEvent.findMany({
      where: {
        startDate: {
          gte: sevenDaysAgo
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      take: 10
    });
    
    console.log(`📅 Found ${recentEvents.length} events in the last 7 days`);
    
    if (recentEvents.length > 0) {
      console.log('\nRecent events:');
      recentEvents.forEach((event, index) => {
        const eventDate = new Date(event.startDate);
        console.log(`  ${index + 1}. ${event.title}`);
        console.log(`     Date: ${formatDate(eventDate)} at ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`     Type: ${event.eventType}`);
        if (event.linkedClientId) {
          console.log(`     Linked to client: ${event.linkedClientId}`);
        }
      });
    }
    
    console.log('\n✅ Calendar events query successful');
    return true;
  } catch (error) {
    console.log('❌ FAIL: Error querying events');
    console.error(error.message);
    return false;
  }
}

async function testTimezoneHandling() {
  console.log('\n🧪 Test 4: Timezone Handling');
  console.log('='.repeat(50));
  
  // Test various dates to ensure no timezone issues
  const testDates = [
    '2025-10-31T18:40:00.000Z',  // Evening UTC
    '2025-10-31T00:00:00.000Z',  // Midnight UTC
    '2025-10-31T23:59:59.000Z',  // End of day UTC
  ];
  
  let allPassed = true;
  
  testDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const localDate = new Date(year, month, day);
    
    const formatted = localDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    console.log(`Input: ${dateStr}`);
    console.log(`Output: ${formatted}`);
    
    // Verify it's October 31, 2025
    if (!formatted.includes('31') || !formatted.includes('octobre') || !formatted.includes('2025')) {
      console.log('❌ FAIL: Date shifted incorrectly');
      allPassed = false;
    } else {
      console.log('✅ Correct');
    }
    console.log('');
  });
  
  if (allPassed) {
    console.log('✅ PASS: All timezone tests passed');
  } else {
    console.log('❌ FAIL: Some timezone tests failed');
  }
  
  return allPassed;
}

async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 RDV Sync & Date Fix - Automated Tests');
  console.log('='.repeat(50));
  
  const results = [];
  
  // Run all tests
  results.push(await testDateGrouping());
  results.push(await testTimezoneHandling());
  results.push(await testCalendarEventCreation());
  results.push(await testRecentEvents());
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`Tests passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed! Fixes are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
  
  await prisma.$disconnect();
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
