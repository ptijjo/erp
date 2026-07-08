import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationType, Role } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { isFullAccessRoleName } from '../casl/define-ability';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { roleNameScopeWhere } from './role-scope.util';

const roleListInclude = {
  organizationScope: {
    select: {
      id: true,
      name: true,
      slug: true,
      organizationType: true,
    },
  },
  pole: { select: { id: true, name: true, code: true } },
} as const;

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste des rôles : même logique que les utilisateurs (cf. `UserService`).
   * — Rôles plein accès : maison mère → tous les rôles ; filiale → rôles scoppés à l’org.
   * — Sinon : rôles de l’organisation du viewer ; à la maison mère, si le JWT a un `poleCode`,
   *   seulement les rôles rattachés à ce pôle (exclut ADMIN, DG hors pôle, autres directions).
   */
  private buildRoleListWhere(viewer: AuthenticatedUser): Prisma.RoleWhereInput {
    if (isFullAccessRoleName(viewer.role.name)) {
      if (isMainOrganizationUser(viewer)) {
        return {};
      }
      return { organizationScopeId: viewer.organisationId };
    }

    const sameOrganization: Prisma.RoleWhereInput = {
      organizationScopeId: viewer.organisationId,
    };

    const poleCode = viewer.role.poleCode;
    if (
      isMainOrganizationUser(viewer) &&
      poleCode != null &&
      poleCode !== ''
    ) {
      return {
        ...sameOrganization,
        pole: { code: poleCode },
      };
    }

    return sameOrganization;
  }

  private assertRoleReadableByViewer(
    viewer: AuthenticatedUser,
    role: Role & { pole: { code: string } | null },
  ): void {
    if (isFullAccessRoleName(viewer.role.name)) {
      if (!isMainOrganizationUser(viewer)) {
        if (role.organizationScopeId !== viewer.organisationId) {
          throw new ForbiddenException(
            'Accès limité aux rôles de votre organisation.',
          );
        }
      }
      return;
    }
    if (role.organizationScopeId !== viewer.organisationId) {
      throw new ForbiddenException(
        'Accès limité aux rôles de votre organisation.',
      );
    }

    const viewerPoleCode = viewer.role.poleCode;
    if (
      isMainOrganizationUser(viewer) &&
      viewerPoleCode != null &&
      viewerPoleCode !== ''
    ) {
      const rolePoleCode = role.pole?.code ?? null;
      if (rolePoleCode !== viewerPoleCode) {
        throw new ForbiddenException(
          'Accès limité aux rôles de votre pôle.',
        );
      }
    }
  }

  public getAllRoles = async (viewer: AuthenticatedUser) => {
    const where = this.buildRoleListWhere(viewer);
    return await this.prisma.role.findMany({
      where,
      include: roleListInclude,
      orderBy: [{ organizationScope: { name: 'asc' } }, { name: 'asc' }],
    });
  };

  public getRoleById = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { pole: { select: { code: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    this.assertRoleReadableByViewer(viewer, role);
    return role as Role;
  };

  public createRole = async (
    data: CreateRoleDto,
    viewer: AuthenticatedUser,
  ): Promise<Role> => {
    const effectiveOrganizationScopeId = isMainOrganizationUser(viewer)
      ? isFullAccessRoleName(viewer.role.name)
        ? data.organizationScopeId
        : viewer.organisationId
      : viewer.organisationId;

    const scopeIdForUnique = effectiveOrganizationScopeId ?? null;
    const existingRole = await this.prisma.role.findFirst({
      where: roleNameScopeWhere(data.name, scopeIdForUnique),
    });
    if (existingRole) {
      throw new BadRequestException(
        'Un rôle avec ce nom existe déjà pour cette organisation',
      );
    }

    let scopeOrgType: OrganizationType | null = null;
    if (effectiveOrganizationScopeId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: effectiveOrganizationScopeId },
        select: { organizationType: true },
      });
      if (!org) {
        throw new BadRequestException('Organisation de périmètre introuvable');
      }
      scopeOrgType = org.organizationType;
    }

    if (scopeOrgType === OrganizationType.MAIN) {
      if (!data.poleId) {
        throw new BadRequestException(
          'Pour la maison mère (VIFAA), un pôle est obligatoire lors de la création du rôle.',
        );
      }
      const pole = await this.prisma.pole.findUnique({
        where: { id: data.poleId },
      });
      if (!pole) {
        throw new NotFoundException('Pôle introuvable');
      }
      if (
        !isFullAccessRoleName(viewer.role.name) &&
        viewer.role.poleCode != null &&
        viewer.role.poleCode !== '' &&
        pole.code !== viewer.role.poleCode
      ) {
        throw new ForbiddenException(
          'Vous ne pouvez créer des rôles que pour votre pôle.',
        );
      }
    } else if (data.poleId) {
      throw new BadRequestException(
        'Un pôle ne peut être défini que pour un rôle dont le périmètre est la maison mère.',
      );
    }

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
        ...(scopeOrgType === OrganizationType.MAIN && data.poleId
          ? { pole: { connect: { id: data.poleId } } }
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
      include: { pole: { select: { code: true } } },
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
      const existingRoleWithSameName = await this.prisma.role.findFirst({
        where: roleNameScopeWhere(data.name, existingRole.organizationScopeId),
      });
      if (existingRoleWithSameName && existingRoleWithSameName.id !== id) {
        throw new BadRequestException(
          'Un rôle avec ce nom existe déjà pour cette organisation',
        );
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
      include: { pole: { select: { code: true } } },
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
