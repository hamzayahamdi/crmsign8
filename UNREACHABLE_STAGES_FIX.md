# Unreachable Stages Enhancement

## Problem
When a project reaches a terminal status (like "Refusé", "Annulé", or "Suspendu"), the roadmap was still showing all subsequent stages as if they could be reached, which is confusing and incorrect.

### Example Issue
For a client with status "Refusé" (Refused):
```
✅ Accepté (completed - green)
❌ Refusé (terminal - red) ← Project ended here
✅ 1er Dépôt (showing green checkmark) ← WRONG! This stage was never reached
✅ En Cours (showing green checkmark) ← WRONG! This stage was never reached
✅ Chantier (showing green checkmark) ← WRONG! This stage was never reached
```

The stages after "Refusé" should be marked as unreachable since the project ended at the terminal status.

## Solution Implemented

### 1. New Status Type: "unreachable"
Added a new status type to indicate stages that will never be reached due to terminal status:

```typescript
const getStageStatus = (stage: RoadmapStage): 
  'completed' | 'in_progress' | 'pending' | 'terminal' | 'unreachable' => {
  // ... logic
}
```

### 2. Enhanced Logic to Detect Unreachable Stages

```typescript
// If the project is in a terminal state, all stages after the last completed stage are unreachable
if (isTerminalStatus) {
  // Find the last completed stage before the terminal status
  const terminalStageIndex = ROADMAP_STAGES.findIndex(s => s.id === client.statutProjet)
  const currentStageIndex = ROADMAP_STAGES.findIndex(s => s.id === stage.id)
  
  // If this stage comes after the terminal stage in the normal flow, it's unreachable
  if (currentStageIndex > terminalStageIndex && stage.order < 97) {
    return 'unreachable'
  }
  
  // Stages before the terminal stage that were completed
  if (stage.order < currentStageOrder && stage.order < 97) {
    return 'completed'
  }
  
  return 'pending'
}
```

### 3. Visual Styling for Unreachable Stages

Unreachable stages have a distinct disabled appearance:

**Container:**
- Background: `bg-gray-500/5` (very faint gray)
- Border: `border-gray-500/10` (subtle gray border)
- Opacity: `opacity-40` (dimmed overall)

**Icon:**
- Background: `bg-gray-500/10`
- Opacity: `opacity-30` (very faded)

**Label:**
- Color: `text-gray-400/40` (very dim gray)
- Decoration: `line-through` (strikethrough text)

**Badge:**
- Text: "Non atteint" (Not reached)
- Style: `bg-gray-500/10 text-gray-400/40`

## Visual Comparison

### Before Fix
```
FEUILLE DE ROUTE:
✅ Qualifié (completed)
✅ Acompte (completed)
✅ Conception (completed)
✅ Devis (completed)
✅ Accepté (completed)
❌ Refusé (terminal) ← Project ended
✅ 1er Dépôt (completed) ← WRONG!
✅ En Cours (completed) ← WRONG!
✅ Chantier (completed) ← WRONG!
```

### After Fix
```
FEUILLE DE ROUTE:
✅ Qualifié (completed - green)
✅ Acompte (completed - green)
✅ Conception (completed - green)
✅ Devis (completed - green)
✅ Accepté (completed - green)
❌ Refusé (terminal - red) ← Project ended
💵 1er Dépôt (unreachable - gray, strikethrough, "Non atteint")
⚙️ En Cours (unreachable - gray, strikethrough, "Non atteint")
🔨 Chantier (unreachable - gray, strikethrough, "Non atteint")
```

## Status Types Summary

| Status Type | Visual Style | Badge | Use Case |
|------------|--------------|-------|----------|
| **completed** | Green background, green text | ✓ | Stages that were completed |
| **in_progress** | Blue background, pulsing | "En cours" (blue) | Current active stage |
| **terminal** | Red background, red text | "Terminé" (red) | Terminal status (refuse, annule, suspendu) |
| **unreachable** | Gray, dimmed, strikethrough | "Non atteint" (gray) | Stages that won't be reached due to terminal status |
| **pending** | White/dim background | - | Future stages (normal flow) |

