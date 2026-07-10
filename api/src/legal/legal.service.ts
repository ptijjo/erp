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
import type { LegalContractStatus, Prisma } from '../generated/prisma/client';
import type { CreateLegalContractDto, UpdateLegalContractDto } from './dto/legal.dto';

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.LegalContractWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.legalContract.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.legalContract.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Contrat introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateLegalContractDto, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.LEGAL);
    }
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.legalContract.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title.trim(),
        partyName: dto.partyName.trim(),
        contractType: dto.contractType?.trim() || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        renewalAlertDays: dto.renewalAlertDays ?? null,
        documentUrl: dto.documentUrl?.trim() || null,
        status: (dto.status as LegalContractStatus | undefined) ?? 'DRAFT',
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateLegalContractDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.LEGAL);
    }
    return this.prisma.legalContract.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.partyName !== undefined ? { partyName: dto.partyName.trim() } : {}),
        ...(dto.contractType !== undefined
          ? { contractType: dto.contractType?.trim() || null }
          : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.renewalAlertDays !== undefined
          ? { renewalAlertDays: dto.renewalAlertDays }
          : {}),
        ...(dto.documentUrl !== undefined
          ? { documentUrl: dto.documentUrl?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.LEGAL);
    }
    return this.prisma.legalContract.delete({ where: { id } });
  }
}
