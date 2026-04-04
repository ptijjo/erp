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
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organizationId: user.organizationId,
      roleId: user.roleId,
      role: user.role,
    };
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
    return {
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
      organizationId: newUser.organizationId,
      roleId: newUser.roleId,
      role: newUser.role,
    };
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
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      organizationId: updatedUser.organizationId,
      roleId: updatedUser.roleId,
      role: updatedUser.role,
    };
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
