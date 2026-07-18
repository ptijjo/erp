import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CloseAccountingPeriodDto,
  ReopenAccountingPeriodDto,
} from './dto/accounting-period.dto';

@Injectable()
export class AccountingPeriodService {
  constructor(private readonly prisma: PrismaService) {}

  async listClosures(viewer: AuthenticatedUser, year?: number) {
    const where =
      year != null
        ? { year }
        : {};
    if (!isMainOrganizationUser(viewer)) {
      return this.prisma.accountingPeriodClosure.findMany({
        where: {
          ...where,
          OR: [
            { organizationId: viewer.organisationId },
            { organizationId: null },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          closedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
    }
    return this.prisma.accountingPeriodClosure.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        closedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async closePeriod(
    dto: CloseAccountingPeriodDto,
    viewer: AuthenticatedUser,
  ) {
    const main = isMainOrganizationUser(viewer);
    const orgId = dto.organizationId?.trim() || null;

    if (!main && orgId !== viewer.organisationId) {
      throw new ForbiddenException(
        'Seule la maison mère peut clôturer une autre organisation.',
      );
    }
    if (!main && orgId === null) {
      throw new ForbiddenException(
        'La clôture groupe est réservée à la maison mère.',
      );
    }
    if (orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });
      if (!org) {
        throw new NotFoundException('Organisation introuvable.');
      }
      assertOrganizationResourceAccess(viewer, org.id);
    }

    const existing = await this.prisma.accountingPeriodClosure.findFirst({
      where: {
        year: dto.year,
        month: dto.month,
        organizationId: orgId,
      },
    });
    if (existing) {
      throw new BadRequestException('Cette période est déjà clôturée.');
    }

    return this.prisma.accountingPeriodClosure.create({
      data: {
        year: dto.year,
        month: dto.month,
        organizationId: orgId,
        closedByUserId: viewer.sub,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        closedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async reopenPeriod(
    dto: ReopenAccountingPeriodDto,
    viewer: AuthenticatedUser,
  ) {
    const main = isMainOrganizationUser(viewer);
    const orgId = dto.organizationId?.trim() || null;

    if (!main && orgId !== viewer.organisationId) {
      throw new ForbiddenException(
        'Seule la maison mère peut rouvrir une autre organisation.',
      );
    }
    if (!main && orgId === null) {
      throw new ForbiddenException(
        'La réouverture groupe est réservée à la maison mère.',
      );
    }
    if (orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });
      if (!org) {
        throw new NotFoundException('Organisation introuvable.');
      }
      assertOrganizationResourceAccess(viewer, org.id);
    }

    const existing = await this.prisma.accountingPeriodClosure.findFirst({
      where: {
        year: dto.year,
        month: dto.month,
        organizationId: orgId,
      },
    });
    if (!existing) {
      throw new BadRequestException('Cette période n’est pas clôturée.');
    }

    await this.prisma.accountingPeriodClosure.delete({
      where: { id: existing.id },
    });

    return {
      year: dto.year,
      month: dto.month,
      organizationId: orgId,
      reopened: true,
    };
  }

  /** Bloque ventes / dépenses / journal si le mois est clôturé (groupe ou filiale). */
  async assertPeriodOpenForDate(
    organizationId: string,
    referenceDate: Date,
  ): Promise<void> {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;

    const closure = await this.prisma.accountingPeriodClosure.findFirst({
      where: {
        year,
        month,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
    if (closure) {
      throw new BadRequestException(
        `La période ${month}/${year} est clôturée : aucune écriture rétroactive n’est autorisée.`,
      );
    }
  }

  async isPeriodClosed(
    organizationId: string,
    year: number,
    month: number,
  ): Promise<boolean> {
    const closure = await this.prisma.accountingPeriodClosure.findFirst({
      where: {
        year,
        month,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
    return closure != null;
  }
}
