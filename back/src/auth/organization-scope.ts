import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types';

/** Valeurs Prisma `OrganizationType` embarquées dans le JWT. */
export type JwtOrganizationType = 'MAIN' | 'SUBSIDIARY';

export function isMainOrganizationUser(user: AuthenticatedUser): boolean {
  return user.organizationType === 'MAIN';
}

export function assertMainOrganizationOnly(user: AuthenticatedUser): void {
  if (!isMainOrganizationUser(user)) {
    throw new ForbiddenException(
      'Cette action est réservée à la maison mère.',
    );
  }
}

/** Accès à une ressource rattachée à une organisation (filiale ou maison mère). */
export function assertOrganizationResourceAccess(
  user: AuthenticatedUser,
  resourceOrganizationId: string,
): void {
  if (isMainOrganizationUser(user)) {
    return;
  }
  if (resourceOrganizationId !== user.organisationId) {
    throw new ForbiddenException(
      'Accès limité aux données de votre organisation.',
    );
  }
}

/** Filtre Prisma `where` pour les listes multi-organisations. */
export function organizationListWhere(
  user: AuthenticatedUser,
): { organizationId: string } | Record<string, never> {
  if (isMainOrganizationUser(user)) {
    return {};
  }
  return { organizationId: user.organisationId };
}
