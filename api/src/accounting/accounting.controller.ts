import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { AccountingService } from './accounting.service';
import {
  CreateChartAccountDto,
  CreateJournalEntryDto,
  UpdateChartAccountDto,
  UpdateJournalEntryDto,
} from './dto/accounting.dto';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('chart-accounts')
  @CheckPolicies({ action: 'read', subject: 'ChartAccount' })
  findAllChartAccounts(@CurrentUser() viewer: AuthenticatedUser) {
    return this.accountingService.findAllChartAccounts(viewer);
  }

  @Get('chart-accounts/:id')
  @CheckPolicies({ action: 'read', subject: 'ChartAccount' })
  findOneChartAccount(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.findOneChartAccount(id, viewer);
  }

  @Post('chart-accounts')
  @CheckPolicies({ action: 'create', subject: 'ChartAccount' })
  createChartAccount(
    @Body() dto: CreateChartAccountDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.createChartAccount(dto, viewer);
  }

  @Patch('chart-accounts/:id')
  @CheckPolicies({ action: 'update', subject: 'ChartAccount' })
  updateChartAccount(
    @Param('id') id: string,
    @Body() dto: UpdateChartAccountDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.updateChartAccount(id, dto, viewer);
  }

  @Delete('chart-accounts/:id')
  @CheckPolicies({ action: 'delete', subject: 'ChartAccount' })
  removeChartAccount(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.removeChartAccount(id, viewer);
  }

  @Get('reports/trial-balance')
  @CheckPolicies({ action: 'read', subject: 'JournalEntry' })
  trialBalance(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('organizationId') organizationId: string | undefined,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.trialBalance(viewer, {
      year: Number(year),
      month: Number(month),
      organizationId,
    });
  }

  @Get('reports/general-ledger')
  @CheckPolicies({ action: 'read', subject: 'JournalEntry' })
  generalLedger(
    @Query('chartAccountId') chartAccountId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.generalLedger(viewer, {
      chartAccountId,
      from,
      to,
    });
  }

  @Get('journal-entries')
  @CheckPolicies({ action: 'read', subject: 'JournalEntry' })
  findAllJournalEntries(@CurrentUser() viewer: AuthenticatedUser) {
    return this.accountingService.findAllJournalEntries(viewer);
  }

  @Get('journal-entries/:id')
  @CheckPolicies({ action: 'read', subject: 'JournalEntry' })
  findOneJournalEntry(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.findOneJournalEntry(id, viewer);
  }

  @Post('journal-entries')
  @CheckPolicies({ action: 'create', subject: 'JournalEntry' })
  createJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.createJournalEntry(dto, viewer);
  }

  @Patch('journal-entries/:id')
  @CheckPolicies({ action: 'update', subject: 'JournalEntry' })
  updateJournalEntry(
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.updateJournalEntry(id, dto, viewer);
  }

  @Delete('journal-entries/:id')
  @CheckPolicies({ action: 'delete', subject: 'JournalEntry' })
  removeJournalEntry(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.removeJournalEntry(id, viewer);
  }

  @Post('journal-entries/:id/post')
  @CheckPolicies({ action: 'manage', subject: 'JournalEntry' })
  postJournalEntry(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingService.postJournalEntry(id, viewer);
  }
}
