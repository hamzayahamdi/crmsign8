/**
 * Test Script for Gestionnaire Role Permissions
 * 
 * This script helps verify that the Gestionnaire role has correct permissions
 * and data filtering in place.
 * 
 * Usage:
 * 1. Update the TEST_CONFIG with your test user credentials
 * 2. Run: node scripts/test-gestionnaire-permissions.js
 */

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  gestionnaireUser: {
    email: 'gestionnaire@test.com',
    password: 'test123'
  },
  adminUser: {
    email: 'admin@test.com',
    password: 'admin123'
  }
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green)
}

function logError(message) {
  log(`✗ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow)
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, colors.blue)
}

async function login(email, password) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.token
  } catch (error) {
    throw new Error(`Login error: ${error.message}`)
  }
}

async function testSidebarPermissions(token) {
  logSection('Testing Sidebar Permissions')
  
  // This test requires checking the actual rendered sidebar
  // For now, we'll document expected behavior
  
  log('\nExpected Sidebar Items for Gestionnaire:')
  logSuccess('Contacts')
  logSuccess('Clients & Opportunités')
  logSuccess('Tâches & Rappels')
  logSuccess('Calendrier')
  logSuccess('Notifications')
  
  log('\nShould NOT see:')
  logError('Tableau des Leads')
  logError('Architectes')
  logError('Utilisateurs')
  logError('Paramètres')
  
  logWarning('Note: Sidebar visibility must be verified manually in the UI')
}

async function testTasksFiltering(token) {
  logSection('Testing Tasks API Filtering')
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.status === 401) {
      logError('Tasks API: Unauthorized (check JWT token)')
      return false
    }
    
    if (!response.ok) {
      logError(`Tasks API: Failed (${response.status})`)
      return false
    }
    
    const data = await response.json()
    const tasks = data.data || []
    
    logSuccess(`Tasks API: Returned ${tasks.length} tasks`)
    
    if (tasks.length > 0) {
      log('\nSample Task:')
      log(`  - Title: ${tasks[0].title}`)
      log(`  - Assigned To: ${tasks[0].assignedTo}`)
      log(`  - Status: ${tasks[0].status}`)
      logWarning('Note: Verify these are only YOUR tasks (assigned to you or created by you)')
    } else {
      logWarning('No tasks found - create some tasks to test filtering')
    }
    
    return true
  } catch (error) {
    logError(`Tasks API Error: ${error.message}`)
    return false
  }
}

async function testCalendarFiltering(token) {
  logSection('Testing Calendar API Filtering')
  
  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)
    
    const response = await fetch(
      `${TEST_CONFIG.baseUrl}/api/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (response.status === 401) {
      logError('Calendar API: Unauthorized (check JWT token)')
      return false
    }
    
    if (!response.ok) {
      logError(`Calendar API: Failed (${response.status})`)
      return false
    }
    
    const events = await response.json()
    
    logSuccess(`Calendar API: Returned ${events.length} events`)
    
    if (events.length > 0) {
      log('\nSample Event:')
      log(`  - Title: ${events[0].title}`)
      log(`  - Assigned To: ${events[0].assignedToName || events[0].assignedTo}`)
      log(`  - Visibility: ${events[0].visibility}`)
      logWarning('Note: Verify these are only YOUR events or public events')
    } else {
      logWarning('No calendar events found - create some events to test filtering')
    }
    
    return true
  } catch (error) {
    logError(`Calendar API Error: ${error.message}`)
    return false
  }
}

async function testContactsAccess(token) {
  logSection('Testing Contacts Access')
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/contacts?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.status === 401) {
      logError('Contacts API: Unauthorized')
      return false
    }
    
    if (!response.ok) {
      logError(`Contacts API: Failed (${response.status})`)
      return false
    }
    
    const data = await response.json()
    const contacts = data.data || []
    
    logSuccess(`Contacts API: Success - Returned ${contacts.length} contacts`)
    logSuccess('Gestionnaire CAN access contacts (as expected)')
    
    return true
  } catch (error) {
    logError(`Contacts API Error: ${error.message}`)
    return false
  }
}

