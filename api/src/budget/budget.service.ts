import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertMainOrganizationOnly,
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  BudgetLineCategory,
  OrganizationType,
} from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import type { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

const budgetInclude = {
  subsidiaryOrganization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  lines: true,
} as const;

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const where: Prisma.BudgetWhereInput = isMainOrganizationUser(viewer)
      ? {}
      : {
          subsidiaryOrganizationId: viewer.organisationId,
          status: BudgetStatus.APPROVED,
        };

    return this.prisma.budget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: budgetInclude,
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.budget.findUnique({
      where: { id },
      include: budgetInclude,
    });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }

    assertOrganizationResourceAccess(
      viewer,
      row.subsidiaryOrganizationId,
    );

    if (
      !isMainOrganizationUser(viewer) &&
      row.status !== BudgetStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Seuls les budgets validés sont visibles pour votre organisation.',
      );
    }

    return row;
  }

  async create(dto: CreateBudgetDto, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.subsidiaryOrganizationId },
      select: { organizationType: true },
    });
    if (!org || org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Le budget doit être associé à une organisation filiale.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const budget = await tx.budget.create({
          data: {
            subsidiaryOrganizationId: dto.subsidiaryOrganizationId,
            year: dto.year,
            month: dto.month,
            status: BudgetStatus.DRAFT,
            lines: {
              create: dto.lines.map((line) => ({
                category: line.category as BudgetLineCategory,
                label: line.label.trim(),
                amountPlanned: line.amountPlanned,
              })),
            },
          },
          include: budgetInclude,
        });
        return budget;
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un budget existe déjà pour cette filiale et cette période (mois/année).',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateBudgetDto, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);

    const row = await this.prisma.budget.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (row.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un budget en brouillon peut être modifié.',
      );
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        lines: {
          deleteMany: {},
          create: dto.lines!.map((line) => ({
            category: line.category as BudgetLineCategory,
            label: line.label.trim(),
            amountPlanned: line.amountPlanned,
          })),
        },
      },
      include: budgetInclude,
    });
  }

  async approve(id: string, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);

    const row = await this.prisma.budget.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (row.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException('Ce budget est déjà validé.');
    }

    return this.prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.APPROVED },
      include: budgetInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);

    const row = await this.prisma.budget.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (row.status !== BudgetStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un budget en brouillon peut être supprimé.',
      );
    }

    await this.prisma.budget.delete({ where: { id } });
    return { ok: true as const };
  }
}
