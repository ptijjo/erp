import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type {
  CreateEmployeeSalaryDto,
  UpdateEmployeeSalaryDto,
} from './dto/employee-salary.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

@Injectable()
export class EmployeeSalaryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<
    PaginatedResult<
      Prisma.EmployeeSalaryGetPayload<{
        include: {
          employee: { select: { id: true; firstName: true; lastName: true } };
        };
      }>
    >
  > {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.EmployeeSalaryWhereInput = {
      ...(paginationInput.employeeId
        ? { employeeId: paginationInput.employeeId }
        : {}),
      ...('organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {}),
    };
    const include = {
      employee: {
        select: { id: true, firstName: true, lastName: true },
      },
    } as const;
    const [items, total] = await Promise.all([
      this.prisma.employeeSalary.findMany({
        where,
        orderBy: { effectiveFrom: 'desc' },
        include,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.employeeSalary.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.employeeSalary.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Salaire introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateEmployeeSalaryDto, viewer: AuthenticatedUser) {
    this.assertValidSalaryPeriod(dto.effectiveFrom, dto.effectiveTo);
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    return this.prisma.employeeSalary.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        amount: dto.amount,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
        label: dto.label?.trim() || null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateEmployeeSalaryDto,
    viewer: AuthenticatedUser,
  ) {
    const existing = await this.findOne(id, viewer);
    const from = dto.effectiveFrom ?? existing.effectiveFrom;
    const to =
      dto.effectiveTo !== undefined ? dto.effectiveTo : existing.effectiveTo;
    this.assertValidSalaryPeriod(from, to ?? undefined);
    return this.prisma.employeeSalary.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.effectiveFrom !== undefined
          ? { effectiveFrom: dto.effectiveFrom }
          : {}),
        ...(dto.effectiveTo !== undefined ? { effectiveTo: dto.effectiveTo } : {}),
        ...(dto.label !== undefined ? { label: dto.label?.trim() || null } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.employeeSalary.delete({ where: { id } });
    return row;
  }

  private assertValidSalaryPeriod(from: Date, to?: Date): void {
    if (to && to.getTime() < from.getTime()) {
      throw new BadRequestException(
        'La date de fin de validité doit être postérieure ou égale au début.',
      );
    }
  }
}
