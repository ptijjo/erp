import type { OrganizationDto, RoleDto } from "~/lib/api-types";

/** Rôle réservé au seeder : jamais proposé à la création / édition manuelle. */
export const EXCLUDED_USER_ROLE_NAMES = new Set(["ADMIN"]);

export function isMainOrganizationDto(org: OrganizationDto | undefined): boolean {
  return org?.organizationType === "MAIN";
}

export function rolesForOrganization(
  roles: RoleDto[],
  organizationId: string,
  organization: OrganizationDto | undefined,
  poleId: string | undefined,
): RoleDto[] {
  if (!organizationId || !organization) return [];

  const scoped = roles.filter((r) => {
    if (EXCLUDED_USER_ROLE_NAMES.has(r.name)) return false;
    if (isMainOrganizationDto(organization)) {
      return (
        r.organizationScopeId === null ||
        r.organizationScopeId === organizationId
      );
    }
    return r.organizationScopeId === organizationId;
  });

  if (isMainOrganizationDto(organization)) {
    if (!poleId) return [];
    return scoped.filter((r) => r.poleId === poleId);
  }

  return scoped.filter((r) => r.poleId === null);
}

export function roleOrganizationLabel(role: RoleDto): string {
  if (role.organizationScope) {
    return role.organizationScope.name;
  }
  if (role.organizationScopeId) {
    return "Organisation";
  }
  return "Global (système)";
}
