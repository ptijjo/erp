import {
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
import type { Prisma, StrategyProjectStatus } from '../generated/prisma/client';
import type { CreateStrategyProjectDto, UpdateStrategyProjectDto } from './dto/strategy.dto';

@Injectable()
export class StrategyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.StrategyProjectWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.strategyProject.findMany({
      where,
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.strategyProject.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Projet stratégique introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateStrategyProjectDto, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.STRATEGY);
    }
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.strategyProject.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: (dto.status as StrategyProjectStatus | undefined) ?? 'PLANNED',
        priority: dto.priority ?? 3,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        budgetEstimate: dto.budgetEstimate ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateStrategyProjectDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.STRATEGY);
    }
    return this.prisma.strategyProject.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.targetDate !== undefined
          ? { targetDate: dto.targetDate ? new Date(dto.targetDate) : null }
          : {}),
        ...(dto.budgetEstimate !== undefined
          ? { budgetEstimate: dto.budgetEstimate }
          : {}),
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.STRATEGY);
    }
    return this.prisma.strategyProject.delete({ where: { id } });
  }
}
