import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PermissionRole } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';

@Injectable()
export class PermissionRoleService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.permissionRole.create({
      data: {
        permission: { connect: { id: permissionId } },
        role: { connect: { id: roleId } },
      },
    });
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
