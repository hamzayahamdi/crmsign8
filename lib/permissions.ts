/**
 * Role-based permissions configuration
 * Defines access control for different user roles in the CRM
 */

export type UserRole =
  | "Admin"
  | "Operator"
  | "Gestionnaire"
  | "Architect"
  | "Commercial"
  | "Magasiner"
  | "Chef de chantier";

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

/**
 * Sidebar navigation items with role-based access
 */
export const sidebarPermissions: SidebarItem[] = [
  {
    id: "leads",
    label: "Tableau des Leads",
    href: "/",
    icon: "Home",
    roles: ["Admin", "Operator", "Gestionnaire"],
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    icon: "Briefcase",
    roles: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },

  {
    id: "clients",
    label: "Clients",
    href: "/clients",
    icon: "Users",
    roles: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },
  {
    id: "architectes",
    label: "Architectes",
    href: "/architectes",
    icon: "Compass",
    roles: ["Admin", "Operator"], // Only Admin and Operator can access
  },
  {
    id: "tasks",
    label: "Tâches & Rappels",
    href: "/tasks",
    icon: "CalendarDays",
    roles: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },
  {
    id: "calendar",
    label: "Calendrier",
    href: "/calendrier",
    icon: "Calendar",
    roles: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: "Bell",
    roles: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },
  {
    id: "users",
    label: "Utilisateurs",
    href: "/users",
    icon: "Users",
    roles: ["Admin", "Operator"], // Only Admin and Operator
  },
  {
    id: "settings",
    label: "Paramètres",
    href: "/settings",
    icon: "Settings",
    roles: ["Admin"], // Only Admin
  },
];

/**
 * Module permissions - defines what each role can access
 *
 * NOTE: Gestionnaire (Project Manager) has access to:
 * - Leads: Can view, create, edit (cannot delete)
 * - Contacts, Clients, Opportunities: Can view all, create, edit (cannot delete)
 * - Tasks & Calendar: Can view/manage ONLY their OWN
 * - CANNOT access: Architects, Users, Settings
 */
export const modulePermissions = {
  leads: {
    view: [
      "Admin",
      "Operator",
      "Gestionnaire",
      "Architect",
      "Commercial",
      "Magasiner",
    ],
    create: ["Admin", "Operator", "Gestionnaire", "Commercial", "Magasiner"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator"],
  },
  contacts: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    create: ["Admin", "Operator", "Gestionnaire"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator"],
  },
  clients: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    create: ["Admin", "Operator", "Gestionnaire"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator"], // Gestionnaire CANNOT delete
  },
  opportunities: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    create: ["Admin", "Operator", "Gestionnaire"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator"],
  },
  architectes: {
    view: ["Admin", "Operator"], // Gestionnaire CANNOT access
    create: ["Admin", "Operator"],
    edit: ["Admin", "Operator"],
    delete: ["Admin", "Operator"],
  },
  tasks: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    viewAll: ["Admin", "Operator"], // Only Admin/Operator can see all tasks
    viewOwn: ["Gestionnaire", "Architect"], // Gestionnaire/Architect see only their own
    create: ["Admin", "Operator", "Gestionnaire"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator", "Gestionnaire"],
  },
  calendar: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    viewAll: ["Admin", "Operator"], // Only Admin/Operator can see all events
    viewOwn: ["Gestionnaire", "Architect"], // Gestionnaire/Architect see only their own
    create: ["Admin", "Operator", "Gestionnaire"],
    edit: ["Admin", "Operator", "Gestionnaire"],
    delete: ["Admin", "Operator", "Gestionnaire"],
  },
  notifications: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    markAsRead: ["Admin", "Operator", "Gestionnaire", "Architect"],
  },
  users: {
    view: ["Admin", "Operator"],
    create: ["Admin", "Operator"],
    edit: ["Admin", "Operator"],
    delete: ["Admin"],
  },
  settings: {
    view: ["Admin"],
    edit: ["Admin"],
  },
  quickActions: {
    addNote: ["Admin", "Operator", "Gestionnaire"],
    addPayment: ["Admin", "Operator", "Gestionnaire"],
    createDevis: ["Admin", "Operator", "Gestionnaire"],
    shareProject: ["Admin", "Operator", "Gestionnaire"],
    uploadDocuments: ["Admin", "Operator", "Gestionnaire"],
  },
  projectProgress: {
    view: ["Admin", "Operator", "Gestionnaire", "Architect"],
    update: ["Admin", "Operator", "Gestionnaire"],
  },
} as const;

/**
 * Check if a user has permission for a specific action
 */
export function hasPermission(
  userRole: string | undefined,
  module: keyof typeof modulePermissions,
  action: string,
): boolean {
  if (!userRole) return false;

  const normalizedRole = normalizeRole(userRole);
  const modulePerms = modulePermissions[module];

  if (!modulePerms) return false;

  const actionPerms = (modulePerms as any)[action];
  if (!actionPerms) return false;

  return actionPerms.includes(normalizedRole);
}

/**
 * Get visible sidebar items for a user role
 */
export function getVisibleSidebarItems(
  userRole: string | undefined,
): SidebarItem[] {
  if (!userRole) return [];

  const normalizedRole = normalizeRole(userRole);
  return sidebarPermissions.filter((item) =>
    item.roles.includes(normalizedRole),
  );
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  userRole: string | undefined,
  path: string,
): boolean {
  if (!userRole) return false;

  const normalizedRole = normalizeRole(userRole);

  // Check if path matches any sidebar item
  const matchingItem = sidebarPermissions.find((item) => {
    // Exact match or starts with (for sub-routes)
    return path === item.href || path.startsWith(item.href + "/");
  });

  if (!matchingItem) {
    // If no matching item, allow access (might be a public route or detail page)
    return true;
  }

  return matchingItem.roles.includes(normalizedRole);
}

/**
 * Normalize role string to match UserRole type
 */
export function normalizeRole(role: string): UserRole {
  const roleLower = role.toLowerCase();

  switch (roleLower) {
    case "admin":
      return "Admin";
    case "operator":
      return "Operator";
    case "gestionnaire":
      return "Gestionnaire";
    case "architect":
      return "Architect";
    case "commercial":
      return "Commercial";
    case "magasiner":
      return "Magasiner";
    default:
      return "Architect"; // Default fallback
  }
}

/**
 * Get display label for role
 */
export function getRoleLabel(role: string | undefined): string {
  if (!role) return "Utilisateur";

  const roleLower = role.toLowerCase();

  switch (roleLower) {
    case "admin":
      return "Administrateur";
    case "operator":
      return "Opérateur";
    case "gestionnaire":
      return "Gestionnaire de Projets";
    case "architect":
      return "Architecte";
    case "commercial":
      return "Commercial";
    case "magasiner":
      return "Magasiner";
    default:
      return role;
  }
}

/**
 * Check if user role should only see their own data (tasks/calendar)
 * Gestionnaire and Architect roles have restricted visibility
 */
export function canViewAllData(userRole: string | undefined): boolean {
  if (!userRole) return false;

  const normalizedRole = normalizeRole(userRole);

  // Only Admin and Operator can see all data
  return normalizedRole === "Admin" || normalizedRole === "Operator";
}

/**
 * Check if user should see only their own data
 */
export function shouldViewOwnDataOnly(userRole: string | undefined): boolean {
  if (!userRole) return true;

  const normalizedRole = normalizeRole(userRole);

  // Gestionnaire and Architect see only their own tasks/calendar
  return normalizedRole === "Gestionnaire" || normalizedRole === "Architect";
}
