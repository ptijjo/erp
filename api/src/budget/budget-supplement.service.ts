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
import {
  BudgetLineCategory,
  BudgetLineNature,
  BudgetStatus,
  BudgetSupplementStatus,
} from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import {
  assertCanApproveBudget,
  assertCanReviewSupplementAsFinance,
} from './budget-workflow.util';
import type {
  CreateBudgetSupplementDto,
  RejectBudgetSupplementDto,
  ReviewBudgetSupplementDto,
} from './dto/budget-supplement.dto';

const supplementInclude = {
  budget: {
    select: {
      id: true,
      year: true,
      month: true,
      status: true,
      subsidiaryOrganizationId: true,
      subsidiaryOrganization: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  requestedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  reviewedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  decidedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class BudgetSupplementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const where: Prisma.BudgetSupplementRequestWhereInput =
      isMainOrganizationUser(viewer)
        ? {}
        : {
            budget: {
              subsidiaryOrganizationId: viewer.organisationId,
            },
          };

    return this.prisma.budgetSupplementRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: supplementInclude,
    });
  }

  async create(
    budgetId: string,
    dto: CreateBudgetSupplementDto,
    viewer: AuthenticatedUser,
  ) {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Les demandes de rallonge sont créées par les filiales.',
      );
    }

    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: {
        id: true,
        status: true,
        subsidiaryOrganizationId: true,
      },
    });
    if (!budget) {
      throw new NotFoundException('Budget introuvable');
    }
    if (budget.subsidiaryOrganizationId !== viewer.organisationId) {
      throw new ForbiddenException();
    }
    if (budget.status !== BudgetStatus.APPROVED) {
      throw new BadRequestException(
        'Une demande de rallonge ne concerne qu’un budget déjà validé.',
      );
    }

    return this.prisma.budgetSupplementRequest.create({
      data: {
        budgetId,
        amountRequested: dto.amountRequested,
        reason: dto.reason.trim(),
        requestedByUserId: viewer.sub,
        status: BudgetSupplementStatus.PENDING_FINANCE,
      },
      include: supplementInclude,
    });
  }

  async submitToDirectors(
    id: string,
    dto: ReviewBudgetSupplementDto,
    viewer: AuthenticatedUser,
  ) {
    assertCanReviewSupplementAsFinance(viewer);

    const row = await this.findOneOrThrow(id);
    if (row.status !== BudgetSupplementStatus.PENDING_FINANCE) {
      throw new BadRequestException(
        'Seules les demandes en attente du pôle finance peuvent être transmises.',
      );
    }

    return this.prisma.budgetSupplementRequest.update({
      where: { id },
      data: {
        status: BudgetSupplementStatus.PENDING_APPROVAL,
        financeNote: dto.financeNote?.trim() || null,
        reviewedAt: new Date(),
        reviewedByUserId: viewer.sub,
      },
      include: supplementInclude,
    });
  }

  async approve(id: string, viewer: AuthenticatedUser) {
    assertCanApproveBudget(viewer);

    const row = await this.findOneOrThrow(id);
    if (row.status !== BudgetSupplementStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Seules les demandes transmises à la direction peuvent être approuvées.',
      );
    }

    const budget = row.budget;
    if (budget.status !== BudgetStatus.APPROVED) {
      throw new BadRequestException('Le budget associé n’est plus actif.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.budgetSupplementRequest.update({
        where: { id },
        data: {
          status: BudgetSupplementStatus.APPROVED,
          decidedAt: new Date(),
          decidedByUserId: viewer.sub,
        },
        include: supplementInclude,
      });

      const autreLine = await tx.budgetLine.findFirst({
        where: {
          budgetId: budget.id,
          category: BudgetLineCategory.AUTRE,
        },
      });

      if (autreLine) {
        await tx.budgetLine.update({
          where: { id: autreLine.id },
          data: {
            amountPlanned: {
              increment: row.amountRequested,
            },
          },
        });
      } else {
        await tx.budgetLine.create({
          data: {
            budgetId: budget.id,
            nature: BudgetLineNature.VARIABLE,
            category: BudgetLineCategory.AUTRE,
            label: 'Rallonge budgétaire approuvée',
            amountPlanned: row.amountRequested,
          },
        });
      }

      return updatedRequest;
    });
  }

  async reject(
    id: string,
    dto: RejectBudgetSupplementDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOneOrThrow(id);

    if (row.status === BudgetSupplementStatus.PENDING_FINANCE) {
      assertCanReviewSupplementAsFinance(viewer);
    } else if (row.status === BudgetSupplementStatus.PENDING_APPROVAL) {
      assertCanApproveBudget(viewer);
    } else {
      throw new BadRequestException(
        'Cette demande ne peut plus être refusée.',
      );
    }

    return this.prisma.budgetSupplementRequest.update({
      where: { id },
      data: {
        status: BudgetSupplementStatus.REJECTED,
        rejectionReason: dto.rejectionReason.trim(),
        decidedAt: new Date(),
        decidedByUserId: viewer.sub,
      },
      include: supplementInclude,
    });
  }

  private async findOneOrThrow(id: string) {
    const row = await this.prisma.budgetSupplementRequest.findUnique({
      where: { id },
      include: supplementInclude,
    });
    if (!row) {
      throw new NotFoundException('Demande de rallonge introuvable');
    }
    return row;
  }
}
