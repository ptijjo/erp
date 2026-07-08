import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmployeeSanctionType,
  EmployeeStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateEmployeeSanctionDto,
  UpdateEmployeeSanctionDto,
} from './dto/employee-sanction.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

const sanctionInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, organizationId: true },
  },
  decidedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class EmployeeSanctionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<
    PaginatedResult<
      Prisma.EmployeeSanctionGetPayload<{ include: typeof sanctionInclude }>
    >
  > {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.EmployeeSanctionWhereInput = {
      ...('organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {}),
      ...(paginationInput.employeeId
        ? { employeeId: paginationInput.employeeId }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.employeeSanction.findMany({
        where,
        orderBy: { startDate: 'desc' },
        include: sanctionInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.employeeSanction.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.employeeSanction.findUnique({
      where: { id },
      include: sanctionInclude,
    });
    if (!row) {
      throw new NotFoundException('Sanction introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateEmployeeSanctionDto, viewer: AuthenticatedUser) {
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    this.assertValidRange(dto.startDate, dto.endDate);
    const decidedById = await this.resolveAuthorEmployeeId(viewer);

    const sanction = await this.prisma.employeeSanction.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        type: dto.type as EmployeeSanctionType,
        reason: dto.reason.trim(),
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        note: dto.note?.trim() || null,
        decidedById,
      },
      include: sanctionInclude,
    });

    if (dto.type === EmployeeSanctionType.SUSPENSION) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { status: EmployeeStatus.SUSPENDED },
      });
    }

    return sanction;
  }

  async update(
    id: string,
    dto: UpdateEmployeeSanctionDto,
    viewer: AuthenticatedUser,
  ) {
    const existing = await this.findOne(id, viewer);
    const nextStart = dto.startDate ?? existing.startDate;
    const nextEnd =
      dto.endDate !== undefined ? dto.endDate : existing.endDate;
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      this.assertValidRange(nextStart, nextEnd ?? undefined);
    }
    return this.prisma.employeeSanction.update({
      where: { id },
      data: {
        ...(dto.type !== undefined
          ? { type: dto.type as EmployeeSanctionType }
          : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason.trim() } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
      include: sanctionInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.employeeSanction.delete({ where: { id } });
    return row;
  }

  private assertValidRange(start: Date, end?: Date): void {
    if (end && end.getTime() < start.getTime()) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début.',
      );
    }
  }

  private async resolveAuthorEmployeeId(
    viewer: AuthenticatedUser,
  ): Promise<string | null> {
    const linked = await this.prisma.employee.findUnique({
      where: { userId: viewer.sub },
      select: { id: true },
    });
    return linked?.id ?? null;
  }
}