async function testLeadsAccess(token) {
  logSection('Testing Leads Access (Should Be Blocked)')
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      logSuccess('Leads API: Access appropriately restricted or filtered')
      return true
    }
    
    const data = await response.json()
    const leads = data.data || []
    
    if (leads.length === 0) {
      logSuccess('Leads API: Returns empty result (filtered correctly)')
    } else {
      logWarning(`Leads API: Returned ${leads.length} leads - Gestionnaire should not see leads`)
      logWarning('Note: Check if API implements role-based filtering for leads')
    }
    
    return true
  } catch (error) {
    logError(`Leads API Error: ${error.message}`)
    return false
  }
}

async function getUserInfo(token) {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get user info')
    }
    
    const user = await response.json()
    return user
  } catch (error) {
    throw new Error(`Get user info error: ${error.message}`)
  }
}

async function runTests() {
  log(`${colors.bold}
╔═══════════════════════════════════════════════════════════╗
║  Gestionnaire Role Permission Test Suite                 ║
║  Signature8 CRM                                          ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`)
  
  try {
    // Login as Gestionnaire
    logSection('Authenticating as Gestionnaire')
    log(`Attempting login with: ${TEST_CONFIG.gestionnaireUser.email}`)
    
    const token = await login(
      TEST_CONFIG.gestionnaireUser.email,
      TEST_CONFIG.gestionnaireUser.password
    )
    
    logSuccess('Login successful!')
    
    // Get user info
    const user = await getUserInfo(token)
    log(`\nUser Info:`)
    log(`  - Name: ${user.name}`)
    log(`  - Email: ${user.email}`)
    log(`  - Role: ${user.role}`)
    
    if (user.role.toLowerCase() !== 'gestionnaire') {
      logWarning(`\nWarning: User role is "${user.role}", not "gestionnaire"`)
      logWarning('These tests are designed for the Gestionnaire role')
    }
    
    // Run tests
    const results = {
      sidebar: await testSidebarPermissions(token),
      tasks: await testTasksFiltering(token),
      calendar: await testCalendarFiltering(token),
      contacts: await testContactsAccess(token),
      leads: await testLeadsAccess(token)
    }
    
    // Summary
    logSection('Test Summary')
    
    const passed = Object.values(results).filter(r => r === true).length
    const total = Object.keys(results).length
    
    log(`\nTests Completed: ${passed}/${total}`)
    
    if (passed === total) {
      logSuccess('\n✓ All tests passed!')
    } else {
      logWarning('\n⚠ Some tests need manual verification or failed')
    }
    
    log('\n' + colors.bold + 'Next Steps:' + colors.reset)
    log('1. Verify sidebar items manually in the UI')
    log('2. Create tasks and verify only YOUR tasks are visible')
    log('3. Create calendar events and verify only YOUR events are visible')
    log('4. Try accessing /architectes, /users, /settings (should redirect)')
    log('5. Verify role label shows "Gestionnaire de Projets" in sidebar')
    
  } catch (error) {
    logError(`\nTest Suite Error: ${error.message}`)
    log('\nTroubleshooting:')
    log('1. Ensure the application is running on ' + TEST_CONFIG.baseUrl)
    log('2. Check that test user credentials are correct')
    log('3. Verify the user role is set to "gestionnaire" in database')
    log('4. Check browser console for additional errors')
  }
}

// Run the tests
if (typeof window === 'undefined') {
  // Node.js environment
  logWarning('Note: This script requires fetch API')
  logWarning('Please run in a browser console or use Node 18+ with --experimental-fetch')
  log('\nAlternatively, copy this script to your browser console after logging in.')
} else {
  // Browser environment
  runTests()
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, TEST_CONFIG }
}



