---
description: Complete Contact → Opportunity → Client Workflow Implementation
---

# Contact → Opportunity → Client Workflow

## Overview
This workflow implements the complete Lead → Contact → Opportunity → Client conversion process with proper status management and pipeline integration.

## Database Changes Required

### 1. Update Contact Model (Prisma Schema)
Add a new `status` field to track the contact's current stage:

```prisma
model Contact {
  // ... existing fields
  status ContactStatus @default(qualifie)
  // ... rest of fields
}

enum ContactStatus {
  qualifie           // Initial status after lead conversion
  prise_de_besoin    // After "Prise de besoin" action
  acompte_recu       // After "Acompte Reçu" action - unlocks opportunity creation
  perdu              // Contact is lost
}
```

### 2. Add Pipeline Stage to Opportunity
Add a `pipelineStage` field to track opportunity progress:

```prisma
model Opportunity {
  // ... existing fields
  pipelineStage OpportunityPipelineStage @default(acompte_recu)
  // ... rest of fields
}

enum OpportunityPipelineStage {
  acompte_recu  // Stage 1
  etude         // Stage 2
  devis         // Stage 3
  gagnee        // Stage 4
  perdue        // Stage 5
}
```

## Implementation Steps

### Step 1: Update Prisma Schema
- Add `ContactStatus` enum
- Add `status` field to Contact model
- Add `OpportunityPipelineStage` enum
- Add `pipelineStage` field to Opportunity model
- Run `npx prisma db push`

### Step 2: Update TypeScript Types
- Update `types/contact.ts` with new status types
- Update opportunity types with pipeline stages

### Step 3: Create API Routes for Contact Actions

#### `/api/contacts/[id]/prise-de-besoin` (POST)
- Updates contact.status to "prise_de_besoin"
- Creates timeline entry
- Returns updated contact

#### `/api/contacts/[id]/acompte-recu` (POST)
- Updates contact.status to "acompte_recu"
- Creates payment record
- Creates timeline entry
- Returns updated contact

#### `/api/contacts/[id]/mark-lost` (POST)
- Updates contact.status to "perdu"
- Creates timeline entry
- Returns updated contact

### Step 4: Update Contact Details Page
Add action buttons based on current status:
- **Prise de besoin** button (visible when status = qualifie)
- **Acompte Reçu** button (visible when status = prise_de_besoin)
- **Créer une Opportunité** button (visible ONLY when status = acompte_recu)
- **Perdu** button (always visible, except when already perdu)

### Step 5: Update Create Opportunity Modal
Modify modal to include:
- Contact name (read-only)
- Téléphone (read-only)
- Ville (read-only)
- Type de bien (read-only, from lead data)
- Description (required, new field)
- Montant estimé (required, new field)
- Architecte (dropdown, pre-selected)

### Step 6: Update Opportunity Creation Logic
When opportunity is created:
1. Create opportunity with pipelineStage = "acompte_recu"
2. Update contact.status to "client"
3. Set contact.clientSince to current date
4. Create timeline entries
5. Redirect to Contact Details → Opportunités tab
6. Show success toast

### Step 7: Update Client Page
Ensure contacts with status "client" appear in the Client page
Show their opportunities with correct pipeline stages

## Testing Checklist

- [ ] Lead converts to Contact with status "qualifie"
- [ ] "Prise de besoin" action updates status correctly
- [ ] "Acompte Reçu" action updates status and shows opportunity button
- [ ] "Créer une Opportunité" button only visible when status = acompte_recu
- [ ] Opportunity creation sets correct pipeline stage
- [ ] Contact becomes "client" after first opportunity
- [ ] Contact appears in Client page
- [ ] "Perdu" action prevents opportunity creation
- [ ] Timeline entries are created for all actions
- [ ] All modals work correctly
- [ ] Redirects work as expected
- [ ] Toast notifications appear

## API Endpoints Summary

### Contact Actions
- `POST /api/contacts/[id]/prise-de-besoin`
- `POST /api/contacts/[id]/acompte-recu`
- `POST /api/contacts/[id]/mark-lost`

### Opportunity Management
- `POST /api/contacts/[id]/opportunities` (updated)
- `PATCH /api/opportunities/[id]` (existing, for status updates)

## UI Components to Update

1. **Contact Details Page** (`app/contacts/[id]/page.tsx`)
   - Add status-based action buttons
   - Update status badge logic
   - Add modals for actions

2. **Create Opportunity Modal** (`components/create-opportunity-modal.tsx`)
   - Update fields as per requirements
   - Add description and montant estimé
   - Make fields read-only where needed

3. **Opportunities Table** (`components/opportunities-table.tsx`)
   - Add pipeline stage column
   - Update status badges

4. **Contacts Table** (`components/contacts-table.tsx`)
   - Show contact status
   - Filter by status

5. **Client Page** (`app/clients/page.tsx`)
   - Show contacts with tag = "client"
   - Display opportunities with pipeline stages

## Notes

- The `tag` field (prospect, client, etc.) is separate from `status`
- `tag` becomes "client" when first opportunity is created
- `status` tracks the workflow stage
- Pipeline stages are specific to opportunities
- Contact status and opportunity pipeline are synchronized but independent
