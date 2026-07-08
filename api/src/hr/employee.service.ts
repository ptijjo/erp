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
import {
  resolveUserIdForEmployeeLink,
  syncUserProfileFromEmployee,
} from './employee-user-link.util';

const employeeInclude = {
  department: { select: { id: true, name: true } },
  manager: {
    select: { id: true, firstName: true, lastName: true },
  },
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: { select: { name: true } },
    },
  },
} as const;

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalanceService: LeaveBalanceService,
  ) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    },
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
        { position: { contains: q, mode: 'insensitive' } },
        { department: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { role: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    const statusFilter = paginationInput.status?.trim();
    if (statusFilter) {
      where.status = statusFilter as EmployeeStatus;
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

    const email = dto.email?.trim() || undefined;
    const linkedUserId = await resolveUserIdForEmployeeLink(this.prisma, {
      userId: dto.userId,
      email: email ?? null,
      organizationId,
    });

    const created = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: email ?? null,
        phone: dto.phone?.trim() || null,
        position: dto.position?.trim() || null,
        status: (dto.status as EmployeeStatus) ?? EmployeeStatus.ACTIVE,
        hireDate: dto.hireDate,
        terminationDate: dto.terminationDate ?? null,
        organizationId,
        departmentId: dto.departmentId ?? null,
        managerId: dto.managerId ?? null,
        userId: linkedUserId,
      },
      include: employeeInclude,
    });

    if (linkedUserId) {
      await syncUserProfileFromEmployee(
        this.prisma,
        linkedUserId,
        created.firstName,
        created.lastName,
      );
    }

    await this.leaveBalanceService.ensureForEmployee(
      created.id,
      viewer,
      dto.hireDate,
    );

    return this.findOne(created.id, viewer);
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

    const nextFirstName = dto.firstName?.trim() ?? existing.firstName;
    const nextLastName = dto.lastName?.trim() ?? existing.lastName;
    const nextEmail =
      dto.email !== undefined ? dto.email?.trim() || null : existing.email;

    let linkedUserId = existing.userId;
    if (dto.userId !== undefined || dto.email !== undefined) {
      linkedUserId = await resolveUserIdForEmployeeLink(this.prisma, {
        userId: dto.userId !== undefined ? dto.userId : existing.userId,
        email: nextEmail,
        organizationId: existing.organizationId,
        employeeId: id,
      });
    }

    const updated = await this.prisma.employee.update({
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
        ...(dto.userId !== undefined || dto.email !== undefined
          ? { userId: linkedUserId }
          : {}),
      },
      include: employeeInclude,
    });

    if (linkedUserId) {
      await syncUserProfileFromEmployee(
        this.prisma,
        linkedUserId,
        nextFirstName,
        nextLastName,
      );
    }

    return updated;
  }

  /** Crée une fiche employé ACTIVE pour un nouvel utilisateur filiale (si absente). */
  async provisionForNewUser(params: {
    userId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationId: string;
  }) {
    const existing = await this.prisma.employee.findUnique({
      where: { userId: params.userId },
      select: { id: true },
    });
    if (existing) {
      return existing;
    }

    const email = params.email.trim().toLowerCase();
    const byEmail = await this.prisma.employee.findFirst({
      where: {
        organizationId: params.organizationId,
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true, userId: true },
    });
    if (byEmail) {
      if (!byEmail.userId) {
        return this.prisma.employee.update({
          where: { id: byEmail.id },
          data: { userId: params.userId },
        });
      }
      return byEmail;
    }

    const firstName =
      params.firstName?.trim() || email.split('@')[0] || 'Collaborateur';
    const lastName = params.lastName?.trim() || '—';

    return this.prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        status: EmployeeStatus.ACTIVE,
        hireDate: new Date(),
        organizationId: params.organizationId,
        userId: params.userId,
      },
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
}
