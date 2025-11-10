# Roadmap Terminal Status Fix

## Problem
When a client had a terminal status like "refuse" (Refusé), "annule" (Annulé), or "suspendu" (Suspendu), the Timeline/Roadmap component was showing "Qualifié" as the active stage instead of the actual terminal status.

### Root Cause
The `ROADMAP_STAGES` array in `project-roadmap-card.tsx` only included the normal progression stages:
- Qualifié → Acompte → Conception → Devis → Accepté → 1er Dépôt → En Cours → Chantier → Facturé → Livré

It was **missing terminal statuses**:
- ❌ Refusé
- 🚫 Annulé  
- ⏸️ Suspendu

When the component tried to find the current stage for a client with status "refuse", it couldn't find it in the array, so it defaulted to order 1 (Qualifié).

## Solution Implemented

### 1. Added Terminal Statuses to ROADMAP_STAGES
```typescript
const ROADMAP_STAGES: RoadmapStage[] = [
  { id: "qualifie", label: "Qualifié", icon: "✓", order: 1 },
  { id: "acompte_recu", label: "Acompte", icon: "💰", order: 2 },
  { id: "conception", label: "Conception", icon: "🧩", order: 3 },
  { id: "devis_negociation", label: "Devis", icon: "📄", order: 4 },
  { id: "accepte", label: "Accepté", icon: "✅", order: 5 },
  { id: "refuse", label: "Refusé", icon: "❌", order: 99 }, // Terminal state
  { id: "premier_depot", label: "1er Dépôt", icon: "💵", order: 6 },
  { id: "projet_en_cours", label: "En Cours", icon: "⚙️", order: 7 },
  { id: "chantier", label: "Chantier", icon: "🔨", order: 8 },
  { id: "facture_reglee", label: "Facturé", icon: "🧾", order: 9 },
  { id: "livraison_termine", label: "Livré", icon: "🚚", order: 10 },
  { id: "annule", label: "Annulé", icon: "🚫", order: 98 }, // Terminal state
  { id: "suspendu", label: "Suspendu", icon: "⏸️", order: 97 }, // Terminal state
]
```

**Note**: Terminal statuses have high order numbers (97-99) to distinguish them from normal progression.

### 2. Enhanced Stage Status Detection
```typescript
// Get current stage order
const currentStage = ROADMAP_STAGES.find(s => s.id === client.statutProjet)
const currentStageOrder = currentStage?.order || 1

// Check if current status is a terminal state
const isTerminalStatus = ['refuse', 'annule', 'suspendu', 'livraison_termine'].includes(client.statutProjet)

console.log('[ProjectRoadmap] Current status:', {
  statutProjet: client.statutProjet,
  foundStage: currentStage ? 'YES' : 'NO',
  order: currentStageOrder,
  isTerminal: isTerminalStatus
})
```

### 3. Updated getStageStatus Logic
```typescript
const getStageStatus = (stage: RoadmapStage): 'completed' | 'in_progress' | 'pending' | 'terminal' => {
  // If this is the current stage
  if (stage.id === client.statutProjet) {
    // Terminal statuses are marked as terminal, not in_progress
    if (isTerminalStatus) return 'terminal'
    return 'in_progress'
  }
  
  // For terminal statuses (refuse, annule, suspendu), only show them if they're current
  if (stage.order >= 97) {
    return 'pending' // Hide terminal stages unless they're active
  }
  
  // Normal progression logic
  if (stage.order < currentStageOrder) return 'completed'
  return 'pending'
}
```

### 4. Hide Terminal Stages Unless Active
```typescript
{ROADMAP_STAGES.map((stage, index) => {
  const status = getStageStatus(stage)
  const isLast = index === ROADMAP_STAGES.length - 1
  
  // Hide terminal stages unless they're the current status
  if (stage.order >= 97 && stage.id !== client.statutProjet) {
    return null
  }
  
  // ... render stage
})}
```

### 5. Added Terminal Status Styling
Terminal statuses now have distinct red styling:
- **Background**: Red with low opacity (`bg-red-500/10`)
- **Border**: Red border with ring (`border-red-500/30 ring-1 ring-red-500/20`)
- **Icon**: Red background (`bg-red-500/20`)
- **Text**: Red color (`text-red-400`)
- **Badge**: "TERMINAL" badge in red

## Visual Differences

### Before Fix
```
Timeline/Roadmap showing:
✓ Qualifié (3 heures ACTIF) ← WRONG! Should be Refusé
💰 Acompte
🧩 Conception
📄 Devis (1 envoyé, 1 refusé)
✅ Accepté (2 jours 22h)
```

### After Fix
```
Timeline/Roadmap showing:
✓ Qualifié (completed)
💰 Acompte (completed)
🧩 Conception (completed)
📄 Devis (1 envoyé, 1 refusé)
✅ Accepté (2 jours 22h, completed)
❌ Refusé (3 heures TERMINAL) ← CORRECT! Shows actual status
```

## Status Type Indicators

| Status Type | Badge | Color | Behavior |
|------------|-------|-------|----------|
| **In Progress** | ACTIF (blue, pulsing) | Blue | Normal active stage |
| **Terminal** | TERMINAL (red) | Red | Final state (refuse, annule, suspendu) |
| **Completed** | ✓ (green) | Green | Past stages |
| **Pending** | - | Gray/Dim | Future stages |

## Benefits

✅ **Accurate Status Display**: Shows the actual current status, including terminal states
✅ **Clear Visual Distinction**: Terminal statuses have red styling to indicate project end
✅ **Clean UI**: Terminal stages are hidden unless they're the active status
✅ **Duration Tracking**: Terminal statuses show how long they've been in that state
✅ **Proper Logging**: Console logs help debug status detection issues

## Files Modified

1. `components/client-details/project-roadmap-card.tsx`
   - Added terminal statuses to ROADMAP_STAGES
   - Enhanced stage status detection
   - Added terminal status styling
   - Hide inactive terminal stages

## Testing Checklist

- [x] Client with status "refuse" shows "Refusé" as active (red)
- [x] Client with status "annule" shows "Annulé" as active (red)
- [x] Client with status "suspendu" shows "Suspendu" as active (red)
- [x] Terminal stages are hidden when not active
- [x] Duration is displayed correctly for terminal statuses
- [x] Console logs show correct status detection
- [x] Red styling is applied to terminal statuses
- [x] "TERMINAL" badge appears for terminal statuses

## Related Statuses

### Terminal Statuses (Project Ended)
- `refuse` - Devis refusé par le client
- `annule` - Projet annulé
- `suspendu` - Projet suspendu temporairement
- `livraison_termine` - Projet livré et terminé (success terminal state)

### Active Statuses (Project In Progress)
- `qualifie` through `facture_reglee` - Normal progression

### Legacy Statuses (Backward Compatibility)
- `nouveau`, `acompte_verse`, `en_conception`, etc.
