import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditAction, AuditLog, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

export type AuditLogPayload = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: Prisma.InputJsonValue;
  userId?: string | null;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogPayload) {
    return this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? undefined,
        details: entry.details ?? undefined,
        userId: entry.userId ?? undefined,
        organizationId: entry.organizationId ?? undefined,
        ipAddress: entry.ipAddress ?? undefined,
        userAgent: entry.userAgent ?? undefined,
      },
    });
  }

  async findAll(take: number, viewer: AuthenticatedUser): Promise<AuditLog[]> {
    const where = isMainOrganizationUser(viewer)
      ? {}
      : {
          OR: [
            { organizationId: viewer.organisationId },
            {
              user: { organizationId: viewer.organisationId },
            },
          ],
        };
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: true, organization: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<AuditLog> {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Journal d’audit introuvable');
    }
    if (!isMainOrganizationUser(viewer)) {
      const okOrg = row.organizationId === viewer.organisationId;
      const okUser = row.user?.organizationId === viewer.organisationId;
      if (!okOrg && !okUser) {
        throw new ForbiddenException(
          'Accès limité aux données de votre organisation.',
        );
      }
    }
    return row;
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    viewer: AuthenticatedUser,
  ): Promise<AuditLog[]> {
    const where = isMainOrganizationUser(viewer)
      ? { entityType, entityId }
      : {
          entityType,
          entityId,
          OR: [
            { organizationId: viewer.organisationId },
            { user: { organizationId: viewer.organisationId } },
          ],
        };
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async findByUserId(
    userId: string,
    take: number,
    viewer: AuthenticatedUser,
  ): Promise<AuditLog[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
