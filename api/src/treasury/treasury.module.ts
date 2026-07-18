import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingPeriodController } from './accounting-period.controller';
import { AccountingPeriodService } from './accounting-period.service';
import { TreasuryOverviewService } from './treasury-overview.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingPeriodController],
  providers: [AccountingPeriodService, TreasuryOverviewService],
  exports: [AccountingPeriodService, TreasuryOverviewService],
})
export class TreasuryModule {}
