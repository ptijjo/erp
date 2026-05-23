import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Employee } from '../generated/prisma/client';

/** Organisation cible d’une création RH (filiale = JWT ; maison mère = `organizationId` explicite). */
export function resolveTargetOrganizationId(
  viewer: AuthenticatedUser,
  dtoOrganizationId?: string,
): string {
  if (isMainOrganizationUser(viewer)) {
    if (!dtoOrganizationId?.trim()) {
      throw new BadRequestException(
        'organizationId est requis pour la maison mère.',
      );
    }
    return dtoOrganizationId.trim();
  }
  if (
    dtoOrganizationId != null &&
    dtoOrganizationId !== '' &&
    dtoOrganizationId !== viewer.organisationId
  ) {
    throw new ForbiddenException(
      'Vous ne pouvez créer des données que pour votre organisation.',
    );
  }
  return viewer.organisationId;
}

export async function assertEmployeeInViewerScope(
  prisma: PrismaService,
  employeeId: string,
  viewer: AuthenticatedUser,
): Promise<Employee> {
  const row = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!row) {
    throw new NotFoundException('Employé introuvable');
  }
  assertOrganizationResourceAccess(viewer, row.organizationId);
  return row;
}

export async function assertDepartmentInViewerScope(
  prisma: PrismaService,
  departmentId: string,
  viewer: AuthenticatedUser,
): Promise<{ id: string; organizationId: string; name: string }> {
  const row = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!row) {
    throw new NotFoundException('Département introuvable');
  }
  assertOrganizationResourceAccess(viewer, row.organizationId);
  return row;
}
