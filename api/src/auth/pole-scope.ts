import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types';
import { isMainOrganizationUser } from './organization-scope';
import { isFullAccessRoleName } from '../casl/define-ability';
import type { Prisma } from '../generated/prisma/client';

/** Pôles métier utilisés pour le périmètre maison mère (alignés seeder). */
export const POLE_DOMAIN = {
  FINANCE: 'Pole_FINANCE',
  HR: 'Pole_HR',
  OPERATIONS: 'Pole_OPERATIONS',
  PRODUCTION: 'Pole_PRODUCTION',
  LEGAL: 'Pole_LEGAL',
  HERITAGE: 'Pole_ARCHITECTURE_HERITAGE',
  STRATEGY: 'Pole_STRATEGY_DEVELOPMENT',
  MARKETING: 'Pole_MARKETING_COMMUNICATION',
  TRADITIONAL: 'Pole_TRADITIONAL_SPIRITUAL',
} as const;

export type PoleDomainCode = (typeof POLE_DOMAIN)[keyof typeof POLE_DOMAIN];

/** ADMIN, DG, opérations et tous les DIRECTOR_* : pas de restriction pôle. */
export function bypassesMainOrgPoleScope(user: AuthenticatedUser): boolean {
  if (!isMainOrganizationUser(user)) {
    return true;
  }
  if (isFullAccessRoleName(user.role.name)) {
    return true;
  }
  if (user.role.name.startsWith('DIRECTOR_')) {
    return true;
  }
  return false;
}

/** Lecture / écriture maison mère limitée au pôle du rôle (hors bypass). */
export function assertMainOrgPoleDomain(
  viewer: AuthenticatedUser,
  domainPoleCode: PoleDomainCode,
): void {
  if (!isMainOrganizationUser(viewer) || bypassesMainOrgPoleScope(viewer)) {
    return;
  }
  const viewerPole = viewer.role.poleCode;
  if (viewerPole == null || viewerPole === '') {
    throw new ForbiddenException(
      'Accès réservé aux utilisateurs rattachés à un pôle.',
    );
  }
  if (viewerPole !== domainPoleCode) {
    throw new ForbiddenException('Accès limité à votre pôle.');
  }
}

/** Filtre Prisma pour lister les utilisateurs maison mère par pôle. */
export function mainOrgUserListPoleFilter(
  viewer: AuthenticatedUser,
): Prisma.UserWhereInput {
  if (!isMainOrganizationUser(viewer)) {
    return { organizationId: viewer.organisationId };
  }
  if (bypassesMainOrgPoleScope(viewer)) {
    return isFullAccessRoleName(viewer.role.name)
      ? {}
      : { organizationId: viewer.organisationId };
  }
  const poleCode = viewer.role.poleCode;
  if (poleCode == null || poleCode === '') {
    return { organizationId: viewer.organisationId };
  }
  return {
    organizationId: viewer.organisationId,
    role: { pole: { code: poleCode } },
  };
}

/** Vérifie qu’un utilisateur cible est dans le périmètre pôle du viewer. */
export function assertUserTargetInPoleScope(
  viewer: AuthenticatedUser,
  target: {
    organizationId: string;
    role: { pole: { code: string } | null };
  },
): void {
  if (!isMainOrganizationUser(viewer)) {
    if (target.organizationId !== viewer.organisationId) {
      throw new ForbiddenException();
    }
    return;
  }
  if (bypassesMainOrgPoleScope(viewer)) {
    if (
      !isFullAccessRoleName(viewer.role.name) &&
      target.organizationId !== viewer.organisationId
    ) {
      throw new ForbiddenException();
    }
    return;
  }
  if (target.organizationId !== viewer.organisationId) {
    throw new ForbiddenException();
  }
  const poleCode = viewer.role.poleCode;
  if (poleCode == null || poleCode === '') {
    return;
  }
  if ((target.role.pole?.code ?? null) !== poleCode) {
    throw new ForbiddenException('Accès limité à votre pôle.');
  }
}
