import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import type {
  SafeUserPublic,
  SafeUserWithRole,
  UserWithRole,
} from './user.types';

export type {
  SafeUserPublic,
  SafeUserWithRole,
  UserWithRole,
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

  async findUser(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        role: true,
      },
    });
  }

  public findAll = async (): Promise<SafeUserPublic[]> => {
    const users = await this.prisma.user.findMany({
      include: {
        organization: true,
        role: true,
      },
    });
    return users.map(({ password: _p, ...rest }): SafeUserPublic => rest);
  };

  public findOne = async (id: string): Promise<SafeUserWithRole> => {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: { role: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const { password: _p, ...rest } = user;
    return rest;
  };

  public create = async (
    user: CreateUserDto,
    organizationId: string,
  ): Promise<SafeUserWithRole> => {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });
    if (existingUser) {
      throw new ConflictException('Utilisateur déjà existant');
    }
    await this.assertRoleAllowedForOrganization(user.roleId, organizationId);
    await this.assertRoleNotAdminViaApi(user.roleId);
    const newUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: await bcrypt.hash(
          user.password,
          Number(process.env.PASSWORD_ROUNDS),
        ),
        organizationId,
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
  ): Promise<SafeUserWithRole> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const nextOrganizationId =
      user.organizationId ?? existingUser.organizationId;
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
        organizationId: user.organizationId
          ? user.organizationId
          : existingUser.organizationId,
        roleId: user.roleId ?? undefined,
      },
      include: { role: true },
    });
    const { password: _p, ...rest } = updatedUser;
    return rest;
  };

  public delete = async (
    id: string,
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
