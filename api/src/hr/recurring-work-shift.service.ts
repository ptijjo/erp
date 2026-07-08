import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  assertSubsidiaryOrganizationOnly,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  WeekDay,
  WorkShiftKind,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateRecurringWorkShiftDto,
  UpdateRecurringWorkShiftDto,
} from './dto/recurring-work-shift.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';

const recurringInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, organizationId: true },
  },
} as const;

@Injectable()
export class RecurringWorkShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    filter: { employeeId?: string },
  ): Promise<
    Prisma.RecurringWorkShiftGetPayload<{ include: typeof recurringInclude }>[]
  > {
    assertSubsidiaryOrganizationOnly(viewer);
    return this.prisma.recurringWorkShift.findMany({
      where: {
        organizationId: viewer.organisationId,
        ...(filter.employeeId ? { employeeId: filter.employeeId } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      include: recurringInclude,
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    assertSubsidiaryOrganizationOnly(viewer);
    const row = await this.prisma.recurringWorkShift.findUnique({
      where: { id },
      include: recurringInclude,
    });
    if (!row) {
      throw new NotFoundException('Modèle de planning introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    dto: CreateRecurringWorkShiftDto,
    viewer: AuthenticatedUser,
  ) {
    assertSubsidiaryOrganizationOnly(viewer);
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    this.assertValidRange(dto.startMinute, dto.endMinute);
    return this.prisma.recurringWorkShift.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        dayOfWeek: dto.dayOfWeek as WeekDay,
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        kind: (dto.kind as WorkShiftKind) ?? WorkShiftKind.WORK,
        active: true,
        note: dto.note?.trim() || null,
      },
      include: recurringInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateRecurringWorkShiftDto,
    viewer: AuthenticatedUser,
  ) {
    const existing = await this.findOne(id, viewer);
    const nextStart = dto.startMinute ?? existing.startMinute;
    const nextEnd = dto.endMinute ?? existing.endMinute;
    if (dto.startMinute !== undefined || dto.endMinute !== undefined) {
      this.assertValidRange(nextStart, nextEnd);
    }
    return this.prisma.recurringWorkShift.update({
      where: { id },
      data: {
        ...(dto.dayOfWeek !== undefined
          ? { dayOfWeek: dto.dayOfWeek as WeekDay }
          : {}),
        ...(dto.startMinute !== undefined
          ? { startMinute: dto.startMinute }
          : {}),
        ...(dto.endMinute !== undefined ? { endMinute: dto.endMinute } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind as WorkShiftKind } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
      include: recurringInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.recurringWorkShift.delete({ where: { id } });
    return row;
  }

  private assertValidRange(startMinute: number, endMinute: number): void {
    if (endMinute <= startMinute) {
      throw new BadRequestException(
        'L’heure de fin doit être postérieure à l’heure de début.',
      );
    }
  }
}
