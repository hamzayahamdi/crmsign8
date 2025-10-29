# 🧪 Quick Calendar Test Guide

## ⚡ Quick Fix (Do This First!)

### 1. Restart Server
```bash
# Press Ctrl+C in your terminal to stop the server
# Then run:
npm run dev
```

### 2. Clear Browser & Login
1. Open browser DevTools (F12)
2. Application → Storage → **Clear site data**
3. Go to `http://localhost:3000/login`
4. Login with your credentials

### 3. Test Calendar
1. Go to `/calendrier`
2. Open browser console (F12 → Console)
3. You should see:
   ```
   [Calendar] Loading events...
   [Calendar Auth] User authenticated: your-email@example.com
   [Calendar] Events loaded: X
   [Calendar] Loading users...
   [Calendar] Users loaded: X
   ```

### 4. Test Create Event
1. Click "Nouvel événement"
2. Check console - should see:
   ```
   [AddEventModal] Fetching users...
   [AddEventModal] Users fetched: X
   ```
3. Users dropdown should populate (not stuck)
4. Create a test event

---

## 🔍 What to Look For

### ✅ GOOD (Working):
```
[Calendar] Loading events...
[Calendar Auth] User authenticated: admin@signature8.com
[Calendar] Events loaded: 5
[Calendar] Loading users...
[Calendar] Users loaded: 3
```

### ❌ BAD (Not Working):
```
[Calendar Auth] No token found in cookies
Error: Non autorisé
```
**Fix**: Logout and login again

---

## 🧪 Run Automated Test

```bash
node scripts/test-calendar-auth.js
```

**Note**: Update the email/password in the script first:
```javascript
// In scripts/test-calendar-auth.js, line 12-13:
email: 'your-email@signature8.com',  // ← Change this
password: 'your-password'             // ← Change this
```

---

## 🐛 Still Not Working?

### Check These:
1. ✅ Server restarted?
2. ✅ Browser data cleared?
3. ✅ Logged in AFTER clearing data?
4. ✅ Console shows authentication logs?
5. ✅ Cookie exists? (DevTools → Application → Cookies → token)

### Share These Logs:
1. Browser console output
2. Server terminal output
3. Network tab (failed request details)

---

## 📝 Quick Checklist

Before testing:
- [ ] Server restarted (`npm run dev`)
- [ ] Browser data cleared (F12 → Application → Clear site data)
- [ ] Logged out
- [ ] Logged in again
- [ ] Browser console open (F12)

Test steps:
- [ ] Go to `/calendrier`
- [ ] Check console for authentication logs
- [ ] Events load without errors
- [ ] Click "Nouvel événement"
- [ ] Users dropdown populates
- [ ] Create a test event
- [ ] Refresh page (F5)
- [ ] Events still load

---

## 🎯 Expected Results

After following all steps:
- ✅ No "Non autorisé" errors
- ✅ No "Erreur lors du chargement des événements"
- ✅ Users dropdown populates instantly
- ✅ Can create events
- ✅ Events persist after refresh
- ✅ Console shows authentication logs

---

**If everything works**: You're done! 🎉

**If something fails**: Check the console logs and share them.
