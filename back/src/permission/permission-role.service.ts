import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PermissionRole } from '../generated/prisma/client';

@Injectable()
export class PermissionRoleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PermissionRole[]> {
    return this.prisma.permissionRole.findMany({
      include: { permission: true, role: true },
    });
  }

  async findByRoleId(roleId: string): Promise<PermissionRole[]> {
    return this.prisma.permissionRole.findMany({
      where: { roleId },
      include: { permission: true },
    });
  }

  async findByPermissionId(permissionId: string): Promise<PermissionRole[]> {
    return this.prisma.permissionRole.findMany({
      where: { permissionId },
      include: { role: true },
    });
  }

  async link(permissionId: string, roleId: string): Promise<PermissionRole> {
    await this.ensurePermission(permissionId);
    await this.ensureRole(roleId);
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

  async unlink(permissionId: string, roleId: string): Promise<PermissionRole> {
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

  private async ensureRole(id: string): Promise<void> {
    const r = await this.prisma.role.findUnique({ where: { id } });
    if (!r) {
      throw new NotFoundException('Rôle introuvable');
    }
  }
}
