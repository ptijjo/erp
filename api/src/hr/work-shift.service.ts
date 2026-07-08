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
  WorkShiftStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  WorkShiftCalendarQueryDto,
} from './dto/work-shift.dto';
import type { GenerateWeekDto } from './dto/recurring-work-shift.dto';
import { assertEmployeeInViewerScope } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

const shiftInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, organizationId: true },
  },
} as const;

/** Décalage en jours depuis le lundi (base de la semaine générée). */
const WEEK_DAY_OFFSET: Record<WeekDay, number> = {
  [WeekDay.MONDAY]: 0,
  [WeekDay.TUESDAY]: 1,
  [WeekDay.WEDNESDAY]: 2,
  [WeekDay.THURSDAY]: 3,
  [WeekDay.FRIDAY]: 4,
  [WeekDay.SATURDAY]: 5,
  [WeekDay.SUNDAY]: 6,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

@Injectable()
export class WorkShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number; employeeId?: string },
  ): Promise<
    PaginatedResult<
      Prisma.WorkShiftGetPayload<{ include: typeof shiftInclude }>
    >
  > {
    assertSubsidiaryOrganizationOnly(viewer);
    const { page, limit } = resolvePagination(paginationInput);
    const where: Prisma.WorkShiftWhereInput = {
      organizationId: viewer.organisationId,
      ...(paginationInput.employeeId
        ? { employeeId: paginationInput.employeeId }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.workShift.findMany({
        where,
        orderBy: { startAt: 'desc' },
        include: shiftInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.workShift.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    assertSubsidiaryOrganizationOnly(viewer);
    const row = await this.prisma.workShift.findUnique({
      where: { id },
      include: shiftInclude,
    });
    if (!row) {
      throw new NotFoundException('Créneau de planning introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateWorkShiftDto, viewer: AuthenticatedUser) {
    assertSubsidiaryOrganizationOnly(viewer);
    const employee = await assertEmployeeInViewerScope(
      this.prisma,
      dto.employeeId,
      viewer,
    );
    this.assertValidRange(dto.startAt, dto.endAt);
    return this.prisma.workShift.create({
      data: {
        employeeId: employee.id,
        organizationId: employee.organizationId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        status: (dto.status as WorkShiftStatus) ?? WorkShiftStatus.PLANNED,
        kind: (dto.kind as WorkShiftKind) ?? WorkShiftKind.WORK,
        note: dto.note?.trim() || null,
      },
      include: shiftInclude,
    });
  }

  async update(id: string, dto: UpdateWorkShiftDto, viewer: AuthenticatedUser) {
    const existing = await this.findOne(id, viewer);
    const nextStart = dto.startAt ?? existing.startAt;
    const nextEnd = dto.endAt ?? existing.endAt;
    if (dto.startAt !== undefined || dto.endAt !== undefined) {
      this.assertValidRange(nextStart, nextEnd);
    }
    return this.prisma.workShift.update({
      where: { id },
      data: {
        ...(dto.startAt !== undefined ? { startAt: dto.startAt } : {}),
        ...(dto.endAt !== undefined ? { endAt: dto.endAt } : {}),
        ...(dto.status !== undefined
          ? { status: dto.status as WorkShiftStatus }
          : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind as WorkShiftKind } : {}),
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
      include: shiftInclude,
    });
  }

  /**
   * Renvoie tous les créneaux d’une plage de dates (non paginé) pour la vue
   * graphique du planning : colonne employés × timeline 24h.
   */
  async findCalendar(
    viewer: AuthenticatedUser,
    query: WorkShiftCalendarQueryDto,
  ): Promise<Prisma.WorkShiftGetPayload<{ include: typeof shiftInclude }>[]> {
    assertSubsidiaryOrganizationOnly(viewer);
    return this.prisma.workShift.findMany({
      where: {
        organizationId: viewer.organisationId,
        startAt: { gte: query.from, lt: query.to },
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      },
      orderBy: { startAt: 'asc' },
      include: shiftInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.workShift.delete({ where: { id } });
    return row;
  }

  private assertValidRange(start: Date, end: Date): void {
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException(
        'La fin du créneau doit être postérieure au début.',
      );
    }
  }

  /**
   * Génère les créneaux concrets d’une semaine à partir des modèles récurrents actifs.
   * Le lundi de la semaine contenant `weekStart` sert de base ; les créneaux déjà
   * présents (même employé + même début) ne sont pas recréés.
   */
  async generateWeek(
    viewer: AuthenticatedUser,
    dto: GenerateWeekDto,
  ): Promise<{ created: number }> {
    assertSubsidiaryOrganizationOnly(viewer);
    const monday = this.mondayOf(dto.weekStart);
    const weekEnd = new Date(monday.getTime() + 7 * DAY_MS);

    const patterns = await this.prisma.recurringWorkShift.findMany({
      where: { organizationId: viewer.organisationId, active: true },
    });
    if (patterns.length === 0) {
      return { created: 0 };
    }

    const existing = await this.prisma.workShift.findMany({
      where: {
        organizationId: viewer.organisationId,
        startAt: { gte: monday, lt: weekEnd },
      },
      select: { employeeId: true, startAt: true },
    });
    const seen = new Set(
      existing.map((s) => `${s.employeeId}|${s.startAt.toISOString()}`),
    );

    const data: Prisma.WorkShiftCreateManyInput[] = [];
    for (const pattern of patterns) {
      const dayBase = new Date(
        monday.getTime() + WEEK_DAY_OFFSET[pattern.dayOfWeek] * DAY_MS,
      );
      const startAt = new Date(dayBase.getTime() + pattern.startMinute * MINUTE_MS);
      const endAt = new Date(dayBase.getTime() + pattern.endMinute * MINUTE_MS);
      const key = `${pattern.employeeId}|${startAt.toISOString()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      data.push({
        employeeId: pattern.employeeId,
        organizationId: viewer.organisationId,
        startAt,
        endAt,
        status: WorkShiftStatus.PLANNED,
        kind: pattern.kind,
        note: pattern.note?.trim() || null,
      });
    }

    if (data.length === 0) {
      return { created: 0 };
    }
    await this.prisma.workShift.createMany({ data });
    return { created: data.length };
  }

  /** Lundi (00:00 UTC) de la semaine contenant `date`. */
  private mondayOf(date: Date): Date {
    const utcMidnight = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const dow = utcMidnight.getUTCDay(); // 0 = dimanche … 6 = samedi
    const offsetToMonday = (dow + 6) % 7;
    return new Date(utcMidnight.getTime() - offsetToMonday * DAY_MS);
  }
}
