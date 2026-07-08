import type { Prisma } from '../generated/prisma/client';

/** Filtre nom + périmètre org (y compris `null` pour les rôles globaux). */
export function roleNameScopeWhere(
  name: string,
  organizationScopeId: string | null,
): Prisma.RoleWhereInput {
  return { name, organizationScopeId };
}
