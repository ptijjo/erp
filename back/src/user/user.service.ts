import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import type {
  SafeUserPublic,
  SafeUserWithRole,
  SafeUserWithRoleAndOrg,
  UserWithRole,
  UserWithRoleAndOrg,
} from './user.types';

export type {
  SafeUserPublic,
  SafeUserWithRole,
  SafeUserWithRoleAndOrg,
  UserWithRole,
  UserWithRoleAndOrg,
} from './user.types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rôle avec périmètre org : uniquement pour les utilisateurs de cette organisation. */
  private async assertRoleAllowedForOrganization(
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }
    if (
      role.organizationScopeId !== null &&
      role.organizationScopeId !== organizationId
    ) {
      throw new BadRequestException(
        "Ce rôle est réservé à une autre organisation (maison mère ou périmètre défini).",
      );
    }
  }

  /** Le rôle ADMIN est réservé au seeder / provisionnement, pas à l’API métier. */
  private async assertRoleNotAdminViaApi(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }
    if (role.name === 'ADMIN') {
      throw new BadRequestException(
        'Le rôle ADMIN ne peut être attribué que via le provisionnement initial (seeder).',
      );
    }
  }

  async findUser(email: string): Promise<UserWithRoleAndOrg | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationType: true,
          },
        },
      },
    });
  }

  public findAll = async (
    viewer: AuthenticatedUser,
  ): Promise<SafeUserPublic[]> => {
    const where = isMainOrganizationUser(viewer)
      ? {}
      : { organizationId: viewer.organisationId };
    const users = await this.prisma.user.findMany({
      where,
      include: {
        organization: true,
        role: true,
      },
    });
    return users.map(({ password: _p, ...rest }): SafeUserPublic => rest);
  };

  public findOne = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole> => {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    assertOrganizationResourceAccess(viewer, user.organizationId);
    const { password: _p, ...rest } = user;
    return rest;
  };

  public create = async (
    user: CreateUserDto,
    organizationId: string,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole> => {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });
    if (existingUser) {
      throw new ConflictException('Utilisateur déjà existant');
    }
    const effectiveOrgId = isMainOrganizationUser(viewer)
      ? organizationId
      : viewer.organisationId;
    assertOrganizationResourceAccess(viewer, effectiveOrgId);
    await this.assertRoleAllowedForOrganization(user.roleId, effectiveOrgId);
    await this.assertRoleNotAdminViaApi(user.roleId);
    const newUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: await bcrypt.hash(
          user.password,
          Number(process.env.PASSWORD_ROUNDS),
        ),
        organizationId: effectiveOrgId,
        roleId: user.roleId,
      },
      include: { role: true },
    });
    const { password: _p, ...rest } = newUser;
    return rest;
  };

  public update = async (
    id: string,
    user: UpdateUserDto,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    assertOrganizationResourceAccess(viewer, existingUser.organizationId);
    const nextOrganizationId = isMainOrganizationUser(viewer)
      ? (user.organizationId ?? existingUser.organizationId)
      : existingUser.organizationId;
    const nextRoleId = user.roleId ?? existingUser.roleId;
    if (user.roleId !== undefined) {
      await this.assertRoleNotAdminViaApi(user.roleId);
    }
    await this.assertRoleAllowedForOrganization(nextRoleId, nextOrganizationId);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: user.password
          ? await bcrypt.hash(
              user.password,
              Number(process.env.PASSWORD_ROUNDS),
            )
          : undefined,
        organizationId: nextOrganizationId,
        roleId: user.roleId ?? undefined,
      },
      include: { role: true },
    });
    const { password: _p, ...rest } = updatedUser;
    return rest;
  };

  public delete = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<
    Pick<
      UserWithRole,
      'id' | 'email' | 'createdAt' | 'updatedAt' | 'organizationId' | 'roleId'
    >
  > => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    assertOrganizationResourceAccess(viewer, existingUser.organizationId);
    await this.prisma.user.delete({ where: { id } });
    return {
      id: existingUser.id,
      email: existingUser.email,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      organizationId: existingUser.organizationId,
      roleId: existingUser.roleId,
    };
  };
}
