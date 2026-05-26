import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingPeriodController } from './accounting-period.controller';
import { AccountingPeriodService } from './accounting-period.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingPeriodController],
  providers: [AccountingPeriodService],
  exports: [AccountingPeriodService],
})
export class TreasuryModule {}
