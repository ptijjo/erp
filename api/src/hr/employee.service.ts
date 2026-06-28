import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import {
  assertMainOrgPoleDomain,
  POLE_DOMAIN,
} from '../auth/pole-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmployeeStatus,
  type Prisma,
} from '../generated/prisma/client';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import {
  assertDepartmentInViewerScope,
  assertEmployeeInViewerScope,
  resolveTargetOrganizationId,
} from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';
import { LeaveBalanceService } from './leave-balance.service';

const employeeInclude = {
  department: { select: { id: true, name: true } },
  manager: {
    select: { id: true, firstName: true, lastName: true },
  },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
  ) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; search?: string },
  ): Promise<
    PaginatedResult<
      Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>
    >
  > {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.HR);
    }
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.EmployeeWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    const q = paginationInput.search?.trim();
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: employeeInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });
    if (!row) {
      throw new NotFoundException('Employé introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateEmployeeDto, viewer: AuthenticatedUser) {
    const organizationId = resolveTargetOrganizationId(
      viewer,
      dto.organizationId,
    );
    await this.validateDepartmentId(dto.departmentId, organizationId, viewer);
    await this.validateManagerId(dto.managerId, organizationId, viewer);
    await this.validateUserLink(dto.userId, organizationId, undefined);

    const created = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        position: dto.position?.trim() || null,
        status: (dto.status as EmployeeStatus) ?? EmployeeStatus.ACTIVE,
        hireDate: dto.hireDate,
        terminationDate: dto.terminationDate ?? null,
        organizationId,
        departmentId: dto.departmentId ?? null,
        managerId: dto.managerId ?? null,
        userId: dto.userId ?? null,
      },
      include: employeeInclude,
    });

    await this.leaveBalanceService.ensureForEmployee(
      created.id,
      viewer,
      dto.hireDate,
    );

    return created;
  }

  async update(id: string, dto: UpdateEmployeeDto, viewer: AuthenticatedUser) {
    const existing = await assertEmployeeInViewerScope(
      this.prisma,
      id,
      viewer,
    );
    if (dto.departmentId) {
      await this.validateDepartmentId(
        dto.departmentId,
        existing.organizationId,
        viewer,
      );
    }
    if (dto.managerId) {
      await this.validateManagerId(
        dto.managerId,
        existing.organizationId,
        viewer,
        id,
      );
    }
    if (dto.userId !== undefined) {
      await this.validateUserLink(
        dto.userId,
        existing.organizationId,
        id,
      );
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined
          ? { firstName: dto.firstName.trim() }
          : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null }
          : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone?.trim() || null }
          : {}),
        ...(dto.position !== undefined
          ? { position: dto.position?.trim() || null }
          : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as EmployeeStatus }
          : {}),
        ...(dto.hireDate !== undefined ? { hireDate: dto.hireDate } : {}),
        ...(dto.terminationDate !== undefined
          ? { terminationDate: dto.terminationDate }
          : {}),
        ...(dto.departmentId !== undefined
          ? { departmentId: dto.departmentId }
          : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
        ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
      },
      include: employeeInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await assertEmployeeInViewerScope(this.prisma, id, viewer);
    await this.prisma.employee.delete({ where: { id } });
    return row;
  }

  private async validateDepartmentId(
    departmentId: string | undefined,
    organizationId: string,
    viewer: AuthenticatedUser,
  ): Promise<void> {
    if (!departmentId) return;
    const dep = await assertDepartmentInViewerScope(
      this.prisma,
      departmentId,
      viewer,
    );
    if (dep.organizationId !== organizationId) {
      throw new BadRequestException(
        'Le département n’appartient pas à la même organisation que l’employé.',
      );
    }
  }

  private async validateManagerId(
    managerId: string | undefined,
    organizationId: string,
    viewer: AuthenticatedUser,
    selfId?: string,
  ): Promise<void> {
    if (!managerId) return;
    if (selfId && managerId === selfId) {
      throw new BadRequestException(
        'Un employé ne peut pas être son propre manager.',
      );
    }
    const manager = await assertEmployeeInViewerScope(
      this.prisma,
      managerId,
      viewer,
    );
    if (manager.organizationId !== organizationId) {
      throw new BadRequestException(
        'Le manager doit appartenir à la même organisation.',
      );
    }
  }

  private async validateUserLink(
    userId: string | null | undefined,
    organizationId: string,
    employeeId: string | undefined,
  ): Promise<void> {
    if (!userId) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    });
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable.');
    }
    if (user.organizationId !== organizationId) {
      throw new BadRequestException(
        'L’utilisateur doit appartenir à la même organisation que l’employé.',
      );
    }
    const linked = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (linked && linked.id !== employeeId) {
      throw new BadRequestException(
        'Cet utilisateur est déjà rattaché à un autre employé.',
      );
    }
  }
}
