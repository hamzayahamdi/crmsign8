# Role Permissions Quick Reference Guide

## Role Comparison Matrix

| Feature / Module | Admin | Operator | Gestionnaire | Architect | Commercial | Magasiner |
|-----------------|-------|----------|--------------|-----------|------------|-----------|
| **Tableau des Leads** | ✅ Full | ✅ Full | ✅ Full | ✅ View | ✅ Own | ✅ Own |
| **Clients & Opportunités** | ✅ Full | ✅ Full | ✅ Edit | ✅ View | ❌ | ❌ |
| **Architectes** | ✅ Full | ✅ Full | ❌ No Access | ❌ | ❌ | ❌ |
| **Tâches & Rappels** | ✅ Full | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ |
| **Calendrier** | ✅ Full | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ |
| **Notifications** | ✅ Full | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ |
| **Utilisateurs** | ✅ Full | ✅ Full | ❌ No Access | ❌ | ❌ | ❌ |
| **Paramètres** | ✅ Full | ❌ | ❌ No Access | ❌ | ❌ | ❌ |
| **Delete Client** | ✅ Yes | ✅ Yes | ❌ No | ❌ | ❌ | ❌ |
| **Quick Actions** | ✅ All | ✅ All | ✅ All | ❌ | ❌ | ❌ |

---

## Gestionnaire de Projets - Detailed Permissions

### ✅ ALLOWED Actions

#### Leads Management
- View all leads
- Create new leads
- Edit lead information
- Add notes to leads
- Change lead status
- Assign leads

#### Clients & Projects
- View all clients
- Create new clients
- Edit client information
- Update project status
- View project progression
- Add notes to clients
- Add payments (acomptes)
- Create devis (quotes)
- Upload documents
- Share project links
- View project history
- Manage appointments

#### Tasks & Calendar
- View all tasks
- Create tasks
- Edit tasks
- Mark tasks complete
- Delete tasks
- View calendar
- Create calendar events
- Edit calendar events
- Set reminders

#### Notifications
- View notifications
- Mark as read
- Receive real-time updates

### ❌ FORBIDDEN Actions

#### System Administration
- Cannot access Architectes module
- Cannot view architect profiles
- Cannot assign architects
- Cannot access Users management
- Cannot create/edit users
- Cannot access Settings
- Cannot configure system

#### Client Management Restrictions
- **Cannot delete clients**
- Cannot permanently remove data
- Cannot access admin-only features

---

## Developer Usage Examples

### 1. Check Permission in Component

```tsx
import { hasPermission } from "@/lib/permissions"
import { useAuth } from "@/contexts/auth-context"

function MyComponent() {
  const { user } = useAuth()
  
  // Check if user can delete clients
  const canDelete = hasPermission(user?.role, 'clients', 'delete')
  
  return (
    <>
      {canDelete && (
        <Button onClick={handleDelete}>Delete</Button>
      )}
    </>
  )
}
```

### 2. Protect a Route

```tsx
import { RoleGuard } from "@/components/role-guard"

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['Admin', 'Operator']}>
      <AdminContent />
    </RoleGuard>
  )
}
```

### 3. Get Visible Sidebar Items

```tsx
import { getVisibleSidebarItems } from "@/lib/permissions"

const items = getVisibleSidebarItems(user?.role)
// Returns only items the user can access
```

### 4. Check Route Access

```tsx
import { canAccessRoute } from "@/lib/permissions"

const hasAccess = canAccessRoute(user?.role, '/architectes')
// Returns false for Gestionnaire
```

### 5. Get Role Display Label

```tsx
import { getRoleLabel } from "@/lib/permissions"

const label = getRoleLabel('gestionnaire')
// Returns: "Gestionnaire de Projets"
```

---

## API Route Protection (Recommended)

While UI protection is implemented, you should also protect API routes:

```typescript
// Example: app/api/clients/[id]/route.ts
import { hasPermission } from "@/lib/permissions"

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request)
  
  if (!hasPermission(user?.role, 'clients', 'delete')) {
    return NextResponse.json(
      { error: 'Permission denied' },
      { status: 403 }
    )
  }
  
  // Proceed with deletion
}
```

---

## Role Assignment

### In Database
```sql
-- Set user role to Gestionnaire
UPDATE users 
SET role = 'Gestionnaire' 
WHERE email = 'user@example.com';
```

### Via Prisma
```typescript
await prisma.user.update({
  where: { email: 'user@example.com' },
  data: { role: 'Gestionnaire' }
})
```

---

## Testing Scenarios

### Scenario 1: Gestionnaire Login
1. Login with Gestionnaire credentials
2. **Expected:** See Leads, Clients, Tasks, Calendar, Notifications in sidebar
3. **Expected:** Do NOT see Architectes, Users, Settings

### Scenario 2: Access Protected Route
1. As Gestionnaire, navigate to `/architectes`
2. **Expected:** See "Accès refusé" screen
3. **Expected:** Redirected to home page

### Scenario 3: Delete Button Visibility
1. As Gestionnaire, open client detail page
2. **Expected:** "Supprimer client" button is hidden
3. As Admin, open same page
4. **Expected:** "Supprimer client" button is visible

### Scenario 4: Quick Actions
1. As Gestionnaire, open client detail
2. **Expected:** Can add notes, payments, devis, documents
3. **Expected:** Can share project
4. **Expected:** Can update project status

---

## Troubleshooting

### Issue: Gestionnaire sees Architectes in sidebar
**Solution:** Check that role is exactly "Gestionnaire" (case-insensitive). Clear browser cache.

### Issue: Delete button still visible
**Solution:** Verify `hasPermission` is imported and used correctly in component.

### Issue: Access denied screen not showing
**Solution:** Ensure `RoleGuard` wraps the protected component and `allowedRoles` is set.

### Issue: Role badge shows wrong label
**Solution:** Check `getRoleLabel` function in `lib/permissions.ts`.

---

## Best Practices

1. **Always use permission checks** - Don't hardcode role strings
2. **Use RoleGuard for pages** - Protect entire routes, not just components
3. **Check permissions in API** - Never trust client-side checks alone
4. **Test with multiple roles** - Verify each role sees correct UI
5. **Keep permissions centralized** - Modify `lib/permissions.ts` for changes

---

## Permission Module Reference

### Available Modules
- `leads` - Lead management
- `clients` - Client management
- `architectes` - Architect management
- `tasks` - Task management
- `calendar` - Calendar management
- `notifications` - Notification management
- `users` - User management
- `settings` - System settings
- `quickActions` - Quick action buttons
- `projectProgress` - Project status updates

### Available Actions
- `view` - Read access
- `create` - Create new records
- `edit` - Modify existing records
- `delete` - Remove records
- `markAsRead` - Mark notifications as read
- `addNote` - Add notes
- `addPayment` - Add payments
- `createDevis` - Create quotes
- `shareProject` - Share project links
- `uploadDocuments` - Upload files
- `update` - Update project progress

---

## Migration Notes

### No Database Changes Required
The existing `role` field in the User model supports any string value, including "Gestionnaire".

### Backward Compatible
All existing roles (Admin, Operator, Architect, Commercial, Magasiner) continue to work as before.

### Gradual Rollout
You can assign the Gestionnaire role to users gradually without affecting other users.

---

## Support & Maintenance

For questions or issues:
1. Check this guide first
2. Review `lib/permissions.ts` for permission definitions
3. Check `components/role-guard.tsx` for route protection logic
4. Review implementation document: `GESTIONNAIRE_ROLE_IMPLEMENTATION.md`
