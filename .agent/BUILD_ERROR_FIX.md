# ✅ Build Error Fix - Module Not Found

## Problem
Build was failing with error:
```
Module not found: Can't resolve '@/components/lead-modal-redesigned'
```

This occurred because:
1. `lead-modal-redesigned.tsx` was deleted
2. `app/commercial/page.tsx` was still importing it

## Solution
Updated `app/commercial/page.tsx` to use the new `LeadModalEnhanced` component instead.

## Changes Made

### File: `app/commercial/page.tsx`

#### Change 1: Import Statement (Line 13)
**Before**:
```tsx
import { LeadModalRedesigned } from "@/components/lead-modal-redesigned"
```

**After**:
```tsx
import { LeadModalEnhanced } from "@/components/lead-modal-enhanced"
```

#### Change 2: Component Usage (Lines 287-297)
**Before**:
```tsx
{selectedLead && (
  <LeadModalRedesigned
    lead={selectedLead}
    open={viewModalOpen}
    onOpenChange={setViewModalOpen}
    onSave={handleSaveLead}
    currentUserRole={user.role}
    currentUserName={user.name}
    currentUserMagasin={user.magasin}
  />
)}
```

**After**:
```tsx
{selectedLead && (
  <LeadModalEnhanced
    lead={selectedLead}
    open={viewModalOpen}
    onOpenChange={setViewModalOpen}
    onSave={handleSaveLead}
    currentUserRole={user.role}
    currentUserName={user.name}
  />
)}
```

**Note**: Removed `currentUserMagasin` prop as it's not needed in `LeadModalEnhanced`.

## Status: ✅ FIXED

The build error has been resolved. The commercial dashboard now uses the enhanced lead modal component.

## Files Modified
1. `app/commercial/page.tsx` - Updated import and component usage
