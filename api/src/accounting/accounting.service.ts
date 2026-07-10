import {
  BadRequestException,
  ConflictException,
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
import type {
  ChartAccountType,
  JournalEntryStatus,
  Prisma,
} from '../generated/prisma/client';
import type {
  CreateChartAccountDto,
  CreateJournalEntryDto,
  CreateJournalEntryLineDto,
  UpdateChartAccountDto,
  UpdateJournalEntryDto,
} from './dto/accounting.dto';

const journalEntryInclude = {
  lines: {
    orderBy: { id: 'asc' as const },
    include: {
      chartAccount: {
        select: { id: true, code: true, name: true, accountType: true },
      },
    },
  },
} as const;

function assertHQFinanceWrite(viewer: AuthenticatedUser): void {
  if (isMainOrganizationUser(viewer)) {
    assertMainOrgPoleDomain(viewer, POLE_DOMAIN.FINANCE);
  }
}

function sumLineAmounts(
  lines: Array<{ debit: number | { toString(): string }; credit: number | { toString(): string } }>,
): { debitTotal: number; creditTotal: number } {
  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of lines) {
    debitTotal += Number(line.debit);
    creditTotal += Number(line.credit);
  }
  return { debitTotal, creditTotal };
}

function assertBalancedLines(
  lines: Array<{ debit: number | { toString(): string }; credit: number | { toString(): string } }>,
): void {
  const { debitTotal, creditTotal } = sumLineAmounts(lines);
  if (Math.abs(debitTotal - creditTotal) >= 0.0001) {
    throw new BadRequestException(
      'Les écritures ne sont pas équilibrées : le total des débits doit être égal au total des crédits.',
    );
  }
}

