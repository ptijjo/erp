import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RealtimeHubService } from '../realtime/realtime-hub.service';
import { NotificationType, type Prisma } from '../generated/prisma/client';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  organizationId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly realtimeHub: RealtimeHubService,
  ) {}

  async create(input: CreateNotificationInput) {
    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        organizationId: input.organizationId ?? null,
        metadata: input.metadata,
      },
    });

    this.realtimeHub.emit(input.userId, 'notification', {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      createdAt: row.createdAt,
    });

    if (this.mailService.isEnabled()) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      });
      if (user?.email) {
        void this.mailService.sendNotificationEmail(
          user.email,
          input.title,
          input.body,
        );
      }
    }

    return row;
  }

  async notifyUsersWithPermission(
    organizationId: string,
    permissionName: string,
    payload: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<void> {
    const links = await this.prisma.permissionRole.findMany({
      where: { permission: { name: permissionName } },
      select: { roleId: true },
    });
    const roleIds = [...new Set(links.map((l) => l.roleId))];
    if (roleIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
        roleId: { in: roleIds },
      },
      select: { id: true },
    });

    await Promise.all(
      users.map((u) =>
        this.create({
          ...payload,
          userId: u.id,
          organizationId,
        }),
      ),
    );
  }

  async notifyMainUsersWithPermission(
    permissionName: string,
    payload: Omit<CreateNotificationInput, 'userId' | 'organizationId'>,
  ): Promise<void> {
    const links = await this.prisma.permissionRole.findMany({
      where: { permission: { name: permissionName } },
      select: { roleId: true },
    });
    const roleIds = [...new Set(links.map((l) => l.roleId))];
    if (roleIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roleId: { in: roleIds },
        organization: { organizationType: 'MAIN' },
      },
      select: { id: true, organizationId: true },
    });

    await Promise.all(
      users.map((u) =>
        this.create({
          ...payload,
          userId: u.id,
          organizationId: u.organizationId,
        }),
      ),
    );
  }

  async findMine(
    viewer: AuthenticatedUser,
    options?: { unreadOnly?: boolean; limit?: number },
  ) {
    const where: Prisma.NotificationWhereInput = { userId: viewer.sub };
    if (options?.unreadOnly) {
      where.readAt = null;
    }
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });
  }

  async markRead(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Notification introuvable.');
    }
    if (row.userId !== viewer.sub) {
      throw new ForbiddenException();
    }
    if (row.readAt) {
      return row;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(viewer: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: viewer.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
