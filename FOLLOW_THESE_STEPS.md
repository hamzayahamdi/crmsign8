# ⚡ FOLLOW THESE EXACT STEPS

## 🔴 IMPORTANT: The cookie test was misleading!

**httpOnly cookies CANNOT be seen by `document.cookie`** - this is by design for security!

The test page has been updated to properly test if cookies work.

---

## ✅ DO THIS NOW:

### **Step 1: Restart Server**
```bash
# Stop server (Ctrl+C)
npm run dev
```

### **Step 2: Check Server Logs**
When you login, you should see in the terminal:
```
[Login] Setting cookie with options: { httpOnly: true, ... }
```

### **Step 3: Test Again**
1. Go to: `http://localhost:3000/test-auth`
2. Click **"Run All Tests"**
3. Look for this NEW message:
   ```
   ✅ Cookie was set successfully! (API call succeeded)
   ```

---

## 🔍 What the Test Does Now:

### OLD (Wrong):
- Checked `document.cookie` for token
- ❌ This NEVER works with httpOnly cookies!

### NEW (Correct):
- Logs in
- Calls `/api/auth/users` to test if cookie works
- ✅ If API succeeds = cookie is working!

---

## 📊 Expected Test Results:

```
🧪 Running all tests...

🍪 Checking cookies...
Visible cookies: NONE
ℹ️  Note: httpOnly cookies are hidden from JavaScript
ℹ️  We will test if the cookie works by calling an API

🔐 Testing login with credentials: include...
✅ Login successful!
User: admin@signature8.com
🔍 Testing if cookie was set by calling users API...
✅ Cookie was set successfully! (API call succeeded)

👥 Testing /api/auth/users...
✅ Users loaded: 4 users

📅 Testing /api/calendar...
✅ Events loaded: X events

✅ All tests complete!
```

---

## ❓ What If It Still Fails?

### If you see:
```
❌ Cookie was NOT set! API returned: Token manquant
```

**Then the cookie really isn't working. Share:**
1. Screenshot of test results
2. Server terminal output (look for `[Login] Setting cookie...`)
3. Browser console errors

---

## 🎯 After Tests Pass:

1. Go to `/calendrier`
2. Should load events without errors
3. Click "Nouvel événement"
4. Users should load
5. Create an event - should work!

---

**Run the test now and share the results!** 🚀
