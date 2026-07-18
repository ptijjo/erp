import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { AccountingModule } from '../accounting/accounting.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { BudgetExpenseService } from './budget-expense.service';
import { BudgetSupplementService } from './budget-supplement.service';
import { BudgetOverviewService } from './budget-overview.service';
import { BudgetStockLinkService } from './budget-stock-link.service';

@Module({
  imports: [PrismaModule, TreasuryModule, AccountingModule],
  controllers: [BudgetController],
  providers: [
    BudgetService,
    BudgetExpenseService,
    BudgetSupplementService,
    BudgetOverviewService,
    BudgetStockLinkService,
  ],
  exports: [
    BudgetService,
    BudgetExpenseService,
    BudgetSupplementService,
    BudgetOverviewService,
    BudgetStockLinkService,
  ],
})
export class BudgetModule {}
