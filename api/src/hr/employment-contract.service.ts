import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmploymentContractStatus,
  EmploymentContractType,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateEmploymentContractDto,
  UpdateEmploymentContractDto,
} from './dto/employment-contract.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

@Injectable()
export class EmploymentContractService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<
    PaginatedResult<
      Prisma.EmploymentContractGetPayload<{
        include: {
          employee: { select: { id: true; firstName: true; lastName: true } };
        };
      }>
    >
  > {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.EmploymentContractWhereInput = {
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
      this.prisma.employmentContract.findMany({
        where,
        orderBy: { startDate: 'desc' },
        include,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.employmentContract.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.employmentContract.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Contrat introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateEmploymentContractDto, viewer: AuthenticatedUser) {
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    return this.prisma.employmentContract.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        type: dto.type as EmploymentContractType,
        status:
          (dto.status as EmploymentContractStatus) ??
          EmploymentContractStatus.ACTIVE,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        note: dto.note?.trim() || null,
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
    dto: UpdateEmploymentContractDto,
    viewer: AuthenticatedUser,
  ) {
    await this.findOne(id, viewer);
    return this.prisma.employmentContract.update({
      where: { id },
      data: {
        ...(dto.type !== undefined
          ? { type: dto.type as EmploymentContractType }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as EmploymentContractStatus }
          : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
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
    await this.prisma.employmentContract.delete({ where: { id } });
    return row;
  }
}