## Logic Flow

### For Normal Progression (Not Terminal)
1. Stages before current → `completed` (green)
2. Current stage → `in_progress` (blue, pulsing)
3. Stages after current → `pending` (dim)

### For Terminal Status (refuse, annule, suspendu)
1. Stages before terminal → `completed` (green)
2. Terminal stage → `terminal` (red)
3. Stages after terminal in normal flow → `unreachable` (gray, strikethrough)
4. Other terminal stages → `pending` (hidden unless active)

## Example Scenarios

### Scenario 1: Client Refused After Devis
```
Client Status: "refuse"
Progression: Qualifié → Acompte → Conception → Devis → Accepté → Refusé

Roadmap Display:
✅ Qualifié (completed)
✅ Acompte (completed)
✅ Conception (completed)
✅ Devis (completed)
✅ Accepté (completed)
❌ Refusé (terminal) ← Ended here
~~💵 1er Dépôt~~ (unreachable)
~~⚙️ En Cours~~ (unreachable)
~~🔨 Chantier~~ (unreachable)
~~🧾 Facturé~~ (unreachable)
~~🚚 Livré~~ (unreachable)
```

### Scenario 2: Client Cancelled During Construction
```
Client Status: "annule"
Progression: Qualifié → ... → Chantier → Annulé

Roadmap Display:
✅ Qualifié (completed)
✅ Acompte (completed)
✅ Conception (completed)
✅ Devis (completed)
✅ Accepté (completed)
✅ 1er Dépôt (completed)
✅ En Cours (completed)
✅ Chantier (completed)
🚫 Annulé (terminal) ← Ended here
~~🧾 Facturé~~ (unreachable)
~~🚚 Livré~~ (unreachable)
```

### Scenario 3: Normal Active Project
```
Client Status: "projet_en_cours"
Progression: Qualifié → ... → En Cours (active)

Roadmap Display:
✅ Qualifié (completed)
✅ Acompte (completed)
✅ Conception (completed)
✅ Devis (completed)
✅ Accepté (completed)
✅ 1er Dépôt (completed)
⚙️ En Cours (in_progress, pulsing) ← Currently here
🔨 Chantier (pending)
🧾 Facturé (pending)
🚚 Livré (pending)
```

## Benefits

✅ **Clear Visual Feedback**: Users immediately see which stages were never reached
✅ **Accurate Project History**: Distinguishes between completed stages and unreachable ones
✅ **Better Understanding**: Shows exactly where the project ended
✅ **Prevents Confusion**: No more wondering why completed stages appear after a terminal status
✅ **Professional Appearance**: Proper handling of project termination

## Files Modified

1. `components/client-details/project-roadmap-card.tsx`
   - Added `unreachable` status type
   - Enhanced `getStageStatus()` logic to detect unreachable stages
   - Added visual styling for unreachable stages
   - Added "Non atteint" badge

## Testing Checklist

- [x] Client with "refuse" status shows unreachable stages after terminal
- [x] Client with "annule" status shows unreachable stages after terminal
- [x] Client with "suspendu" status shows unreachable stages after terminal
- [x] Unreachable stages have gray styling with strikethrough
- [x] Unreachable stages show "Non atteint" badge
- [x] Completed stages before terminal status remain green
- [x] Normal active projects don't show unreachable stages
- [x] Terminal status itself shows red styling with "Terminé" badge

## CSS Classes Used

### Unreachable Stage Styling
```typescript
// Container
"bg-gray-500/5 border border-gray-500/10 opacity-40"

// Icon
"bg-gray-500/10 opacity-30"

// Label
"text-gray-400/40 line-through"

// Duration background
"bg-gray-500/10"

// Duration text/icon
"text-gray-400/30"

// Badge
"bg-gray-500/10 text-gray-400/40"
```

## Related Documentation

- See `ROADMAP_TERMINAL_STATUS_FIX.md` for terminal status implementation
- See `TIMELINE_STAGE_FIX.md` for stage update event system
