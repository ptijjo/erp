"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "~/lib/api";
import type { PermissionAction, PolicySubject } from "~/lib/me-ability";

export type { PermissionAction, PolicySubject } from "~/lib/me-ability";

/** Rôle renvoyé par `GET /auth/me` (claims JWT). */
export type MeRole = {
  id: string;
  name: string;
  description: string | null;
  /** Code pôle du rôle (`null` si transversal ADMIN / DG). Aligné `GET /auth/me`. */
  poleCode: string | null;
};

/** Profil renvoyé par `GET /auth/me` (JWT + nom d’organisation résolu côté API). */
export type Me = {
  email: string;
  sub: string;
  organisationId: string;
  /** Maison mère ou filiale (aligné sur Prisma `OrganizationType`). */
  organizationType: "MAIN" | "SUBSIDIARY";
  /** Slug pour `/dashboard/organisations/[slug]`. */
  organizationSlug: string;
  role: MeRole;
  organisationName: string;
  firstLogin: boolean;
  permissionMode: "FULL_ACCESS" | "ROLE_PERMISSIONS" | "FALLBACK_READ_ALL";
  permissions: string[];
  /** Fille : catalogue vente (catégories ou produits) assigné par la maison mère. */
  hasSalesCatalog: boolean;
};

/** Aligné sur le backend `FULL_ACCESS_ROLE_NAMES` — accès total incl. journal d’audit. */
const AUDIT_FULL_ACCESS_ROLE_NAMES = new Set([
  "ADMIN",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OPERATIONS",
]);

function normalizePermissionName(name: string): string {
  return name.trim().toLowerCase();
}

export function hasMePermission(
  me: Me,
  action: PermissionAction,
  subject: PolicySubject | (string & {}),
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

  /**
   * Journal d’audit : non couvert par le wildcard `read:all` (snapshot maison mère).
   * Hors FULL_ACCESS : `read:AuditLog` / `manage:*` en base.
   * Sécurité supplémentaire : ADMIN, DG et directeur opérations (noms de rôle stables).
   */
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

export function isMainOrganization(me: Me): boolean {
  return me.organizationType === "MAIN";
}

/** ADMIN, DG et directeur opérations : modification du prénom / nom des utilisateurs. */
const USER_IDENTITY_EDITOR_ROLE_NAMES = new Set([
  "ADMIN",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OPERATIONS",
]);

export function canEditUserIdentity(me: Me): boolean {
  return USER_IDENTITY_EDITOR_ROLE_NAMES.has(me.role.name);
}

/** Catalogue des permissions et CRUD Permission : réservé au rôle ADMIN. */
export function isAdminUser(me: Me | null | undefined): boolean {
  return me?.role.name === "ADMIN";
}

/** Page d’accueil dashboard après connexion (hors parcours premier login). */
export function dashboardHomePath(_me: Me): string {
  return "/dashboard";
}

/** Fiche détail de la filiale connectée (menu « Mon organisation »). */
export function subsidiaryOrganizationPath(me: Me): string | null {
  if (me.organizationType === "SUBSIDIARY" && me.organizationSlug) {
    return `/dashboard/organisations/${me.organizationSlug}`;
  }
  return null;
}

export const meQueryKey = ["auth", "me"] as const;

export async function fetchMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<Me>("/auth/me");
    return data;
  } catch (err) {
    if (
      isAxiosError(err) &&
      (err.response?.status === 401 || err.response?.status === 403)
    ) {
      return null;
    }
    throw err;
  }
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    retry: false,
  });
}
