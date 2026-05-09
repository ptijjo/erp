import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { isFullAccessRoleName } from '../casl/define-ability';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  private assertRoleReadableByViewer(
    viewer: AuthenticatedUser,
    role: Role,
  ): void {
    if (isMainOrganizationUser(viewer)) {
      return;
    }
    /** Filiale : uniquement les rôles explicitement rattachés à son organisation (pas les rôles globaux / maison mère). */
    if (role.organizationScopeId !== viewer.organisationId) {
      throw new ForbiddenException(
        'Accès limité aux rôles de votre organisation.',
      );
    }
  }

  public getAllRoles = async (viewer: AuthenticatedUser): Promise<Role[]> => {
    if (isMainOrganizationUser(viewer)) {
      return await this.prisma.role.findMany();
    }
    return await this.prisma.role.findMany({
      where: { organizationScopeId: viewer.organisationId },
    });
  };

  public getRoleById = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    this.assertRoleReadableByViewer(viewer, role);
    return role;
  };

  public createRole = async (
    data: CreateRoleDto,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existingRole) {
      throw new BadRequestException('Role already exists');
    }
    const effectiveOrganizationScopeId = isMainOrganizationUser(viewer)
      ? data.organizationScopeId
      : viewer.organisationId;
    return await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        ...(effectiveOrganizationScopeId
          ? {
              organizationScope: {
                connect: { id: effectiveOrganizationScopeId },
              },
            }
          : {}),
      },
    });
  };

  public updateRole = async (
    id: string,
    data: UpdateRoleDto,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
    this.assertRoleReadableByViewer(viewer, existingRole);
    if (data.name && data.name !== existingRole.name) {
      if (isFullAccessRoleName(existingRole.name)) {
        throw new BadRequestException(
          'Le nom de ce rôle système ne peut pas être modifié',
        );
      }
      const existingRoleWithSameName = await this.prisma.role.findUnique({
        where: { name: data.name },
      });
      if (existingRoleWithSameName) {
        throw new BadRequestException('Role with this name already exists');
      }
    }
    return await this.prisma.role.update({ where: { id }, data });
  };

  public deleteRole = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
    this.assertRoleReadableByViewer(viewer, existingRole);
    if (isFullAccessRoleName(existingRole.name)) {
      throw new BadRequestException(
        'Ce rôle système ne peut pas être supprimé',
      );
    }
    const usersCount = await this.prisma.user.count({
      where: { roleId: id },
    });
    if (usersCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce rôle : des utilisateurs y sont encore affectés',
      );
    }
    await this.prisma.permissionRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    return existingRole;
  };
}
