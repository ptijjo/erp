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
  permissionMode: "FULL_ACCESS" | "ROLE_PERMISSIONS" | "FALLBACK_READ_ALL";
  permissions: string[];
  hasSalesCatalog: boolean;
};

export type RouteGuardRule =
  | { mainOnly: true }
  | { permission: { action: PermissionAction; subject: string } };

/** Routes protégées par permission ou restriction maison mère. */
export const ROUTE_GUARDS: Record<string, RouteGuardRule> = {
  "/dashboard/fournisseurs": { mainOnly: true },
  "/dashboard/organisations": { mainOnly: true },
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
  "/dashboard/spirituel": {
    permission: { action: "read", subject: "SpiritualEvent" },
  },
  "/dashboard/comptabilite-generale": {
    permission: { action: "read", subject: "JournalEntry" },
  },
  "/dashboard/commandes-inter-filiales": {
    permission: { action: "read", subject: "StockOrder" },
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
