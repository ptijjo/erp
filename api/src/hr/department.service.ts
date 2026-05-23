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
import type { Department, Prisma } from '../generated/prisma/client';
import type { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { resolveTargetOrganizationId } from './hr-org-scope.util';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    paginationInput: { page?: number; limit?: number },
  ): Promise<PaginatedResult<Department>> {
    const { page, limit } = resolvePagination(paginationInput);
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.DepartmentWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.department.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.department.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Département introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateDepartmentDto, viewer: AuthenticatedUser) {
    const organizationId = resolveTargetOrganizationId(
      viewer,
      dto.organizationId,
    );
    try {
      return await this.prisma.department.create({
        data: {
          name: dto.name.trim(),
          organizationId,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un département porte déjà ce nom dans cette organisation.',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDepartmentDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    try {
      return await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un département porte déjà ce nom dans cette organisation.',
        );
      }
      throw e;
    }
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOne(id, viewer);
    await this.prisma.department.delete({ where: { id } });
    return row;
  }
}
