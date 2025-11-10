# Stage Duration Display Fix

## Problem
Stages like "Acompte", "Conception", and "Devis" were not showing their durations even though they had valid duration data (24 seconds, 5 minutes, etc.). The stages appeared completed (green checkmarks) but without any duration information.

### Root Causes

**1. Hidden Short Durations**
The `formatDurationDetailed` function was returning `"Moins d'une minute"` (Less than a minute) for durations under 60 seconds, which was confusing and didn't show the actual time spent.

**2. Missing Stage History Entries**
Some completed stages didn't have entries in the `client_stage_history` table, so the `getStageDuration` function returned `null` and no duration was displayed.

**3. No Fallback to Client Historique**
When stage history was missing, the function didn't try to get duration data from the `client.historique` table, which contains `durationInHours` for status changes.

## Solutions Implemented

### 1. Show All Durations Including Seconds

**Before:**
```typescript
if (seconds >= 60) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}

return 'Moins d\'une minute' // ❌ Hides actual duration!
```

**After:**
```typescript
if (seconds >= 60) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds}s`
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}

// Show actual seconds for very short durations
if (seconds > 0) {
  return `${seconds} seconde${seconds > 1 ? 's' : ''}`
}

return 'Instant'
```

### 2. Enhanced Duration Formatting

Added more detailed formatting to show both primary and secondary units:

**Hours with Minutes:**
```typescript
if (seconds >= 3600) {
  const hours = Math.floor(seconds / 3600)
  const remainingMinutes = Math.floor((seconds % 3600) / 60)
  
  if (remainingMinutes > 0) {
    return `${hours} heure${hours > 1 ? 's' : ''} ${remainingMinutes}m`
  }
  return `${hours} heure${hours > 1 ? 's' : ''}`
}
```

**Minutes with Seconds:**
```typescript
if (seconds >= 60) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds}s`
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}
```

### 3. Fallback to Client Historique

Added logic to get duration from `client.historique` when stage history is missing:

```typescript
// For completed stages without stage history, try to get duration from client historique
if (status === 'completed') {
  const historyEntry = client.historique?.find(
    h => h.type === 'statut' && h.newStatus === stageId && h.durationInHours
  )
  if (historyEntry && historyEntry.durationInHours) {
    const durationSeconds = Math.floor(historyEntry.durationInHours * 3600)
    console.log('[getStageDuration] Found duration from historique for', stageId, ':', durationSeconds, 'seconds')
    return formatDurationDetailed(durationSeconds)
  }
}
```

### 4. Better Null Checks

Improved the check for `durationSeconds` to handle `0` correctly:

**Before:**
```typescript
if (stageEntry.durationSeconds) { // ❌ Fails for 0 seconds
  return formatDurationDetailed(stageEntry.durationSeconds)
}
```

**After:**
```typescript
if (stageEntry.durationSeconds !== null && stageEntry.durationSeconds !== undefined) {
  return formatDurationDetailed(stageEntry.durationSeconds)
}
```

## Duration Display Examples

### Very Short Durations (< 1 minute)
| Seconds | Before | After |
|---------|--------|-------|
| 5 | "Moins d'une minute" | "5 secondes" |
| 24 | "Moins d'une minute" | "24 secondes" |
| 45 | "Moins d'une minute" | "45 secondes" |

### Short Durations (1-60 minutes)
| Seconds | Before | After |
|---------|--------|-------|
| 60 | "1 minute" | "1 minute" |
| 90 | "1 minute" | "1 minute 30s" |
| 300 | "5 minutes" | "5 minutes" |
| 325 | "5 minutes" | "5 minutes 25s" |

### Medium Durations (1-24 hours)
| Seconds | Before | After |
|---------|--------|-------|
| 3600 | "1 heure" | "1 heure" |
| 3900 | "1 heure" | "1 heure 5m" |
| 7200 | "2 heures" | "2 heures" |
| 7800 | "2 heures" | "2 heures 10m" |

### Long Durations (> 24 hours)
| Seconds | Before | After |
|---------|--------|-------|
| 86400 | "1 jour" | "1 jour" |
| 90000 | "1 jour" | "1 jour 1h" |
| 172800 | "2 jours" | "2 jours" |
| 183600 | "2 jours" | "2 jours 3h" |

## Visual Impact

### Before Fix
```
FEUILLE DE ROUTE:
✅ Qualifié
   ⏱ 3 heures • 📅 du 04/11/2025 au 04/11/2025

💰 Acompte                                    ← No duration shown!

🧩 Conception                                 ← No duration shown!

📄 Devis (1 devis)                           ← No duration shown!

✅ Accepté
   ⏱ 2 jours 22h • 📅 du 04/11/2025 au 07/11/2025
```

### After Fix
```
FEUILLE DE ROUTE:
✅ Qualifié
   ⏱ 3 heures • 📅 du 04/11/2025 au 04/11/2025

💰 Acompte
   ⏱ 24 secondes • 📅 du 04/11/2025 au 04/11/2025

🧩 Conception
   ⏱ 5 minutes 12s • 📅 du 04/11/2025 au 04/11/2025

📄 Devis (1 devis)
   ⏱ 3 minutes 45s • 📅 du 04/11/2025 au 04/11/2025

✅ Accepté
   ⏱ 2 jours 22h • 📅 du 04/11/2025 au 07/11/2025
```

## Benefits

✅ **All durations visible** - Even very short durations (seconds) are now shown
✅ **More accurate** - Shows actual time instead of "Less than a minute"
✅ **Better precision** - Shows both primary and secondary units (e.g., "5 minutes 25s")
✅ **Fallback mechanism** - Gets duration from historique if stage history is missing
✅ **Better debugging** - Enhanced console logs show exactly what duration was found and from where
✅ **Handles edge cases** - Properly handles 0 seconds and null values

## Data Sources Priority

The `getStageDuration` function now tries multiple sources in order:

1. **Stage History (active)** - Live calculation for current stage
2. **Stage History (completed)** - Stored `durationSeconds` from `client_stage_history`
3. **Stage History (calculated)** - Calculate from `startedAt` and `endedAt`
4. **Client Historique** - Get `durationInHours` from status change entries
5. **Fallback** - Return "Récent" if no data found

## Files Modified

1. `lib/stage-duration-utils.ts`
   - Enhanced `formatDurationDetailed()` to show seconds
   - Added minutes + seconds formatting
   - Added hours + minutes formatting
   - Changed "Moins d'une minute" to show actual seconds

2. `components/client-details/project-roadmap-card.tsx`
   - Added fallback to `client.historique` for missing stage history
   - Improved null checks for `durationSeconds`
   - Enhanced console logging for debugging
   - Better handling of completed stages without stage history

## Testing Checklist

- [x] Durations under 60 seconds show actual seconds
- [x] Durations with minutes show remaining seconds (e.g., "5 minutes 25s")
- [x] Durations with hours show remaining minutes (e.g., "2 heures 30m")
- [x] Durations with days show remaining hours (e.g., "3 jours 5h")
- [x] Completed stages without stage history get duration from historique
- [x] Zero-second durations are handled correctly
- [x] Console logs show where duration data came from
- [x] All stages show duration information (no more missing durations)
