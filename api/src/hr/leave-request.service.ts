import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, type Prisma } from '../generated/prisma/client';
import type {
  CreateLeaveRequestDto,
  UpdateLeaveRequestStatusDto,
} from './dto/leave-request.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import { LeaveBalanceService } from './leave-balance.service';
import {
  countInclusiveLeaveDays,
  getLeaveYear,
  formatLeaveYearLabel,
} from './leave-balance.rules';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

const leaveInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, organizationId: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
  ) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number },
  ): Promise<
    PaginatedResult<
      Prisma.LeaveRequestGetPayload<{ include: typeof leaveInclude }>
    >
  > {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.LeaveRequestWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: leaveInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: leaveInclude,
    });
    if (!row) {
      throw new NotFoundException('Demande de congé introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateLeaveRequestDto, viewer: AuthenticatedUser) {
    this.assertValidDateRange(dto.startDate, dto.endDate);
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    const days = countInclusiveLeaveDays(dto.startDate, dto.endDate);
    await this.leaveBalanceService.ensureForEmployee(
      employee.id,
      viewer,
      dto.startDate,
    );
    const leaveYear = getLeaveYear(dto.startDate);
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: { employeeId: employee.id, year: leaveYear },
      },
    });
    if (balance) {
      const remaining = balance.totalDays - balance.usedDays;
      if (days > remaining) {
        throw new BadRequestException(
          `Solde insuffisant sur l’exercice ${formatLeaveYearLabel(leaveYear)} : ${Math.max(0, remaining)} jour(s) disponible(s), ${days} demandé(s).`,
        );
      }
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reason: dto.reason?.trim() || null,
        status: LeaveStatus.PENDING,
      },
      include: leaveInclude,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateLeaveRequestStatusDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOne(id, viewer);
    if (row.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        'Seules les demandes en attente peuvent changer de statut.',
      );
    }
    const approverEmployeeId = await this.resolveApproverEmployeeId(viewer);

    if (dto.status === 'APPROVED') {
      await this.leaveBalanceService.reserveLeaveDays(
        row.employeeId,
        row.organizationId,
        row.startDate,
        row.endDate,
        viewer,
      );
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status as LeaveStatus,
        approvedById:
          dto.status === 'APPROVED' || dto.status === 'REJECTED'
            ? approverEmployeeId
            : null,
      },
      include: leaveInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.leaveRequest.delete({ where: { id } });
    return row;
  }

  private assertValidDateRange(start: Date, end: Date): void {
    if (end.getTime() < start.getTime()) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début.',
      );
    }
  }

  /** Lien optionnel User → Employee pour tracer l’approbateur métier. */
  private async resolveApproverEmployeeId(
    viewer: AuthenticatedUser,
  ): Promise<string | null> {
    const linked = await this.prisma.employee.findUnique({
      where: { userId: viewer.sub },
      select: { id: true },
    });
    return linked?.id ?? null;
  }
}
