# Mohamed Lead Assignment - Implementation Guide

## 📋 Overview

This document describes the comprehensive improvements made to the CRM lead management system to ensure **Mohamed** (gestionnaire de projet) is the default assignee for all leads and receives automatic notifications when leads are converted to contacts.

---

## ✅ What Was Implemented

### 1. **Default Lead Assignment to Mohamed**

All new leads are now automatically assigned to **Mohamed** by default:

- ✅ Lead creation modals default to Mohamed
- ✅ API endpoints set Mohamed as default assignee
- ✅ Import scripts assign to Mohamed when no assignee specified
- ✅ UI displays "Assigné à" (Assigned to) instead of "Assigné par" (Assigned by)

### 2. **Admin Role Visibility**

Admins, Operators, and Gestionnaires can now see **ALL leads**:

- ✅ No filtering applied to admin/operator/gestionnaire roles
- ✅ Can view assigned AND unassigned leads
- ✅ Complete visibility across the entire lead database
- ✅ Other roles (architect, commercial, magasiner) still have filtered views

### 3. **Automatic Contact Assignment**

When converting a lead to contact:

- ✅ Contact automatically assigned to the lead's assignee (Mohamed)
- ✅ Notification sent to the assignee
- ✅ Timeline event created showing the assignment
- ✅ Full tracking in the contact history

### 4. **Role-Based Filtering**

- **Admin/Operator/Gestionnaire**: See ALL leads (including unassigned)
- **Architect**: Only sees leads assigned to them
- **Commercial**: Only sees leads they created
- **Magasiner**: Only sees leads from their magasin

---

## 📁 Files Modified

### **Component Files** (7 files)
```
components/lead-modal.tsx
components/lead-modal-redesigned.tsx
components/lead-modal-new.tsx
components/lead-modal-improved.tsx
components/commercial-add-lead-modal.tsx
components/magasiner-add-lead-modal.tsx
```

**Changes:**
- Default assignee: `"Mohamed"` (was "Radia" or "Non assigné")
- User role filter: `gestionnaire`, `architect`, `admin` (was only `architect`)
- Label: "Assigné à" (was "Assigné par")
- Auto-select Mohamed when modal opens for new leads

### **API Routes** (3 files)
```
app/api/leads/route.ts
app/api/leads/import/route.ts
app/api/contacts/convert-lead/route.ts
```

**Changes:**
- Default assignee in POST: `"Mohamed"` (was "Non assigné")
- User lookup includes: `gestionnaire` and `architect` roles
- Admin/Operator/Gestionnaire: See ALL leads (explicit filtering)
- Auto-assignment on lead-to-contact conversion

### **Database Scripts** (1 new file)
```
scripts/update-unassigned-leads.js
```

**Purpose:** Migration script to update existing leads with "Non assigné" to "Mohamed"

---

## 🚀 How to Use

### **For Admins: Viewing All Leads**

1. Log in with an **admin**, **operator**, or **gestionnaire** account
2. Navigate to the Leads page
3. You will see **ALL leads** including:
   - ✅ Leads assigned to Mohamed
   - ✅ Leads assigned to other users
   - ✅ Unassigned leads
   - ✅ Leads from all sources

### **Creating a New Lead**

1. Click "Add Lead" or "Create Lead"
2. Fill in the lead details
3. **Mohamed will be pre-selected** in the "Assigné à" dropdown
4. You can change the assignee if needed
5. Save the lead

### **Converting Lead to Contact**

1. Open a lead (assigned to Mohamed)
2. Click "Convert to Contact"
3. Select an architect if needed (optional)
4. The contact will be automatically assigned to:
   - The selected architect, OR
   - Mohamed (if no architect selected)
5. Mohamed receives a notification about the new contact

### **Running the Migration Script**

To update existing leads that are unassigned:

```bash
npm run update:unassigned-leads
```

This will:
- Find all leads with "Non assigné" or null assignee
- Update them to "Mohamed"
- Show a summary of changes

---

## 🔍 Technical Details

### **User Role Hierarchy**

| Role | Can See | Can Assign Leads |
|------|---------|------------------|
| **Admin** | ALL leads | ✅ Yes |
| **Operator** | ALL leads | ✅ Yes |
| **Gestionnaire** | ALL leads | ✅ Yes (default: Mohamed) |
| **Architect** | Only assigned to them | ❌ No |
| **Commercial** | Only created by them | ✅ Yes |
| **Magasiner** | Only from their magasin | ✅ Yes |

### **Lead Assignment Flow**

```
┌─────────────────┐
│  New Lead       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Default Assignee:      │
│  Mohamed (Gestionnaire) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Can be changed to:     │
│  - Other Gestionnaires  │
│  - Architects           │
│  - Admins               │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Lead saved to DB       │
└─────────────────────────┘
```

### **Lead to Contact Conversion Flow**

