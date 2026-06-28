import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import {
  assertUserTargetInPoleScope,
  mainOrgUserListPoleFilter,
} from '../auth/pole-scope';
import { isFullAccessRoleName } from '../casl/define-ability';
import type { Prisma } from '../generated/prisma/client';
import type {
  SafeUserDetail,
  SafeUserPublic,
  SafeUserWithRole,
  SafeUserWithRoleAndOrg,
  UserWithRole,
  UserWithRoleAndOrg,
} from './user.types';
import { OrganizationType } from '../generated/prisma/client';

export type {
  SafeUserDetail,
  SafeUserPublic,
  SafeUserWithRole,
  SafeUserWithRoleAndOrg,
  UserWithRole,
  UserWithRoleAndOrg,
} from './user.types';

@Injectable()
export class UserService {
  static readonly sessionInclude = {
    role: { include: { pole: { select: { code: true } } } },
    organization: {
      select: {
        id: true,
        name: true,
        slug: true,
        organizationType: true,
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Filtre liste utilisateurs : filiales = **toujours** l’organisation du JWT (jamais de liste globale).
   * Maison mère : rôles plein accès = toutes orgs ; sinon = org du viewer seulement,
   * et si le JWT porte un `poleCode`, uniquement les utilisateurs dont le rôle est rattaché à ce pôle.
   */
  private buildUserListWhere(viewer: AuthenticatedUser): Prisma.UserWhereInput {
    if (!isMainOrganizationUser(viewer)) {
      return { organizationId: viewer.organisationId };
    }
    return mainOrgUserListPoleFilter(viewer);
  }

  /** Lecture / écriture sur une fiche utilisateur : même périmètre que `buildUserListWhere`. */
  private userTargetInViewerScope(
    viewer: AuthenticatedUser,
    target: {
      organizationId: string;
      role: { pole: { code: string } | null };
    },
  ): boolean {
    try {
      assertUserTargetInPoleScope(viewer, target);
      return true;
    } catch {
      return false;
    }
  }

  /** Rôle avec périmètre org : filiales = rôle strictement scoppé à leur id ; maison mère = scope null ou égal à l’org cible. */
  private async assertRoleAllowedForOrganization(
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    const [role, org] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId } }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { organizationType: true },
      }),
    ]);
    if (!role) {
      throw new NotFoundException('Rôle non trouvé');
    }
    if (!org) {
      throw new NotFoundException('Organisation non trouvée');
    }

    if (org.organizationType === OrganizationType.SUBSIDIARY) {
      if (role.organizationScopeId !== organizationId) {
        throw new BadRequestException(
          'Pour une filiale, le rôle doit être défini pour cette organisation uniquement (pas de rôle global maison mère).',
        );
      }
      return;
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

  /** Utilisateur maison mère : le rôle doit être rattaché à un pôle (pas ADMIN / DG hors pôle). */
  private async assertMainOrgUserHasPoleRole(
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    const [role, org] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: roleId } }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { organizationType: true },
      }),
    ]);
    if (!role || !org) {
      return;
    }
    if (org.organizationType !== OrganizationType.MAIN) {
      return;
    }
    if (!role.poleId) {
      throw new BadRequestException(
        'Pour la maison mère (VIFAA), choisissez un rôle rattaché au pôle sélectionné.',
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
      include: UserService.sessionInclude,
    });
  }

  /** Session / refresh : charge l’utilisateur par id (même forme que `findUser`). */
  async findUserByIdWithRoleAndOrg(
    id: string,
  ): Promise<UserWithRoleAndOrg | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: UserService.sessionInclude,
    });
  }

  public findAll = async (
    viewer: AuthenticatedUser,
  ): Promise<SafeUserPublic[]> => {
    const where = this.buildUserListWhere(viewer);
    const users = await this.prisma.user.findMany({
      where,
      include: {
        organization: true,
        role: {
          include: {
            pole: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    return users.map(({ password: _p, ...rest }): SafeUserPublic => rest);
  };

  public findOne = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserDetail> => {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        role: {
          include: {
            pole: { select: { id: true, code: true, name: true } },
          },
        },
        organization: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (
      !this.userTargetInViewerScope(viewer, {
        organizationId: user.organizationId,
        role: user.role,
      })
    ) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const { password: _p, ...rest } = user;

    const creationEntry = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'User',
        entityId: id,
        action: 'CREATE',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    const createdBy =
      creationEntry?.user != null
        ? {
            id: creationEntry.user.id,
            email: creationEntry.user.email,
          }
        : null;

    return { ...rest, createdBy };
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
    await this.assertMainOrgUserHasPoleRole(user.roleId, effectiveOrgId);
    await this.assertRoleNotAdminViaApi(user.roleId);
    const firstName =
      user.firstName !== undefined && user.firstName.trim() !== ''
        ? user.firstName.trim()
        : undefined;
    const lastName =
      user.lastName !== undefined && user.lastName.trim() !== ''
        ? user.lastName.trim()
        : undefined;
    const newUser = await this.prisma.user.create({
      data: {
        email: user.email,
        password: await bcrypt.hash(
          user.password,
          Number(process.env.PASSWORD_ROUNDS),
        ),
        firstName,
        lastName,
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
      include: {
        role: { include: { pole: { select: { code: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (
      !this.userTargetInViewerScope(viewer, {
        organizationId: existingUser.organizationId,
        role: existingUser.role,
      })
    ) {
      throw new ForbiddenException(
        'Accès limité aux utilisateurs visibles pour votre périmètre (organisation / pôle).',
      );
    }
    const nextOrganizationId = isMainOrganizationUser(viewer)
      ? (user.organizationId ?? existingUser.organizationId)
      : existingUser.organizationId;
    const nextRoleId = user.roleId ?? existingUser.roleId;
    if (user.roleId !== undefined) {
      await this.assertRoleNotAdminViaApi(user.roleId);
    }
    await this.assertRoleAllowedForOrganization(nextRoleId, nextOrganizationId);
    await this.assertMainOrgUserHasPoleRole(nextRoleId, nextOrganizationId);
    const nextFirstName =
      user.firstName === undefined
        ? undefined
        : user.firstName.trim() === ''
          ? null
          : user.firstName.trim();
    const nextLastName =
      user.lastName === undefined
        ? undefined
        : user.lastName.trim() === ''
          ? null
          : user.lastName.trim();
    const nextProfilePhotoUrl =
      user.profilePhotoUrl === undefined
        ? undefined
        : user.profilePhotoUrl === null ||
            user.profilePhotoUrl.trim() === ''
          ? null
          : user.profilePhotoUrl.trim();
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
        firstName: nextFirstName,
        lastName: nextLastName,
        profilePhotoUrl: nextProfilePhotoUrl,
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
      include: {
        role: { include: { pole: { select: { code: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (
      !this.userTargetInViewerScope(viewer, {
        organizationId: existingUser.organizationId,
        role: existingUser.role,
      })
    ) {
      throw new ForbiddenException(
        'Accès limité aux utilisateurs visibles pour votre périmètre (organisation / pôle).',
      );
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
