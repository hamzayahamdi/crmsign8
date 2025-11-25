# Gestionnaire de Projet (Project Manager) Role Guide

## Overview
The **Gestionnaire de Projet** role has been fully implemented with restricted permissions designed for project managers who need to manage contacts, clients, and their own tasks/calendar, but should not have access to leads, architects, or administrative functions.

## Permissions Summary

### ✅ What Gestionnaire CAN Access:

1. **Contacts** (`/contacts`)
   - View all contacts
   - Create new contacts
   - Edit contact details
   - Cannot delete contacts (Admin/Operator only)

2. **Clients & Opportunités** (`/clients`)
   - View all clients and opportunities
   - Create new clients and opportunities
   - Edit client/opportunity details
   - Cannot delete clients (Admin/Operator only)

3. **Tâches & Rappels** (`/tasks`)
   - View **ONLY THEIR OWN** tasks
   - Create tasks and assign them
   - Edit their own tasks
   - Delete their own tasks
   - Tasks are filtered to show only:
     - Tasks assigned to them
     - Tasks created by them
     - Tasks where they are a participant

4. **Calendrier** (`/calendrier`)
   - View **ONLY THEIR OWN** calendar events
   - Create calendar events
   - Edit their own events
   - Delete their own events
   - Calendar events are filtered to show only:
     - Events they created
     - Events assigned to them
     - Events where they are a participant
     - Public events (visibility: 'all')

5. **Notifications** (`/notifications`)
   - View their notifications
   - Mark notifications as read

### ❌ What Gestionnaire CANNOT Access:

1. **Tableau des Leads** (`/`)
   - No access to leads management
   - This is reserved for sales roles (Commercial, Admin, Operator)

2. **Architectes** (`/architectes`)
   - No access to architect management
   - Only Admin and Operator can manage architects

3. **Utilisateurs** (`/users`)
   - No access to user management
   - Only Admin and Operator can manage users

4. **Paramètres** (`/settings`)
   - No access to system settings
   - Only Admin can access settings

## Technical Implementation

### 1. Permissions Configuration (`lib/permissions.ts`)

The role-based access control is centralized in this file with:

- **`sidebarPermissions`**: Defines which sidebar items are visible to each role
- **`modulePermissions`**: Defines detailed permissions for each module (view, create, edit, delete)
- **`getVisibleSidebarItems()`**: Returns sidebar items visible to a specific role
- **`hasPermission()`**: Checks if a role has permission for a specific action
- **`shouldViewOwnDataOnly()`**: Returns true for Gestionnaire and Architect roles
- **`canViewAllData()`**: Returns true only for Admin and Operator roles

### 2. Sidebar Updates (`components/sidebar.tsx`)

The sidebar now dynamically generates navigation items based on the user's role using the permissions system:

```typescript
const visibleItems = getVisibleSidebarItems(role)
```

Role labels are also centralized:
- Admin → "Administrateur"
- Operator → "Opérateur"
- Gestionnaire → "Gestionnaire de Projets"
- Architect → "Architecte"

### 3. API-Level Filtering

#### Tasks API (`app/api/tasks/route.ts`)

For Gestionnaire and Architect roles, the GET endpoint automatically filters tasks to show only:

```typescript
where.OR = [
  { assignedTo: userRecord.name },
  { createdBy: userRecord.name },
  { participants: { has: user.userId } }
]
```

#### Calendar API (`app/api/calendar/route.ts`)

For Gestionnaire and Architect roles, the GET endpoint automatically filters calendar events:

```typescript
where.AND.push({
  OR: [
    { createdBy: user.userId },
    { assignedTo: user.userId },
    { participants: { has: user.userId } },
    { visibility: 'all' }
  ]
})
```

## Setting Up a Gestionnaire User

### Option 1: Update Existing User

```sql
UPDATE users 
SET role = 'gestionnaire'
WHERE email = 'user@example.com';
```

### Option 2: Using Database Admin Panel

If you have a database admin panel (e.g., Prisma Studio, pgAdmin):

