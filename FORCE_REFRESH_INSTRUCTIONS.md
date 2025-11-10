# Force Refresh Instructions - Duration Display Fix

## The Problem
The code has been updated but the browser is showing cached JavaScript. You need to force a refresh to see the changes.

## Solution - Follow These Steps:

### Step 1: Hard Refresh the Browser
Try one of these methods (in order):

**Method 1: Hard Refresh (Recommended)**
- Windows/Linux: Press `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: Press `Cmd + Shift + R`

**Method 2: Clear Cache and Reload**
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Method 3: Incognito/Private Window**
- Open the site in a new incognito/private window
- This bypasses all cache

### Step 2: Verify Dev Server is Running
Make sure your Next.js dev server is running:
```bash
npm run dev
```

If it's not running, start it and wait for:
```
✓ Ready in X.Xs
○ Local: http://localhost:3000
```

### Step 3: Check Console Logs
After refreshing, open browser console (F12) and look for these logs:
```
[getStageDuration] Checking stage: acompte_recu
[getStageDuration] Found entry for acompte_recu: YES
[getStageDuration] Completed stage acompte_recu duration: 24 secondes (24 seconds)
```

### Step 4: Verify the Changes
You should now see durations for all stages:

**Before (What you're seeing now):**
```
💰 Acompte          ← No duration
🧩 Conception       ← No duration
📄 Devis            ← No duration
```

**After (What you should see):**
```
💰 Acompte
   ⏱ 24 secondes • 📅 du 04/11/2025 au 04/11/2025

🧩 Conception
   ⏱ 5 minutes 12s • 📅 du 04/11/2025 au 04/11/2025

📄 Devis
   ⏱ 3 minutes 45s • 📅 du 04/11/2025 au 04/11/2025
```

## If Still Not Working

### Option 1: Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Option 2: Clear Next.js Cache
```bash
# Stop the dev server first
rm -rf .next
npm run dev
```

### Option 3: Check for Errors
1. Open browser console (F12)
2. Look for any red errors
3. Check the terminal where dev server is running for errors

## Files That Were Changed

1. ✅ `lib/stage-duration-utils.ts` - Enhanced duration formatting
2. ✅ `components/client-details/project-roadmap-card.tsx` - Added fallback logic

## What Changed

### Duration Formatting
- Now shows seconds: `"24 secondes"` instead of `"Moins d'une minute"`
- Shows minutes + seconds: `"5 minutes 12s"`
- Shows hours + minutes: `"2 heures 30m"`
- Shows days + hours: `"3 jours 5h"`

### Fallback Logic
- If stage history is missing, gets duration from `client.historique`
- Converts `durationInHours` to seconds
- Displays the duration properly

## Troubleshooting

### Issue: Still seeing old UI
**Solution:** Try all three hard refresh methods above

### Issue: Console shows errors
**Solution:** Share the error message so I can fix it

### Issue: Dev server not responding
**Solution:** Restart the dev server

### Issue: Changes work in incognito but not normal browser
**Solution:** Clear your browser cache completely:
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Firefox: Settings → Privacy → Clear Data → Cached Web Content
- Edge: Settings → Privacy → Clear browsing data → Cached images and files

## Quick Test
After refreshing, check if you see these console logs:
```
[getStageDuration] Checking stage: acompte_recu
[getStageDuration] Found entry for acompte_recu: YES
```

If you see these logs, the new code is running! ✅
