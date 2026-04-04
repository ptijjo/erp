import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditAction, AuditLog, Prisma } from '../generated/prisma/client';

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

  async findAll(take = 200): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: true, organization: true },
    });
  }

  async findOne(id: string): Promise<AuditLog> {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Journal d’audit introuvable');
    }
    return row;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async findByUserId(userId: string, take = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
