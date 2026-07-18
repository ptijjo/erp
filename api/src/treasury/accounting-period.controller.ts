import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { AccountingPeriodService } from './accounting-period.service';
import { TreasuryOverviewService } from './treasury-overview.service';
import {
  CloseAccountingPeriodDto,
  ReopenAccountingPeriodDto,
} from './dto/accounting-period.dto';
import { TreasuryOverviewQueryDto } from './dto/treasury-overview.dto';

@Controller('treasury')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AccountingPeriodController {
  constructor(
    private readonly accountingPeriodService: AccountingPeriodService,
    private readonly treasuryOverviewService: TreasuryOverviewService,
  ) {}

  @Get('overview')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  overview(
    @Query() query: TreasuryOverviewQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.treasuryOverviewService.overview(viewer, query);
  }

  @Get('accounting-periods')
  @CheckPolicies({ action: 'read', subject: 'AccountingPeriod' })
  list(
    @Query('year') year: string | undefined,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const y = year != null ? Number(year) : undefined;
    return this.accountingPeriodService.listClosures(
      viewer,
      Number.isFinite(y) ? y : undefined,
    );
  }

  @Post('accounting-periods/close')
  @CheckPolicies({ action: 'manage', subject: 'AccountingPeriod' })
  close(
    @Body() dto: CloseAccountingPeriodDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingPeriodService.closePeriod(dto, viewer);
  }

  @Post('accounting-periods/reopen')
  @CheckPolicies({ action: 'manage', subject: 'AccountingPeriod' })
  reopen(
    @Body() dto: ReopenAccountingPeriodDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingPeriodService.reopenPeriod(dto, viewer);
  }
}
