import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { AccountingPeriodService } from './accounting-period.service';
import { CloseAccountingPeriodDto } from './dto/accounting-period.dto';

@Controller('treasury/accounting-periods')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AccountingPeriodController {
  constructor(
    private readonly accountingPeriodService: AccountingPeriodService,
  ) {}

  @Get()
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

  @Post('close')
  @CheckPolicies({ action: 'manage', subject: 'AccountingPeriod' })
  close(
    @Body() dto: CloseAccountingPeriodDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.accountingPeriodService.closePeriod(dto, viewer);
  }
}
