import type { PermissionAction } from "~/lib/me-ability";

/** Profil renvoyé par `GET /auth/me` — forme utilisée par le middleware. */
export type RouteGuardMe = {
  email: string;
  sub: string;
  organisationId: string;
  organizationType: "MAIN" | "SUBSIDIARY";
  organizationSlug: string;
  role: {
    id: string;
    name: string;
    description: string | null;
    poleCode: string | null;
  };
  organisationName: string;
  firstLogin: boolean;
  permissionMode: "FULL_ACCESS" | "ROLE_PERMISSIONS" | "NO_PERMISSIONS";
  permissions: string[];
  hasSalesCatalog: boolean;
};

export type RouteGuardRule =
  | { mainOnly: true }
  | { permission: { action: PermissionAction; subject: string } };

/** Routes protégées par permission ou restriction maison mère. */
export const ROUTE_GUARDS: Record<string, RouteGuardRule> = {
  "/dashboard/hq/fournisseurs": { mainOnly: true },
  "/dashboard/hq/organisations": { mainOnly: true },
  "/dashboard/hq/organisations/poles": {
    permission: { action: "read", subject: "Pole" },
  },
  "/dashboard/hq/organisations/poles/add": {
    permission: { action: "create", subject: "Pole" },
  },
  "/dashboard/hq/categories": {
    permission: { action: "read", subject: "Category" },
  },
  "/dashboard/produits": {
    permission: { action: "read", subject: "Product" },
  },
  "/dashboard/stocks": {
    permission: { action: "read", subject: "Stock" },
  },
  "/dashboard/commandes-inter-filiales": {
    permission: { action: "read", subject: "StockOrder" },
  },
  "/dashboard/budgets": {
    permission: { action: "read", subject: "Budget" },
  },
  "/dashboard/utilisateurs": {
    permission: { action: "read", subject: "User" },
  },
  "/dashboard/rh": {
    permission: { action: "read", subject: "Employee" },
  },
  "/dashboard/audit": {
    permission: { action: "read", subject: "AuditLog" },
  },
  "/dashboard/messages": {
    permission: { action: "read", subject: "Message" },
  },
  "/dashboard/mes-actions": {
    permission: { action: "read", subject: "Task" },
  },
  "/dashboard/patrimoine": {
    permission: { action: "read", subject: "HeritageAsset" },
  },
  "/dashboard/juridique": {
    permission: { action: "read", subject: "LegalContract" },
  },
  "/dashboard/strategie": {
    permission: { action: "read", subject: "StrategyProject" },
  },
  "/dashboard/marketing": {
    permission: { action: "read", subject: "MarketingCampaign" },
  },
  "/dashboard/evenements": {
    permission: { action: "read", subject: "SpiritualEvent" },
  },
  "/dashboard/production": {
    permission: { action: "read", subject: "ProductionOrder" },
  },
  "/dashboard/comptabilite-generale": {
    permission: { action: "read", subject: "JournalEntry" },
  },
  "/dashboard/comptabilite": {
    permission: { action: "read", subject: "StockOrder" },
  },
  "/dashboard/tresorerie": {
    permission: { action: "read", subject: "AccountingPeriod" },
  },
};

const AUDIT_FULL_ACCESS_ROLE_NAMES = new Set([
  "ADMIN",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OPERATIONS",
]);

function normalizePermissionName(name: string): string {
  return name.trim().toLowerCase();
}

/** Copie de `hasMePermission` (`use-me.ts`) pour usage middleware / serveur. */
export function hasRouteGuardPermission(
  me: RouteGuardMe,
  action: PermissionAction,
  subject: string,
): boolean {
  if (me.permissionMode === "FULL_ACCESS") {
    return true;
  }
  if (me.permissionMode === "NO_PERMISSIONS") {
    return false;
  }
  const normalizedAction = action.trim().toLowerCase();
  const normalizedSubject = subject.trim();
  if (!normalizedSubject) {
    return false;
  }

  const permissions = new Set(me.permissions.map(normalizePermissionName));

  if (
    normalizedSubject.toLowerCase() === "auditlog" &&
    normalizedAction === "read"
  ) {
    if (AUDIT_FULL_ACCESS_ROLE_NAMES.has(me.role.name)) {
      return true;
    }
    return (
      permissions.has("manage:all") ||
      permissions.has("manage:auditlog") ||
      permissions.has("read:auditlog")
    );
  }

  const exact = `${normalizedAction}:${normalizedSubject}`.toLowerCase();
  const actionAll = `${normalizedAction}:all`;
  const manageSubject = `manage:${normalizedSubject}`.toLowerCase();

  return (
    permissions.has("manage:all") ||
    permissions.has(manageSubject) ||
    permissions.has(actionAll) ||
    permissions.has(exact)
  );
}

function findRouteGuard(pathname: string): RouteGuardRule | null {
  const entries = Object.entries(ROUTE_GUARDS).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [path, rule] of entries) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return rule;
    }
  }
  return null;
}

/** True si le middleware doit appeler `/auth/me` (garde de route). */
export function routeRequiresProfileCheck(pathname: string): boolean {
  return findRouteGuard(pathname) != null;
}

export function isRouteAuthorized(
  pathname: string,
  me: RouteGuardMe,
): boolean {
  const rule = findRouteGuard(pathname);
  if (!rule) {
    return true;
  }
  if ("mainOnly" in rule && rule.mainOnly) {
    if (me.organizationType !== "MAIN") {
      return false;
    }
    return true;
  }
  if ("permission" in rule) {
    return hasRouteGuardPermission(
      me,
      rule.permission.action,
      rule.permission.subject,
    );
  }
  return true;
}
