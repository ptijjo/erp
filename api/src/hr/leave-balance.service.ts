import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { LeaveBalance, Prisma } from '../generated/prisma/client';
import type {
  CreateLeaveBalanceDto,
  UpdateLeaveBalanceDto,
} from './dto/leave-balance.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';
import {
  computeRemainingDays,
  computeTotalDaysForLeaveYear,
  countInclusiveLeaveDays,
  formatLeaveYearLabel,
  getLeaveYear,
  LEAVE_ANNUAL_ENTITLEMENT_DAYS,
  type LeaveBalanceRow,
} from './leave-balance.rules';

const balanceInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

export type LeaveBalanceView = LeaveBalance & {
  remainingDays: number;
  carriedOverDays: number;
  periodLabel: string;
};

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<PaginatedResult<LeaveBalanceView>> {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.LeaveBalanceWhereInput = {
      ...(paginationInput.employeeId
        ? { employeeId: paginationInput.employeeId }
        : {}),
      ...('organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.leaveBalance.findMany({
        where,
        orderBy: [{ year: 'desc' }, { employeeId: 'asc' }],
        include: balanceInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.leaveBalance.count({ where }),
    ]);
    return {
      items: items.map((row) => this.toView(row)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<LeaveBalanceView> {
    const row = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: balanceInclude,
    });
    if (!row) {
      throw new NotFoundException('Solde de congés introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return this.toView(row);
  }

  /**
   * Crée ou récupère le solde de l’exercice en cours (30 j + cumul, renouvellement en mai).
   */
  async ensureForEmployee(
    employeeId: string,
    viewer: AuthenticatedUser,
    referenceDate: Date = new Date(),
  ): Promise<LeaveBalanceView> {
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      employeeId,
      viewer,
    );
    const leaveYear = getLeaveYear(referenceDate);
    const balances = await this.listBalancesForEmployee(employee.id);
    const existing = balances.find((b) => b.year === leaveYear);
    if (existing) {
      const full = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_year: {
            employeeId: employee.id,
            year: leaveYear,
          },
        },
        include: balanceInclude,
      });
      if (full) {
        return this.toView(full);
      }
    }

    const totalDays = computeTotalDaysForLeaveYear(balances, leaveYear);
    try {
      const created = await this.prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          organizationId: employee.organizationId,
          year: leaveYear,
          totalDays,
          usedDays: 0,
        },
        include: balanceInclude,
      });
      return this.toView(created);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        const row = await this.prisma.leaveBalance.findUnique({
          where: {
            employeeId_year: {
              employeeId: employee.id,
              year: leaveYear,
            },
          },
          include: balanceInclude,
        });
        if (row) {
          return this.toView(row);
        }
      }
      throw e;
    }
  }

  async create(
    dto: CreateLeaveBalanceDto,
    viewer: AuthenticatedUser,
  ): Promise<LeaveBalanceView> {
    if (dto.totalDays === undefined && dto.year === undefined) {
      return this.ensureForEmployee(dto.employeeId, viewer);
    }

    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    const leaveYear =
      dto.year ?? getLeaveYear(new Date());
    const balances = await this.listBalancesForEmployee(employee.id);
    const existing = balances.find((b) => b.year === leaveYear);
    if (existing) {
      throw new ConflictException(
        `Un solde existe déjà pour l’exercice ${formatLeaveYearLabel(leaveYear)}.`,
      );
    }

    const totalDays =
      dto.totalDays ??
      computeTotalDaysForLeaveYear(balances, leaveYear);

    try {
      const created = await this.prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          organizationId: employee.organizationId,
          year: leaveYear,
          totalDays,
          usedDays: dto.usedDays ?? 0,
        },
        include: balanceInclude,
      });
      return this.toView(created);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un solde existe déjà pour cet employé et cet exercice.',
        );
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateLeaveBalanceDto,
    viewer: AuthenticatedUser,
  ) {
    const current = await this.findOne(id, viewer);
    if (
      dto.totalDays !== undefined &&
      dto.totalDays < current.usedDays
    ) {
      throw new BadRequestException(
        'Le quota total ne peut pas être inférieur aux jours déjà utilisés.',
      );
    }
    const updated = await this.prisma.leaveBalance.update({
      where: { id },
      data: {
        ...(dto.totalDays !== undefined ? { totalDays: dto.totalDays } : {}),
        ...(dto.usedDays !== undefined ? { usedDays: dto.usedDays } : {}),
      },
      include: balanceInclude,
    });
    return this.toView(updated);
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.leaveBalance.delete({ where: { id } });
    return row;
  }

  /** Solde disponible sur l’exercice couvrant `startDate` (crée le solde si besoin). */
  async reserveLeaveDays(
    employeeId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    viewer: AuthenticatedUser,
  ): Promise<void> {
    const days = countInclusiveLeaveDays(startDate, endDate);
    if (days <= 0) {
      throw new BadRequestException('Durée de congé invalide.');
    }

    await this.ensureForEmployee(employeeId, viewer, startDate);
    const leaveYear = getLeaveYear(startDate);
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: { employeeId, year: leaveYear },
      },
    });
    if (!balance || balance.organizationId !== organizationId) {
      throw new NotFoundException('Solde de congés introuvable pour cet exercice.');
    }

    const remaining = computeRemainingDays(balance);
    if (days > remaining) {
      throw new BadRequestException(
        `Solde insuffisant : ${remaining} jour(s) disponible(s) sur l’exercice ${formatLeaveYearLabel(leaveYear)}, ${days} demandé(s). Les congés se cumulent d’un exercice à l’autre (renouvellement chaque mois de mai, ${LEAVE_ANNUAL_ENTITLEMENT_DAYS} j/an).`,
      );
    }

    await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { usedDays: balance.usedDays + days },
    });
  }

  /** Réintègre des jours consommés (annulation / refus après approbation). */
  async releaseLeaveDays(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const days = countInclusiveLeaveDays(startDate, endDate);
    if (days <= 0) {
      return;
    }
    const leaveYear = getLeaveYear(startDate);
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: { employeeId, year: leaveYear },
      },
    });
    if (!balance) {
      return;
    }
    await this.prisma.leaveBalance.update({
      where: { id: balance.id },
      data: {
        usedDays: Math.max(0, balance.usedDays - days),
      },
    });
  }

  private async listBalancesForEmployee(
    employeeId: string,
  ): Promise<LeaveBalanceRow[]> {
    return this.prisma.leaveBalance.findMany({
      where: { employeeId },
      select: { year: true, totalDays: true, usedDays: true },
      orderBy: { year: 'asc' },
    });
  }

  private toView(row: LeaveBalance): LeaveBalanceView {
    const carriedOverDays = Math.max(
      0,
      row.totalDays - LEAVE_ANNUAL_ENTITLEMENT_DAYS,
    );
    return {
      ...row,
      remainingDays: computeRemainingDays(row),
      carriedOverDays,
      periodLabel: formatLeaveYearLabel(row.year),
    };
  }
}
