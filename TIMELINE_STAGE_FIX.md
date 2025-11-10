# Timeline & Stage Duration Fix

## Problem
When a client's project stage (statutProjet) was updated via the status stepper in the header, the timeline and roadmap components were not updating to show:
1. The new stage status
2. The duration each stage took
3. Updated stage history

## Root Cause
The issue had multiple components:

1. **Missing Event Listener**: The client details page had event listeners for devis, historique, appointments, payments, documents, and tasks updates, but NOT for stage updates.

2. **No Event Emission**: When the stage was updated in `ClientDetailsHeader`, it called `updateClientStage` but didn't emit a custom event to notify other components.

3. **Database Inconsistency**: The stage API route updated `client_stage_history` and `historique` tables but didn't update the `clients.statut_projet` field, causing inconsistency.

4. **Missing Duration Data**: The historique entries created during stage changes didn't include duration information.

## Solution Implemented

### 1. Added Stage Update Event Listener
**File**: `app/clients/[id]/page.tsx`

Added a new `useEffect` hook that listens for `stage-updated` events and refreshes the client data:

```typescript
// Listen for stage updates from real-time sync
useEffect(() => {
  const handleStageUpdate = async (event: CustomEvent) => {
    if (event.detail.clientId === clientId) {
      console.log('[Client Details] Stage updated, refreshing client data...')
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          credentials: 'include'
        })
        if (response.ok) {
          const result = await response.json()
          console.log('[Client Details] Refreshed after stage update:', {
            statutProjet: result.data.statutProjet,
            updatedAt: result.data.updatedAt
          })
          setClient(result.data)
        }
      } catch (error) {
        console.error('[Client Details] Error refreshing after stage update:', error)
      }
    }
  }

  window.addEventListener('stage-updated' as any, handleStageUpdate)
  return () => window.removeEventListener('stage-updated' as any, handleStageUpdate)
}, [clientId])
```

### 2. Emit Stage Update Event
**File**: `components/client-details/client-details-header.tsx`

Modified the status change handler to emit a custom event after successfully updating the stage:

```typescript
// Emit custom event to trigger refresh of timeline and roadmap
window.dispatchEvent(new CustomEvent('stage-updated', {
  detail: { clientId: client.id, newStatus, changedBy }
}))
console.log('[ClientDetailsHeader] Emitted stage-updated event:', { clientId: client.id, newStatus })
```

### 3. Update Clients Table
**File**: `app/api/clients/[id]/stage/route.ts`

Added code to update the `clients` table with the new stage, ensuring consistency:

```typescript
// 4. Update the clients table with the new stage (keep in sync)
await supabase
  .from('clients')
  .update({
    statut_projet: newStage,
    derniere_maj: now,
    updated_at: now
  })
  .eq('id', clientId)
```

### 4. Add Duration to Historique
**File**: `app/api/clients/[id]/stage/route.ts`

Calculate and store the duration of the previous stage in the historique entry:

```typescript
// Calculate duration if there was a previous stage
let durationInHours = null
if (currentHistory) {
  const startedAt = new Date(currentHistory.started_at)
  const endedAt = new Date(now)
  const durationMs = endedAt.getTime() - startedAt.getTime()
  durationInHours = durationMs / (1000 * 60 * 60) // Convert to hours
}

await supabase
  .from('historique')
  .insert({
    client_id: clientId,
    date: now,
    type: 'statut',
    description: `Statut changé vers: ${newStage}`,
    auteur: changedBy,
    previous_status: currentHistory?.stage_name || null,
    new_status: newStage,
    duration_in_hours: durationInHours, // ← Added duration
    timestamp_start: now,
    created_at: now,
    updated_at: now
  })
```

## Data Flow After Fix

1. User clicks on a stage in the status stepper (header)
2. `ClientDetailsHeader` calls `updateClientStage()`
3. API route `/api/clients/[id]/stage` (POST):
   - Closes previous stage in `client_stage_history` with duration
   - Creates new stage entry in `client_stage_history`
   - Updates `clients.statut_projet` field
   - Creates historique entry with duration info
4. `ClientDetailsHeader` emits `stage-updated` event
5. Client details page receives event and re-fetches client data
6. All components receive fresh data:
   - **Timeline** (`EnhancedTimeline`): Shows updated historique with duration
   - **Roadmap** (`ProjectRoadmapCard`): Shows updated stages with durations via `useStageHistory` hook
   - **Header**: Shows new status badge

## Benefits

✅ **Real-time Updates**: Timeline and roadmap update immediately when stage changes
✅ **Duration Tracking**: Each stage shows how long it lasted (hours, days, weeks, months)
✅ **Data Consistency**: `clients` table and `client_stage_history` table stay in sync
✅ **Timeline Visibility**: Users can see stage transitions with durations in the timeline
✅ **Roadmap Accuracy**: Roadmap shows accurate duration for each completed and active stage

## Testing Checklist

- [ ] Change client stage via status stepper
- [ ] Verify timeline updates immediately
- [ ] Verify roadmap shows updated stage with duration
- [ ] Check that duration is displayed correctly (format: "2h 30m", "3 days", "2 weeks", etc.)
- [ ] Verify historique entry shows previous and new status
- [ ] Check console logs for proper event emission and handling
- [ ] Test with multiple stage changes in sequence
- [ ] Verify database consistency (clients.statut_projet matches client_stage_history active stage)
- [ ] Test terminal statuses (refuse, annule, suspendu) display correctly
- [ ] Verify terminal statuses show with red styling and "TERMINAL" badge

## Files Modified

1. `app/clients/[id]/page.tsx` - Added stage-updated event listener
2. `components/client-details/client-details-header.tsx` - Emit stage-updated event
3. `app/api/clients/[id]/stage/route.ts` - Update clients table and add duration to historique

## Related Components

- `components/enhanced-timeline.tsx` - Displays timeline with historique entries
- `components/client-details/project-roadmap-card.tsx` - Displays roadmap with stage durations
- `hooks/use-stage-history.ts` - Fetches stage history with realtime updates
- `lib/stage-duration-utils.ts` - Utility functions for duration formatting
