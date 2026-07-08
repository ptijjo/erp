import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { organizationListWhere } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeStatus, type Prisma } from '../generated/prisma/client';
import type { DirectoryEntryDto } from './directory.types';

const employeeInclude = {
  department: { select: { id: true, name: true } },
  organization: { select: { id: true, name: true, slug: true } },
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profilePhotoUrl: true,
      role: {
        select: {
          name: true,
          pole: { select: { code: true, name: true } },
        },
      },
    },
  },
} as const;

const userInclude = {
  organization: { select: { id: true, name: true, slug: true } },
  role: {
    select: {
      name: true,
      pole: { select: { code: true, name: true } },
    },
  },
} as const;

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    viewer: AuthenticatedUser,
    query: string,
    limit = 20,
  ): Promise<DirectoryEntryDto[]> {
    const q = query.trim();
    if (!q) {
      return [];
    }

    const max = Math.min(limit, 50);
    const orgFilter = organizationListWhere(viewer);
    const orgId =
      'organizationId' in orgFilter ? orgFilter.organizationId : undefined;

    const textSearchOr: Prisma.EmployeeWhereInput['OR'] = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { position: { contains: q, mode: 'insensitive' } },
      { department: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { firstName: { contains: q, mode: 'insensitive' } } },
      { user: { lastName: { contains: q, mode: 'insensitive' } } },
      { user: { role: { name: { contains: q, mode: 'insensitive' } } } },
      {
        user: { role: { pole: { name: { contains: q, mode: 'insensitive' } } } },
      },
    ];

    const employeeWhere: Prisma.EmployeeWhereInput = {
      status: EmployeeStatus.ACTIVE,
      ...(orgId ? { organizationId: orgId } : {}),
      OR: textSearchOr,
    };

    const userSearchOr: Prisma.UserWhereInput['OR'] = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { role: { name: { contains: q, mode: 'insensitive' } } },
      { role: { pole: { name: { contains: q, mode: 'insensitive' } } } },
    ];

    const userWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      employee: { is: null },
      ...(orgId ? { organizationId: orgId } : {}),
      OR: userSearchOr,
    };

    const [employees, usersWithoutEmployee] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        include: employeeInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: max,
      }),
      this.prisma.user.findMany({
        where: userWhere,
        include: userInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: max,
      }),
    ]);

    const fromEmployees = employees.map((row) => this.fromEmployee(row));
    const linkedUserIds = new Set(
      fromEmployees.map((e) => e.userId).filter((id): id is string => id != null),
    );
    const fromUsers = usersWithoutEmployee
      .filter((u) => !linkedUserIds.has(u.id))
      .map((row) => this.fromUser(row));

    return [...fromEmployees, ...fromUsers]
      .sort((a, b) => {
        const byLast = a.lastName.localeCompare(b.lastName, 'fr');
        if (byLast !== 0) return byLast;
        return a.firstName.localeCompare(b.firstName, 'fr');
      })
      .slice(0, max);
  }

  private fromEmployee(
    row: Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>,
  ): DirectoryEntryDto {
    return {
      employeeId: row.id,
      userId: row.user?.id ?? null,
      email: row.email ?? row.user?.email ?? null,
      firstName: row.firstName,
      lastName: row.lastName,
      position: row.position,
      status: 'ACTIVE',
      department: row.department,
      organization: row.organization,
      role: row.user?.role ?? null,
      profilePhotoUrl: row.user?.profilePhotoUrl ?? null,
    };
  }

  private fromUser(
    row: Prisma.UserGetPayload<{ include: typeof userInclude }>,
  ): DirectoryEntryDto {
    const firstName = row.firstName?.trim() || row.email.split('@')[0] || '—';
    const lastName = row.lastName?.trim() || '—';
    return {
      employeeId: null,
      userId: row.id,
      email: row.email,
      firstName,
      lastName,
      position: null,
      status: 'ACTIVE',
      department: null,
      organization: row.organization,
      role: row.role,
      profilePhotoUrl: row.profilePhotoUrl,
    };
  }
}
