import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/client';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { isFullAccessRoleName } from '../casl/define-ability';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  public getAllRoles = async (): Promise<Role[]> => {
    return await this.prisma.role.findMany();
  };

  public getRoleById = async (id: string): Promise<Role> => {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  };

  public createRole = async (data: CreateRoleDto): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existingRole) {
      throw new BadRequestException('Role already exists');
    }
    return await this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        ...(data.organizationScopeId
          ? {
              organizationScope: {
                connect: { id: data.organizationScopeId },
              },
            }
          : {}),
      },
    });
  };

  public updateRole = async (
    id: string,
    data: UpdateRoleDto,
  ): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
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

  public deleteRole = async (id: string): Promise<Role> => {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
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
