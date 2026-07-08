import {
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
import {
  EmployeeDepartureReason,
  EmployeeStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateEmployeeDepartureDto,
  UpdateEmployeeDepartureDto,
} from './dto/employee-departure.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

const departureInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, organizationId: true },
  },
  recordedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class EmployeeDepartureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<
    PaginatedResult<
      Prisma.EmployeeDepartureGetPayload<{ include: typeof departureInclude }>
    >
  > {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.EmployeeDepartureWhereInput = {
      ...('organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {}),
      ...(paginationInput.employeeId
        ? { employeeId: paginationInput.employeeId }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.employeeDeparture.findMany({
        where,
        orderBy: { departureDate: 'desc' },
        include: departureInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.employeeDeparture.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.employeeDeparture.findUnique({
      where: { id },
      include: departureInclude,
    });
    if (!row) {
      throw new NotFoundException('Départ introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateEmployeeDepartureDto, viewer: AuthenticatedUser) {
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    const recordedById = await this.resolveAuthorEmployeeId(viewer);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const departure = await tx.employeeDeparture.create({
          data: {
            employeeId: employee.id,
            organizationId: employee.organizationId,
            reason: dto.reason as EmployeeDepartureReason,
            departureDate: dto.departureDate,
            note: dto.note?.trim() || null,
            recordedById,
          },
          include: departureInclude,
        });
        await tx.employee.update({
          where: { id: employee.id },
          data: {
            status: EmployeeStatus.TERMINATED,
            terminationDate: dto.departureDate,
          },
        });
        return departure;
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un départ est déjà enregistré pour cet employé.',
        );
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateEmployeeDepartureDto,
    viewer: AuthenticatedUser,
  ) {
    const existing = await this.findOne(id, viewer);
    return this.prisma.$transaction(async (tx) => {
      const departure = await tx.employeeDeparture.update({
        where: { id },
        data: {
          ...(dto.reason !== undefined
            ? { reason: dto.reason as EmployeeDepartureReason }
            : {}),
          ...(dto.departureDate !== undefined
            ? { departureDate: dto.departureDate }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        },
        include: departureInclude,
      });
      if (dto.departureDate !== undefined) {
        await tx.employee.update({
          where: { id: existing.employeeId },
          data: { terminationDate: dto.departureDate },
        });
      }
      return departure;
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.$transaction(async (tx) => {
      await tx.employeeDeparture.delete({ where: { id } });
      await tx.employee.update({
        where: { id: row.employeeId },
        data: { status: EmployeeStatus.ACTIVE, terminationDate: null },
      });
    });
    return row;
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