function assertValidJournalLines(lines: CreateJournalEntryLineDto[]): void {
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) {
      throw new BadRequestException('Les montants débit et crédit doivent être positifs ou nuls.');
    }
    if (line.debit === 0 && line.credit === 0) {
      throw new BadRequestException(
        'Chaque ligne doit comporter un montant au débit ou au crédit.',
      );
    }
  }
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllChartAccounts(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.ChartAccountWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.chartAccount.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async findOneChartAccount(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.chartAccount.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Compte comptable introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async createChartAccount(dto: CreateChartAccountDto, viewer: AuthenticatedUser) {
    assertHQFinanceWrite(viewer);
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    await this.assertValidParentAccount(dto.parentId, dto.organizationId, null);
    try {
      return await this.prisma.chartAccount.create({
        data: {
          organizationId: dto.organizationId,
          code: dto.code.trim(),
          name: dto.name.trim(),
          accountType: dto.accountType as ChartAccountType,
          isActive: dto.isActive ?? true,
          parentId: dto.parentId ?? null,
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un compte avec ce code existe déjà pour cette organisation.',
        );
      }
      throw e;
    }
  }

  async updateChartAccount(
    id: string,
    dto: UpdateChartAccountDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOneChartAccount(id, viewer);
    assertHQFinanceWrite(viewer);
    if (dto.parentId === id) {
      throw new BadRequestException('Un compte ne peut pas être son propre parent.');
    }
    if (dto.parentId !== undefined) {
      await this.assertValidParentAccount(
        dto.parentId,
        row.organizationId,
        id,
      );
    }
    try {
      return await this.prisma.chartAccount.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.accountType !== undefined
            ? { accountType: dto.accountType as ChartAccountType }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        },
      });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new ConflictException(
          'Un compte avec ce code existe déjà pour cette organisation.',
        );
      }
      throw e;
    }
  }

  async removeChartAccount(id: string, viewer: AuthenticatedUser) {
    await this.findOneChartAccount(id, viewer);
    assertHQFinanceWrite(viewer);
    try {
      return await this.prisma.chartAccount.delete({ where: { id } });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2003') {
        throw new BadRequestException(
          'Ce compte est utilisé par des écritures comptables et ne peut pas être supprimé.',
        );
      }
      throw e;
    }
  }

  async findAllJournalEntries(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.JournalEntryWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.journalEntry.findMany({
      where,
      include: journalEntryInclude,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneJournalEntry(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: journalEntryInclude,
    });
    if (!row) {
      throw new NotFoundException('Écriture comptable introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async createJournalEntry(dto: CreateJournalEntryDto, viewer: AuthenticatedUser) {
    assertHQFinanceWrite(viewer);
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    assertValidJournalLines(dto.lines);
    await this.assertChartAccountsInOrganization(dto.organizationId, dto.lines);
    return this.prisma.journalEntry.create({
      data: {
        organizationId: dto.organizationId,
        entryDate: new Date(dto.entryDate),
        reference: dto.reference?.trim() || null,
        description: dto.description?.trim() || null,
        status: 'DRAFT' satisfies JournalEntryStatus,
        lines: {
          create: dto.lines.map((line) => ({
            label: line.label?.trim() || null,
            debit: line.debit,
            credit: line.credit,
            chartAccountId: line.chartAccountId,
          })),
        },
      },
      include: journalEntryInclude,
    });
  }

  async updateJournalEntry(
    id: string,
    dto: UpdateJournalEntryDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.findOneJournalEntry(id, viewer);
    assertHQFinanceWrite(viewer);
    if (row.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seules les écritures en brouillon peuvent être modifiées.',
      );
    }
    if (dto.lines) {
      assertValidJournalLines(dto.lines);
      await this.assertChartAccountsInOrganization(row.organizationId, dto.lines);
    }
    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.entryDate !== undefined
          ? { entryDate: new Date(dto.entryDate) }
          : {}),
        ...(dto.reference !== undefined
          ? { reference: dto.reference?.trim() || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.lines
          ? {
              lines: {
                deleteMany: {},
                create: dto.lines.map((line) => ({
                  label: line.label?.trim() || null,
                  debit: line.debit,
                  credit: line.credit,
                  chartAccountId: line.chartAccountId,
                })),
              },
            }
          : {}),
      },
      include: journalEntryInclude,
    });
  }

  async removeJournalEntry(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOneJournalEntry(id, viewer);
    assertHQFinanceWrite(viewer);
    if (row.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seules les écritures en brouillon peuvent être supprimées.',
      );
    }
    return this.prisma.journalEntry.delete({ where: { id } });
  }

  async postJournalEntry(id: string, viewer: AuthenticatedUser) {
    const row = await this.findOneJournalEntry(id, viewer);
    assertHQFinanceWrite(viewer);
    if (row.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seules les écritures en brouillon peuvent être comptabilisées.',
      );
    }
    if (row.lines.length < 2) {
      throw new BadRequestException(
        'Une écriture doit comporter au moins deux lignes pour être comptabilisée.',
      );
    }
    assertBalancedLines(row.lines);
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED' satisfies JournalEntryStatus },
      include: journalEntryInclude,
    });
  }

  private async assertValidParentAccount(
    parentId: string | null | undefined,
    organizationId: string,
    accountId: string | null,
  ): Promise<void> {
    if (parentId == null || parentId === '') {
      return;
    }
    if (accountId != null && parentId === accountId) {
      throw new BadRequestException('Un compte ne peut pas être son propre parent.');
    }
    const parent = await this.prisma.chartAccount.findUnique({
      where: { id: parentId },
      select: { organizationId: true },
    });
    if (!parent || parent.organizationId !== organizationId) {
      throw new BadRequestException('Compte parent invalide pour cette organisation.');
    }
  }

  private async assertChartAccountsInOrganization(
    organizationId: string,
    lines: CreateJournalEntryLineDto[],
  ): Promise<void> {
    const accountIds = [...new Set(lines.map((line) => line.chartAccountId))];
    const accounts = await this.prisma.chartAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, organizationId: true, isActive: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('Un ou plusieurs comptes comptables sont introuvables.');
    }
    for (const account of accounts) {
      if (account.organizationId !== organizationId) {
        throw new BadRequestException(
          'Tous les comptes doivent appartenir à la même organisation que l’écriture.',
        );
      }
      if (!account.isActive) {
        throw new BadRequestException(
          'Les écritures ne peuvent pas utiliser un compte comptable inactif.',
        );
      }
    }
  }
}
