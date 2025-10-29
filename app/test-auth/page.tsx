'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TestAuthPage() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testCookies = () => {
    addResult('🍪 Checking cookies...');
    const cookies = document.cookie;
    addResult(`Visible cookies: ${cookies || 'NONE'}`);
    addResult('ℹ️  Note: httpOnly cookies are hidden from JavaScript');
    addResult('ℹ️  We will test if the cookie works by calling an API');
  };

  const testLoginWithCookies = async () => {
    addResult('🔐 Testing login with credentials: include...');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL
        body: JSON.stringify({
          email: 'admin@signature8.com',
          password: 'admin123'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        addResult('✅ Login successful!');
        addResult(`User: ${data.user.email}`);
        
        // Test if cookie works by calling an API that requires auth
        addResult('🔍 Testing if cookie was set by calling users API...');
        setTimeout(async () => {
          try {
            const testResponse = await fetch('/api/auth/users', {
              credentials: 'include'
            });
            
            if (testResponse.ok) {
              addResult('✅ Cookie was set successfully! (API call succeeded)');
              toast.success('Login successful with cookie!');
            } else {
              const error = await testResponse.json();
              addResult(`❌ Cookie was NOT set! API returned: ${error.error}`);
              toast.error('Cookie not working');
            }
          } catch (err) {
            addResult(`❌ Error testing cookie: ${err}`);
          }
        }, 500);
      } else {
        addResult(`❌ Login failed: ${data.error}`);
        toast.error(data.error);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
      toast.error('Login error');
    }
  };

  const testUsersAPI = async () => {
    addResult('👥 Testing /api/auth/users...');
    
    try {
      const response = await fetch('/api/auth/users', {
        credentials: 'include'
      });

      if (response.ok) {
        const users = await response.json();
        addResult(`✅ Users loaded: ${users.length} users`);
        users.forEach((u: any) => addResult(`   - ${u.name} (${u.email})`));
        toast.success(`Loaded ${users.length} users`);
      } else {
        const error = await response.json();
        addResult(`❌ Users API failed: ${error.error}`);
        toast.error(error.error);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    }
  };

  const testCalendarAPI = async () => {
    addResult('📅 Testing /api/calendar...');
    
    try {
      const response = await fetch('/api/calendar', {
        credentials: 'include'
      });

      if (response.ok) {
        const events = await response.json();
        addResult(`✅ Events loaded: ${events.length} events`);
        toast.success(`Loaded ${events.length} events`);
      } else {
        const error = await response.json();
        addResult(`❌ Calendar API failed: ${error.error}`);
        toast.error(error.error);
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🧪 Running all tests...\n');
    
    testCookies();
    await new Promise(r => setTimeout(r, 500));
    
    await testLoginWithCookies();
    await new Promise(r => setTimeout(r, 1000));
    
    testCookies();
    await new Promise(r => setTimeout(r, 500));
    
    await testUsersAPI();
    await new Promise(r => setTimeout(r, 500));
    
    await testCalendarAPI();
    
    addResult('\n✅ All tests complete!');
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Authentication Test Page</CardTitle>
            <CardDescription>
              Test cookie-based authentication for calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={testCookies} variant="outline">
                🍪 Check Cookies
              </Button>
              <Button onClick={testLoginWithCookies} variant="outline">
                🔐 Test Login
              </Button>
              <Button onClick={testUsersAPI} variant="outline">
                👥 Test Users API
              </Button>
              <Button onClick={testCalendarAPI} variant="outline">
                📅 Test Calendar API
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={runAllTests} className="flex-1">
                ▶️ Run All Tests
              </Button>
              <Button onClick={clearResults} variant="destructive">
                🗑️ Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-gray-500">No tests run yet. Click a button above to start.</div>
              ) : (
                results.map((result, i) => (
                  <div key={i} className="mb-1">{result}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📖 Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>1. Check Cookies:</strong> See if token cookie exists</p>
            <p><strong>2. Test Login:</strong> Login and verify cookie is set</p>
            <p><strong>3. Test Users API:</strong> Verify authentication works</p>
            <p><strong>4. Test Calendar API:</strong> Verify calendar authentication works</p>
            <p className="pt-4 text-muted-foreground">
              <strong>Note:</strong> Update the email/password in the code if needed (line 35-36)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
