import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginAttempt, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<LoginAttempt[]> {
    const where = isMainOrganizationUser(viewer)
      ? {}
      : { user: { organizationId: viewer.organisationId } };
    return this.prisma.loginAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { user: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<LoginAttempt> {
    const row = await this.prisma.loginAttempt.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!row) {
      throw new NotFoundException('Tentative de connexion introuvable');
    }
    if (!isMainOrganizationUser(viewer)) {
      if (
        !row.userId ||
        row.user?.organizationId !== viewer.organisationId
      ) {
        throw new ForbiddenException(
          'Accès limité aux données de votre organisation.',
        );
      }
    }
    return row;
  }

  async findByUserId(
    userId: string,
    viewer: AuthenticatedUser,
  ): Promise<LoginAttempt[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.LoginAttemptCreateInput): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({ data });
  }
}