1. Open the `users` table
2. Find the user you want to update
3. Change the `role` column to: `gestionnaire`
4. Save changes

### Option 3: Create New Gestionnaire User

Use your application's user creation endpoint or directly in database:

```sql
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'projectmanager@signature8.com',
  'HASHED_PASSWORD', -- Hash password properly!
  'Project Manager',
  'gestionnaire',
  NOW(),
  NOW()
);
```

## Testing the Implementation

### 1. Login as Gestionnaire

After setting a user's role to `gestionnaire`, login with that user.

### 2. Verify Sidebar Visibility

You should see only these menu items:
- ✅ Contacts
- ✅ Clients & Opportunités
- ✅ Tâches & Rappels
- ✅ Calendrier
- ✅ Notifications

You should NOT see:
- ❌ Tableau des Leads
- ❌ Architectes
- ❌ Utilisateurs
- ❌ Paramètres

### 3. Verify Task Filtering

1. Go to **Tâches & Rappels**
2. You should only see tasks that:
   - Are assigned to you
   - Were created by you
   - Include you as a participant

### 4. Verify Calendar Filtering

1. Go to **Calendrier**
2. You should only see calendar events that:
   - You created
   - Are assigned to you
   - Include you as a participant
   - Are marked as public (visibility: 'all')

### 5. Verify Permissions

Try to:
- ✅ Create a new contact → Should work
- ✅ Edit a client → Should work
- ✅ Create a task → Should work
- ✅ Create a calendar event → Should work
- ❌ Access `/` (Leads page) → Should redirect or show empty
- ❌ Access `/architectes` → Should be blocked
- ❌ Access `/users` → Should be blocked

## Role Comparison

| Feature | Admin | Operator | Gestionnaire | Architect |
|---------|-------|----------|--------------|-----------|
| Leads | ✅ | ✅ | ❌ | ✅ |
| Contacts | ✅ | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ✅ | ✅ |
| Opportunities | ✅ | ✅ | ✅ | ✅ |
| Architects | ✅ | ✅ | ❌ | ❌ |
| Tasks (All) | ✅ | ✅ | ❌ | ❌ |
| Tasks (Own) | ✅ | ✅ | ✅ | ✅ |
| Calendar (All) | ✅ | ✅ | ❌ | ❌ |
| Calendar (Own) | ✅ | ✅ | ✅ | ✅ |
| Users | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Delete Clients | ✅ | ✅ | ❌ | ❌ |

## Security Notes

1. **JWT Token Required**: All API endpoints require valid JWT authentication
2. **Role-Based Filtering**: Filtering happens at the database query level, not just UI
3. **Ownership Checks**: Gestionnaire can only edit/delete their own events and tasks
4. **No Bypass Routes**: All routes respect the permission system

## Future Enhancements

Potential improvements for the Gestionnaire role:

1. **Team Management**: Allow Gestionnaire to see tasks/calendar of their team members
2. **Project-Based Filtering**: Restrict to specific projects or clients
3. **Custom Permissions**: Fine-grained permissions per Gestionnaire user
4. **Delegation**: Allow Gestionnaire to delegate tasks to specific team members
5. **Reporting**: Custom reports for project managers

## Troubleshooting

### Issue: Sidebar not updating after role change

**Solution**: 
1. Clear browser cache
2. Logout and login again
3. Check if JWT token contains the updated role

### Issue: Still seeing all tasks/calendar events

**Solution**:
1. Verify the user's role in database: `SELECT role FROM users WHERE email = 'user@example.com'`
2. Check browser console for API errors
3. Verify JWT token is being sent with requests
4. Check API logs for filtering logic

### Issue: Cannot access certain pages

**Solution**:
1. This is expected behavior for Gestionnaire role
2. Verify you're trying to access allowed routes only
3. Check `lib/permissions.ts` for route permissions

## Support

For issues or questions about the Gestionnaire role:

1. Check this documentation
2. Review `lib/permissions.ts` for detailed permission logic
3. Check API logs in browser console
4. Verify database role value is exactly: `gestionnaire` (lowercase)



