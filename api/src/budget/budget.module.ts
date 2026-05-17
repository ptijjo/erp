import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { BudgetExpenseService } from './budget-expense.service';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetExpenseService],
  exports: [BudgetService, BudgetExpenseService],
})
export class BudgetModule {}