```
┌─────────────────────┐
│  Lead (Mohamed)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User clicks "Convert to        │
│  Contact"                       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Modal: Select Architect        │
│  (Optional)                     │
└────────┬────────────────────────┘
         │
         ├─── Architect Selected? 
         │    │
         │    ├─ YES ──> Contact assigned to Architect
         │    │
         │    └─ NO  ──> Contact assigned to Mohamed
         │              (Lead's assignee)
         ▼
┌─────────────────────────────────┐
│  - Contact Created              │
│  - Timeline Event Added         │
│  - Notification Sent            │
│  - Lead marked as Converted     │
└─────────────────────────────────┘
```

### **Database Schema**

The `Lead` table schema includes:

```prisma
model Lead {
  id                  String       @id @default(cuid())
  nom                 String
  telephone           String
  ville               String
  typeBien            String
  statut              LeadStatus
  statutDetaille      String
  message             String?
  assignePar          String       // ← Default: "Mohamed"
  derniereMaj         DateTime     @default(now())
  source              LeadSource
  priorite            LeadPriority
  magasin             String?
  commercialMagasin   String?
  month               String?
  campaignName        String?
  uploadedAt          DateTime?
  convertedAt         DateTime?
  convertedToContactId String?
  notes               LeadNote[]
  createdBy           String?
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  @@index([assignePar])
  @@map("leads")
}
```

---

## 🧪 Testing

### **Test Cases**

1. **Admin Viewing All Leads**
   ```
   ✅ Admin logs in
   ✅ Navigates to Leads page
   ✅ Sees leads assigned to Mohamed
   ✅ Sees leads assigned to others
   ✅ Sees unassigned leads
   ```

2. **Creating a New Lead**
   ```
   ✅ Open lead creation modal
   ✅ Mohamed is pre-selected in dropdown
   ✅ Can change to another user
   ✅ Lead saves with correct assignee
   ```

3. **Converting Lead to Contact**
   ```
   ✅ Select a lead assigned to Mohamed
   ✅ Click "Convert to Contact"
   ✅ Leave architect field empty
   ✅ Contact is created and assigned to Mohamed
   ✅ Mohamed receives notification
   ```

4. **Role-Based Filtering**
   ```
   ✅ Architect only sees their assigned leads
   ✅ Commercial only sees their created leads
   ✅ Admin sees everything
   ```

### **Running the Migration**

```bash
# Update all unassigned leads to Mohamed
npm run update:unassigned-leads
```

Expected output:
```
🔍 Checking for unassigned leads...
✅ Found gestionnaire user: Mohamed (ID: xyz123)
⚠️  Found 25 unassigned lead(s):
  1. John Doe - Current: "Non assigné" (Source: magasin)
  2. Jane Smith - Current: "Non assigné" (Source: site_web)
  ...
📝 Updating all unassigned leads to: Mohamed...
✅ Updated 25 lead(s) successfully!
✨ All leads are now assigned to: Mohamed
📊 Summary:
   Total leads in database: 150
   Leads assigned to Mohamed: 125
   Percentage: 83.3%
✅ Migration completed successfully!
```

---

## 🔧 Troubleshooting

### **Issue: Mohamed not appearing in dropdown**

**Solution:**
1. Ensure Mohamed exists in the database with role `gestionnaire`
2. Check that user.name contains "Mohamed" (case-insensitive)
3. Verify the user is active

```sql
-- Check if Mohamed exists
SELECT * FROM users WHERE name ILIKE '%mohamed%' AND role = 'gestionnaire';
```

### **Issue: Admin can't see all leads**

**Solution:**
1. Verify the user has role: `admin`, `operator`, or `gestionnaire`
2. Check browser console for API errors
3. Verify JWT token is valid

### **Issue: Leads still showing "Non assigné"**

**Solution:**
Run the migration script:
```bash
npm run update:unassigned-leads
```

---

## 📊 Statistics & Reporting

### **Lead Assignment Report**

Query to see lead distribution:

```sql
SELECT 
  assignePar as assignee,
  COUNT(*) as lead_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM leads), 2) as percentage
FROM leads
GROUP BY assignePar
ORDER BY lead_count DESC;
```

### **Conversion Report**

Query to see Mohamed's conversion rate:

```sql
SELECT 
  COUNT(*) as total_leads,
  COUNT(CASE WHEN converted_at IS NOT NULL THEN 1 END) as converted_leads,
  ROUND(
    COUNT(CASE WHEN converted_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as conversion_rate
FROM leads
WHERE assignePar ILIKE '%mohamed%';
```

---

## 🎯 Summary

### **Key Benefits**

1. ✅ **Consistency**: All new leads default to Mohamed
2. ✅ **Visibility**: Admins can see ALL leads
3. ✅ **Automation**: Auto-assignment on conversion
4. ✅ **Tracking**: Full notification and timeline tracking
5. ✅ **Flexibility**: Can still reassign to others if needed

### **What's Next?**

- All new leads will automatically be assigned to Mohamed
- Admins have full visibility of all leads
- Lead-to-contact conversion maintains the assignment chain
- Mohamed receives notifications for new contacts
- The migration script can clean up any existing unassigned leads

---

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify database connection
3. Run the migration script: `npm run update:unassigned-leads`
4. Check user roles in the database
5. Review the API logs for filtering issues

---

**Last Updated**: November 26, 2025  
**Version**: 1.0.0  
**Author**: AI Assistant (Claude Sonnet 4.5)

