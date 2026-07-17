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
import { CreateUserDto, UpdateMyProfileDto, UpdateUserDto } from './dto/user.dto';
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
import { OrganizationType, SessionCaisseStatut, VenteStatut } from '../generated/prisma/client';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { EmployeeService } from '../hr/employee.service';
import { MessagingAttachmentService } from '../messaging/messaging-attachment.service';
import { AppCacheService } from '../cache/app-cache.service';
import { authUserCacheKey } from '../casl/define-ability';
import type { PaginationQueryDto } from '../lib/pagination-query.dto';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';
import { computePaymentTotals } from '../session-caisse/session-caisse.types';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly objectStorage: R2ObjectStorageService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly employeeService: EmployeeService,
    private readonly cache: AppCacheService,
    private readonly messagingAttachmentService: MessagingAttachmentService,
  ) {}

  private async invalidateUserSessionCache(userId: string): Promise<void> {
    await this.cache.del(authUserCacheKey(userId));
  }

  /**
   * Filtre liste utilisateurs : filiales = **toujours** l’organisation du JWT (jamais de liste globale).
   * Maison mère : rôles plein accès = toutes orgs ; sinon = org du viewer seulement,
   * et si le JWT porte un `poleCode`, uniquement les utilisateurs dont le rôle est rattaché à ce pôle.
   */
  private buildUserListWhere(viewer: AuthenticatedUser): Prisma.UserWhereInput {
    const active: Prisma.UserWhereInput = { deletedAt: null };
    if (!isMainOrganizationUser(viewer)) {
      return { ...active, organizationId: viewer.organisationId };
    }
    return { ...active, ...mainOrgUserListPoleFilter(viewer) };
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
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: UserService.sessionInclude,
    });
  }

  /** Session / refresh : charge l’utilisateur par id (même forme que `findUser`). */
  async findUserByIdWithRoleAndOrg(
    id: string,
  ): Promise<UserWithRoleAndOrg | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: UserService.sessionInclude,
    });
  }

  public findAll = async (
    viewer: AuthenticatedUser,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResult<SafeUserPublic>> => {
    const where = this.buildUserListWhere(viewer);
    const { page, limit } = resolvePagination(query);
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          organization: true,
          role: {
            include: {
              pole: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: [{ organization: { name: 'asc' } }, { email: 'asc' }],
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: users.map(({ password: _p, ...rest }): SafeUserPublic => rest),
      meta: buildPaginationMeta(total, page, limit),
    };
  };

  public findOne = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserDetail> => {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
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
    const org = await this.prisma.organization.findUnique({
      where: { id: effectiveOrgId },
      select: { organizationType: true },
    });
    if (!org) {
      throw new NotFoundException('Organisation introuvable');
    }

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

    if (org.organizationType === OrganizationType.SUBSIDIARY) {
      await this.employeeService.provisionForNewUser({
        userId: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationId: effectiveOrgId,
      });
    }

    const { password: _p, ...rest } = newUser;
    await this.invalidateUserSessionCache(newUser.id);
    return rest;
  };

  public update = async (
    id: string,
    user: UpdateUserDto,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole> => {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
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
    if (
      (user.firstName !== undefined || user.lastName !== undefined) &&
      !isFullAccessRoleName(viewer.role.name)
    ) {
      throw new ForbiddenException(
        'Seuls ADMIN, le directeur général et le directeur des opérations peuvent modifier le prénom et le nom.',
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
      },
      include: { role: true },
    });
    const { password: _p, ...rest } = updatedUser;
    await this.invalidateUserSessionCache(id);
    if (user.roleId !== undefined && user.roleId !== existingUser.roleId) {
      await this.caslAbilityFactory.invalidateRole(existingUser.roleId);
      await this.caslAbilityFactory.invalidateRole(user.roleId);
    }
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
    const existingUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: { include: { pole: { select: { code: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (viewer.sub === id) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte.',
      );
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

    await this.forceCloseOpenSessionsForUser(id, viewer.sub);

    if (existingUser.profilePhotoUrl) {
      await this.objectStorage.deleteByPublicUrl(existingUser.profilePhotoUrl);
    }

    await this.messagingAttachmentService.deleteAllThreadsForUser(id);

    const deletedAt = new Date();
    /** Libère l’email unique pour permettre de recréer un compte avec la même adresse. */
    const freedEmail = `${existingUser.email}.deleted.${deletedAt.getTime()}`;

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt,
        email: freedEmail,
        profilePhotoUrl: null,
      },
    });
    await this.invalidateUserSessionCache(id);
    return {
      id: existingUser.id,
      email: existingUser.email,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
      organizationId: existingUser.organizationId,
      roleId: existingUser.roleId,
    };
  };

  /**
   * Clôture les sessions de caisse encore ouvertes avant soft-delete.
   * Refuse si des ventes brouillon non vides bloquent la clôture.
   */
  private async forceCloseOpenSessionsForUser(
    userId: string,
    closedByUserId: string,
  ): Promise<void> {
    const openSessions = await this.prisma.sessionCaisse.findMany({
      where: {
        userId,
        statut: SessionCaisseStatut.OUVERTE,
      },
      include: {
        ventes: {
          where: { status: VenteStatut.CONFIRMED },
          include: { paiements: true },
        },
      },
    });

    for (const session of openSessions) {
      const draftsWithLines = await this.prisma.vente.count({
        where: {
          sessionCaisseId: session.id,
          status: VenteStatut.DRAFT,
          lines: { some: {} },
        },
      });
      if (draftsWithLines > 0) {
        throw new BadRequestException(
          `Impossible de supprimer : session de caisse ouverte avec ${draftsWithLines} vente(s) en brouillon. Clôturez la caisse d’abord.`,
        );
      }

      await this.prisma.vente.updateMany({
        where: {
          sessionCaisseId: session.id,
          status: VenteStatut.DRAFT,
          lines: { none: {} },
        },
        data: { status: VenteStatut.CANCELLED },
      });

      const totals = computePaymentTotals(session.ventes);
      const fondOuverture = Number(session.fondOuverture);
      const fondCloture = fondOuverture + totals.totalEspecesFcfa;

      await this.prisma.sessionCaisse.update({
        where: { id: session.id },
        data: {
          statut: SessionCaisseStatut.CLOTUREE,
          closedAt: new Date(),
          fondCloture,
          ecartCloture: 0,
          commentaireCloture:
            'Clôturée automatiquement — compte utilisateur désactivé.',
          closedByUserId,
          totalVentesFcfa: totals.totalVentesFcfa,
          totalEspecesFcfa: totals.totalEspecesFcfa,
          totalCarteFcfa: totals.totalCarteFcfa,
          totalMobileMoneyFcfa: totals.totalMobileMoneyFcfa,
          nombreVentes: totals.nombreVentes,
        },
      });
    }
  }

  /**
   * Photo de profil : soi-même, ou modération par un utilisateur avec update:User
   * dans le périmètre org/pôle (ex. admin remplaçant une photo compromettante).
   */
  private async assertProfilePhotoAccess(
    viewer: AuthenticatedUser,
    target: {
      id: string;
      organizationId: string;
      role: { pole: { code: string } | null };
    },
  ): Promise<void> {
    if (viewer.sub === target.id) {
      return;
    }

    const ability = await this.caslAbilityFactory.createForUser(viewer);
    if (!ability.can('update', 'User')) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que votre propre photo de profil.',
      );
    }

    if (
      !this.userTargetInViewerScope(viewer, {
        organizationId: target.organizationId,
        role: target.role,
      })
    ) {
      throw new ForbiddenException(
        'Accès limité aux utilisateurs visibles pour votre périmètre.',
      );
    }
  }

  public uploadProfilePhoto = async (
    id: string,
    file: Express.Multer.File,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole & { profilePhotoUrl: string | null }> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: { include: { pole: { select: { code: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.assertProfilePhotoAccess(viewer, existingUser);

    const processed = await this.imageProcessor.processProfileAvatar(file);
    const key = this.objectStorage.buildProfilePhotoKey(id);
    const uploaded = await this.objectStorage.uploadProfilePhoto(
      key,
      processed,
    );

    if (existingUser.profilePhotoUrl) {
      await this.objectStorage.deleteByPublicUrl(existingUser.profilePhotoUrl);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { profilePhotoUrl: uploaded.publicUrl },
      include: { role: true },
    });

    const { password: _p, ...rest } = updatedUser;
    return rest;
  };

  public removeProfilePhoto = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<SafeUserWithRole & { profilePhotoUrl: string | null }> => {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: { include: { pole: { select: { code: true } } } },
      },
    });
    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.assertProfilePhotoAccess(viewer, existingUser);

    if (existingUser.profilePhotoUrl) {
      await this.objectStorage.deleteByPublicUrl(existingUser.profilePhotoUrl);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { profilePhotoUrl: null },
      include: { role: true },
    });

    const { password: _p, ...rest } = updatedUser;
    return rest;
  };

  public updateMyProfile = async (
    userId: string,
    dto: UpdateMyProfileDto,
  ): Promise<
    SafeUserWithRole & { bio: string | null; profilePhotoUrl: string | null }
  > => {
    if (dto.bio === undefined) {
      throw new BadRequestException('Aucune donnée à mettre à jour.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bio: dto.bio.trim() === '' ? null : dto.bio.trim(),
      },
      include: { role: true },
    });

    const { password: _p, ...rest } = updatedUser;
    await this.invalidateUserSessionCache(userId);
    return rest;
  };
}
