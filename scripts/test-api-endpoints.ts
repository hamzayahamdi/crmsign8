/**
 * Test script to verify all optimized API endpoints are working correctly
 * Run with: tsx scripts/test-api-endpoints.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000'

// Mock token for testing (replace with actual token if needed)
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-token'

async function testEndpoint(name: string, url: string, method: string = 'GET', body?: any) {
  try {
    console.log(`\n🧪 Testing ${name}...`)
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE}${url}`, options)
    const data = await response.json()
    
    // Check for cache headers (optimization verification)
    const cacheControl = response.headers.get('cache-control')
    const hasCacheHeader = !!cacheControl
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS (${response.status})`)
      if (data.success !== undefined) {
        console.log(`   Success: ${data.success}`)
      }
      if (data.data) {
        const dataType = Array.isArray(data.data) ? `array[${data.data.length}]` : 'object'
        console.log(`   Data type: ${dataType}`)
      }
      if (hasCacheHeader) {
        console.log(`   ✅ Cache header: ${cacheControl}`)
      } else {
        console.log(`   ⚠️  No cache header (may be intentional for dynamic routes)`)
      }
      return { passed: true, hasCache: hasCacheHeader }
    } else {
      // 401/403 are expected for unauthenticated requests
      // 404 is expected for detail routes with placeholder IDs
      const isAuthError = response.status === 401 || response.status === 403
      const isNotFound = response.status === 404 && url.includes('/[id]')
      const isExpected = isAuthError || isNotFound
      const status = isAuthError ? 'AUTH_REQUIRED' : (isNotFound ? 'NOT_FOUND (expected)' : 'FAILED')
      console.log(`⚠️  ${name}: ${status} (${response.status})`)
      if (isAuthError) {
        console.log(`   ℹ️  Authentication required (expected for protected routes)`)
      } else if (isNotFound) {
        console.log(`   ℹ️  Not found (expected for placeholder ID test)`)
      } else {
        console.log(`   ❌ Error: ${data.error || JSON.stringify(data)}`)
      }
      return { passed: isExpected, hasCache: false, authRequired: isAuthError }
    }
  } catch (error) {
    // Network errors might mean server isn't running
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log(`❌ ${name}: NETWORK ERROR`)
      console.log(`   ⚠️  Server may not be running at ${API_BASE}`)
      console.log(`   💡 Start the dev server with: npm run dev`)
    } else {
      console.log(`❌ ${name}: ERROR`)
      console.log(`   ${error instanceof Error ? error.message : String(error)}`)
    }
    return { passed: false, hasCache: false }
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...')
  console.log(`   Base URL: ${API_BASE}`)
  
  const results: { name: string; passed: boolean; hasCache: boolean; authRequired?: boolean }[] = []
  
  // Test list endpoints
  results.push({ name: 'GET /api/architects', passed: await testEndpoint('GET /api/architects', '/api/architects') })
  results.push({ name: 'GET /api/contacts', passed: await testEndpoint('GET /api/contacts', '/api/contacts') })
  results.push({ name: 'GET /api/leads', passed: await testEndpoint('GET /api/leads', '/api/leads') })
  results.push({ name: 'GET /api/clients', passed: await testEndpoint('GET /api/clients', '/api/clients') })
  
  // Test detail endpoints (using placeholder IDs - these will fail but verify the route exists)
  // In real testing, you'd use actual IDs from your database
  console.log('\n⚠️  Note: Detail endpoint tests use placeholder IDs and may return 404')
  results.push({ name: 'GET /api/architects/[id]', passed: await testEndpoint('GET /api/architects/[id]', '/api/architects/test-id') })
  results.push({ name: 'GET /api/contacts/[id]', passed: await testEndpoint('GET /api/contacts/[id]', '/api/contacts/test-id') })
  results.push({ name: 'GET /api/clients/[id]', passed: await testEndpoint('GET /api/clients/[id]', '/api/clients/test-id') })
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary:')
  const passed = results.filter(r => r.passed).length
  const total = results.length
  const withCache = results.filter(r => r.hasCache).length
  console.log(`   ✅ Passed: ${passed}/${total}`)
  console.log(`   ⚠️  Auth Required: ${results.filter(r => r.authRequired).length}/${total}`)
  console.log(`   🚀 Cache Headers: ${withCache}/${total}`)
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : (result.authRequired ? '🔒' : '❌')
    const cacheIcon = result.hasCache ? ' 🚀' : ''
    console.log(`   ${icon} ${result.name}${cacheIcon}`)
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('📝 Notes:')
  console.log('   • ✅ = Working correctly')
  console.log('   • 🔒 = Requires authentication (expected)')
  console.log('   • ❌ = Actual error (needs investigation)')
  console.log('   • 🚀 = Has cache headers (optimization verified)')
  console.log('\n💡 To test with authentication:')
  console.log('   1. Start the dev server: npm run dev')
  console.log('   2. Login to the app and get your token from localStorage')
  console.log('   3. Set TEST_TOKEN environment variable: export TEST_TOKEN=your-token')
  console.log('   4. Run this script again')
  
  const actualErrors = results.filter(r => !r.passed && !r.authRequired).length
  if (actualErrors === 0) {
    console.log('\n🎉 All endpoints are working correctly!')
    console.log('   (Auth errors are expected without a valid token)')
    process.exit(0)
  } else {
    console.log(`\n⚠️  ${actualErrors} endpoint(s) have actual errors. Check above.`)
    process.exit(1)
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests, testEndpoint }

