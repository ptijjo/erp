import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PermissionRole } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { RealtimeHubService } from '../realtime/realtime-hub.service';

@Injectable()
export class PermissionRoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    @Optional() private readonly realtime?: RealtimeHubService,
  ) {}

  private async invalidateRoleCache(roleId: string): Promise<void> {
    await this.caslAbilityFactory.invalidateRole(roleId);
  }

  /** Invalide le cache CASL et prévient les utilisateurs du rôle, sans reconnexion. */
  async publishAccessChangedForRoles(roleIds: string[]): Promise<void> {
    const unique = [...new Set(roleIds.filter((id) => id.length > 0))];
    await Promise.all(unique.map((roleId) => this.invalidateRoleCache(roleId)));
    if (!this.realtime || unique.length === 0) return;
    const holders = await this.prisma.user.findMany({
      where: { roleId: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    this.realtime.notifyAccessChanged(holders.map((user) => user.id));
  }

  private assertRoleReadableByViewer(
    viewer: AuthenticatedUser,
    organizationScopeId: string | null,
  ): void {
    if (isMainOrganizationUser(viewer)) {
      return;
    }
    if (
      organizationScopeId !== null &&
      organizationScopeId !== viewer.organisationId
    ) {
      throw new ForbiddenException(
        'Accès limité aux rôles de votre organisation.',
      );
    }
  }

  async findAll(viewer: AuthenticatedUser): Promise<PermissionRole[]> {
    if (!isMainOrganizationUser(viewer)) {
      return this.prisma.permissionRole.findMany({
        where: {
          role: {
            OR: [
              { organizationScopeId: null },
              { organizationScopeId: viewer.organisationId },
            ],
          },
        },
        include: { permission: true, role: true },
      });
    }
    return this.prisma.permissionRole.findMany({
      include: { permission: true, role: true },
    });
  }

  async findByRoleId(
    roleId: string,
    viewer: AuthenticatedUser,
  ): Promise<PermissionRole[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { organizationScopeId: true },
    });
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }
    this.assertRoleReadableByViewer(viewer, role.organizationScopeId);
    return this.prisma.permissionRole.findMany({
      where: { roleId },
      include: { permission: true },
    });
  }

  async findByPermissionId(
    permissionId: string,
    viewer: AuthenticatedUser,
  ): Promise<PermissionRole[]> {
    if (!isMainOrganizationUser(viewer)) {
      return this.prisma.permissionRole.findMany({
        where: {
          permissionId,
          role: {
            OR: [
              { organizationScopeId: null },
              { organizationScopeId: viewer.organisationId },
            ],
          },
        },
        include: { role: true },
      });
    }
    return this.prisma.permissionRole.findMany({
      where: { permissionId },
      include: { role: true },
    });
  }

  async link(
    permissionId: string,
    roleId: string,
    viewer: AuthenticatedUser,
  ): Promise<PermissionRole> {
    await this.ensurePermission(permissionId);
    const role = await this.ensureRole(roleId);
    this.assertRoleReadableByViewer(viewer, role.organizationScopeId);
    const exists = await this.prisma.permissionRole.findFirst({
      where: { permissionId, roleId },
    });
    if (exists) {
      throw new BadRequestException('Cette permission est déjà assignée au rôle');
    }
    const row = await this.prisma.permissionRole.create({
      data: {
        permission: { connect: { id: permissionId } },
        role: { connect: { id: roleId } },
      },
    });
    await this.publishAccessChangedForRoles([roleId]);
    return row;
  }

  async unlink(
    permissionId: string,
    roleId: string,
    viewer: AuthenticatedUser,
  ): Promise<PermissionRole> {
    const role = await this.ensureRole(roleId);
    this.assertRoleReadableByViewer(viewer, role.organizationScopeId);
    const row = await this.prisma.permissionRole.findFirst({
      where: { permissionId, roleId },
    });
    if (!row) {
      throw new NotFoundException('Liaison permission / rôle introuvable');
    }
    await this.prisma.permissionRole.delete({ where: { id: row.id } });
    await this.publishAccessChangedForRoles([roleId]);
    return row;
  }

  private async ensurePermission(id: string): Promise<void> {
    const p = await this.prisma.permission.findUnique({ where: { id } });
    if (!p) {
      throw new NotFoundException('Permission introuvable');
    }
  }

  private async ensureRole(
    id: string,
  ): Promise<{ id: string; organizationScopeId: string | null }> {
    const r = await this.prisma.role.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException('Rôle introuvable');
    }
    return { id: r.id, organizationScopeId: r.organizationScopeId };
  }
}
