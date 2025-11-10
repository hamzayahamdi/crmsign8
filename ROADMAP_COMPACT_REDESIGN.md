# Roadmap Card Compact Redesign

## Changes Implemented

### 1. **Compact Card Layout**
- **Reduced padding**: `p-2.5` → `p-2` (20% reduction)
- **Reduced gap**: `gap-2.5` → `gap-2`
- **Smaller icons**: `w-7 h-7` → `w-6 h-6`
- **Shorter connector lines**: `h-1.5` → `h-1`

### 2. **Duration and Date on Same Line**
Previously (2 lines):
```
⏱ 2 jours 22h
📅 du 04/11/2025 au 07/11/2025
```

Now (1 line with separator):
```
⏱ 2 jours 22h • 📅 du 04/11/2025 au 07/11/2025
```

**Implementation:**
```tsx
<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
  {/* Duration */}
  <div className="flex items-center gap-0.5">
    <Clock className="w-2.5 h-2.5" />
    <span className="text-[10px] font-semibold">2 jours 22h</span>
  </div>
  
  {/* Separator */}
  <span className="text-white/20 text-[10px]">•</span>
  
  {/* Date Range */}
  <div className="flex items-center gap-0.5">
    <Calendar className="w-2.5 h-2.5" />
    <span className="text-[9px]">du 04/11/2025 au 07/11/2025</span>
  </div>
  
  {/* Status Badge - Inline */}
  <span className="text-[8px] px-1 py-0.5 rounded-full">ACTIF</span>
</div>
```

### 3. **Improved Unreachable Stage Visibility**
- **Increased opacity**: `opacity-40` → `opacity-60` (50% more visible)
- **Better border**: `border-gray-500/10` → `border-gray-500/20` (2x more visible)
- **Enhanced icon**: `opacity-30` → `opacity-50` (67% more visible)
- **Better text**: `text-gray-400/40` → `text-gray-400/50` (25% more visible)

### 4. **Optimized Font Sizes**
- **Stage label**: `text-xs` → `text-[11px]` (slightly smaller)
- **Duration**: `text-[11px]` → `text-[10px]`
- **Date**: `text-[10px]` → `text-[9px]`
- **Devis summary**: `text-[10px]` → `text-[9px]`
- **Status badges**: `text-[9px]` → `text-[8px]`
- **Checkmark**: `text-sm` → `text-xs`

### 5. **Inline Status Badges**
Status badges (ACTIF, TERMINAL) are now inline with duration/date instead of separate, saving vertical space.

### 6. **Simplified Right-Side Badges**
- Removed redundant "En cours" badge (ACTIF badge is enough)
- Removed redundant "Terminé" badge (TERMINAL badge is enough)
- Kept only "Non atteint" for unreachable stages
- Kept checkmark ✓ for completed stages

## Visual Comparison

### Before (Tall Cards)
```
┌─────────────────────────────────────────┐
│ ✅  Accepté                          ✓ │
│     ⏱ 2 jours 22h                      │
│     📅 du 04/11/2025 au 07/11/2025     │
│                                         │  ← Extra whitespace
└─────────────────────────────────────────┘
│  (connector line)
┌─────────────────────────────────────────┐
│ ❌  Refusé                      Terminé │
│     ⏱ 2 heures        TERMINAL          │
│     📅 depuis le 07/11/2025             │
│                                         │  ← Extra whitespace
└─────────────────────────────────────────┘
```

### After (Compact Cards)
```
┌───────────────────────────────────────┐
│ ✅ Accepté                         ✓ │
│    ⏱ 2j 22h • 📅 04/11-07/11         │
└───────────────────────────────────────┘
│ (shorter connector)
┌───────────────────────────────────────┐
│ ❌ Refusé                             │
│    ⏱ 2h • 📅 depuis 07/11 • TERMINAL │
└───────────────────────────────────────┘
│
┌───────────────────────────────────────┐
│ 💵 1er Dépôt          Non atteint    │
└───────────────────────────────────────┘
```

## Space Savings

**Per Card:**
- Height reduction: ~30-40% (from ~80px to ~50px)
- Better information density
- No wasted whitespace

**For 10 stages:**
- Before: ~800px total height
- After: ~500px total height
- **Savings: 300px (37.5% reduction)**

## Readability Improvements

### Unreachable Stages
**Before:**
- Opacity: 40% (too faded, hard to see)
- Border: Very faint
- Text: Barely visible

**After:**
- Opacity: 60% (clearly visible but still disabled)
- Border: 2x more visible
- Text: 25% more visible
- Still clearly "disabled" but readable

### Information Hierarchy
1. **Stage name** - Most prominent (11px, bold for active)
2. **Duration** - Important (10px, semibold)
3. **Date range** - Secondary (9px)
4. **Status badge** - Contextual (8px)

## Responsive Design

The layout uses `flex-wrap` so on narrow screens, the duration/date line can wrap:

**Wide screen:**
```
⏱ 2 jours 22h • 📅 du 04/11/2025 au 07/11/2025 • ACTIF
```

**Narrow screen:**
```
⏱ 2 jours 22h • 📅 du 04/11/2025 au 07/11/2025
ACTIF
```

## Color Adjustments

### Unreachable Stages
- Container: `bg-gray-500/5` (subtle background)
- Border: `border-gray-500/20` (visible outline)
- Icon: `bg-gray-500/15 opacity-50` (faded but visible)
- Text: `text-gray-400/50 line-through` (readable strikethrough)
- Badge: `bg-gray-500/15 text-gray-400/50` (clear label)

### Completed Stages
- Icon opacity reduced slightly for better hierarchy
- Checkmark: `text-green-400/70` (subtle but clear)

## Benefits

✅ **37% less vertical space** - More stages visible without scrolling
✅ **Better information density** - Duration and date on one line
✅ **Clearer unreachable stages** - 60% opacity instead of 40%
✅ **Cleaner design** - Removed redundant badges
✅ **Intuitive separator** - Bullet point (•) clearly separates duration and date
✅ **Responsive** - Wraps gracefully on narrow screens
✅ **Consistent sizing** - Smaller, more uniform text sizes
✅ **Professional appearance** - Compact but not cramped

## Files Modified

1. `components/client-details/project-roadmap-card.tsx`
   - Reduced padding and spacing
   - Combined duration and date on one line
   - Increased unreachable stage opacity
   - Optimized font sizes
   - Moved status badges inline
   - Simplified right-side badges
