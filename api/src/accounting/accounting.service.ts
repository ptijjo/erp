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
import { AccountingPeriodService } from '../treasury/accounting-period.service';
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

/** Comptes système utilisés pour les écritures automatiques (OHADA simplifié). */
const SYSTEM_ACCOUNTS = [
  { code: '530', name: 'Caisse', accountType: 'ASSET' as const },
  { code: '512', name: 'Banque', accountType: 'ASSET' as const },
  { code: '707', name: 'Ventes de marchandises', accountType: 'REVENUE' as const },
  { code: '601', name: 'Achats / charges d’exploitation', accountType: 'EXPENSE' as const },
] as const;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPeriodService: AccountingPeriodService,
  ) {}

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
    const entryDate = new Date(dto.entryDate);
    await this.accountingPeriodService.assertPeriodOpenForDate(
      dto.organizationId,
      entryDate,
    );
    return this.prisma.journalEntry.create({
      data: {
        organizationId: dto.organizationId,
        entryDate,
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
    const entryDate =
      dto.entryDate !== undefined ? new Date(dto.entryDate) : row.entryDate;
    await this.accountingPeriodService.assertPeriodOpenForDate(
      row.organizationId,
      entryDate,
    );
    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.entryDate !== undefined ? { entryDate } : {}),
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
    await this.accountingPeriodService.assertPeriodOpenForDate(
      row.organizationId,
      row.entryDate,
    );
    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED' satisfies JournalEntryStatus },
      include: journalEntryInclude,
    });
  }

  /** Balance des comptes (écritures POSTED) sur une période. */
  async trialBalance(
    viewer: AuthenticatedUser,
    opts: { year: number; month: number; organizationId?: string },
  ) {
    const organizationId = this.resolveReportOrgId(viewer, opts.organizationId);
    const periodStart = new Date(Date.UTC(opts.year, opts.month - 1, 1));
    const periodEnd = new Date(Date.UTC(opts.year, opts.month, 1));

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          status: 'POSTED',
          organizationId,
          entryDate: { gte: periodStart, lt: periodEnd },
        },
      },
      include: {
        chartAccount: {
          select: { id: true, code: true, name: true, accountType: true },
        },
      },
    });

    const byAccount = new Map<
      string,
      {
        chartAccountId: string;
        code: string;
        name: string;
        accountType: ChartAccountType;
        debit: number;
        credit: number;
      }
    >();

    for (const line of lines) {
      const key = line.chartAccountId;
      const existing = byAccount.get(key);
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      if (existing) {
        existing.debit += debit;
        existing.credit += credit;
      } else {
        byAccount.set(key, {
          chartAccountId: key,
          code: line.chartAccount.code,
          name: line.chartAccount.name,
          accountType: line.chartAccount.accountType,
          debit,
          credit,
        });
      }
    }

    const rows = [...byAccount.values()]
      .map((r) => ({
        ...r,
        balance: r.debit - r.credit,
      }))
      .sort((a, b) => a.code.localeCompare(b.code, 'fr'));

    const totals = rows.reduce(
      (acc, r) => {
        acc.debit += r.debit;
        acc.credit += r.credit;
        return acc;
      },
      { debit: 0, credit: 0 },
    );

    return {
      year: opts.year,
      month: opts.month,
      organizationId,
      rows,
      totals,
    };
  }

  /** Grand livre d’un compte sur une plage de dates. */
  async generalLedger(
    viewer: AuthenticatedUser,
    opts: {
      chartAccountId: string;
      from: string;
      to: string;
    },
  ) {
    const account = await this.findOneChartAccount(opts.chartAccountId, viewer);
    const from = new Date(opts.from);
    const to = new Date(opts.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        chartAccountId: account.id,
        journalEntry: {
          status: 'POSTED',
          organizationId: account.organizationId,
          entryDate: { gte: from, lte: to },
        },
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            entryDate: true,
            reference: true,
            description: true,
          },
        },
      },
      orderBy: [{ journalEntry: { entryDate: 'asc' } }, { id: 'asc' }],
    });

    let running = 0;
    const movements = lines.map((line) => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      running += debit - credit;
      return {
        id: line.id,
        label: line.label,
        debit,
        credit,
        balance: running,
        entry: line.journalEntry,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        organizationId: account.organizationId,
      },
      from: from.toISOString(),
      to: to.toISOString(),
      movements,
      closingBalance: running,
    };
  }

  /**
   * Écriture auto à la clôture de caisse : Débit 530 / Crédit 707 (ventes).
   * Idempotent via référence `AUTO:SESSION:{id}`.
   */
  async autoPostFromSessionClose(sessionId: string): Promise<void> {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.statut !== 'CLOTUREE') {
      return;
    }
    const sales = Number(session.totalVentesFcfa ?? 0);
    if (sales <= 0) {
      return;
    }

    const reference = `AUTO:SESSION:${sessionId}`;
    const existing = await this.prisma.journalEntry.findFirst({
      where: { reference, organizationId: session.organizationId },
    });
    if (existing) {
      return;
    }

    const accounts = await this.ensureSystemAccounts(session.organizationId);
    const entryDate = session.closedAt ?? new Date();
    try {
      await this.accountingPeriodService.assertPeriodOpenForDate(
        session.organizationId,
        entryDate,
      );
    } catch {
      return;
    }

    await this.prisma.journalEntry.create({
      data: {
        organizationId: session.organizationId,
        entryDate,
        reference,
        description: `Clôture caisse — ventes du service`,
        status: 'POSTED',
        lines: {
          create: [
            {
              label: 'Encaissements caisse',
              debit: sales,
              credit: 0,
              chartAccountId: accounts.caisse.id,
            },
            {
              label: 'Ventes de marchandises',
              debit: 0,
              credit: sales,
              chartAccountId: accounts.ventes.id,
            },
          ],
        },
      },
    });
  }

  /**
   * Écriture auto pour une sortie budget : Débit 601 / Crédit 530.
   * Idempotent via référence `AUTO:EXPENSE:{id}`.
   */
  async autoPostFromBudgetExpense(expenseId: string): Promise<void> {
    const expense = await this.prisma.budgetExpense.findUnique({
      where: { id: expenseId },
      include: {
        budgetLine: {
          select: {
            label: true,
            budget: { select: { subsidiaryOrganizationId: true } },
          },
        },
      },
    });
    if (!expense) {
      return;
    }

    const organizationId = expense.budgetLine.budget.subsidiaryOrganizationId;
    const amount = Number(expense.amount);
    if (amount <= 0) {
      return;
    }

    const reference = `AUTO:EXPENSE:${expenseId}`;
    const existing = await this.prisma.journalEntry.findFirst({
      where: { reference, organizationId },
    });
    if (existing) {
      return;
    }

    const accounts = await this.ensureSystemAccounts(organizationId);
    const entryDate = expense.spentAt;
    try {
      await this.accountingPeriodService.assertPeriodOpenForDate(
        organizationId,
        entryDate,
      );
    } catch {
      return;
    }

    const label =
      expense.label?.trim() ||
      expense.budgetLine.label ||
      'Sortie budgétaire';

    await this.prisma.journalEntry.create({
      data: {
        organizationId,
        entryDate,
        reference,
        description: `Sortie budget — ${label}`,
        status: 'POSTED',
        lines: {
          create: [
            {
              label,
              debit: amount,
              credit: 0,
              chartAccountId: accounts.charges.id,
            },
            {
              label: 'Paiement caisse',
              debit: 0,
              credit: amount,
              chartAccountId: accounts.caisse.id,
            },
          ],
        },
      },
    });
  }

  /** Crée les comptes système manquants pour une organisation. */
  async ensureSystemAccounts(organizationId: string) {
    const byCode = new Map<string, { id: string; code: string }>();
    for (const def of SYSTEM_ACCOUNTS) {
      const row = await this.prisma.chartAccount.upsert({
        where: {
          organizationId_code: {
            organizationId,
            code: def.code,
          },
        },
        create: {
          organizationId,
          code: def.code,
          name: def.name,
          accountType: def.accountType,
          isActive: true,
        },
        update: {},
        select: { id: true, code: true },
      });
      byCode.set(def.code, row);
    }
    return {
      caisse: byCode.get('530')!,
      banque: byCode.get('512')!,
      ventes: byCode.get('707')!,
      charges: byCode.get('601')!,
    };
  }

  private resolveReportOrgId(
    viewer: AuthenticatedUser,
    organizationId?: string,
  ): string {
    if (isMainOrganizationUser(viewer)) {
      const orgId = organizationId?.trim();
      if (!orgId) {
        throw new BadRequestException(
          'organizationId est requis pour la maison mère.',
        );
      }
      assertOrganizationResourceAccess(viewer, orgId);
      return orgId;
    }
    return viewer.organisationId;
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
