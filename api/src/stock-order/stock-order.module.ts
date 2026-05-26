import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BudgetModule } from '../budget/budget.module';
import { StockOrderController } from './stock-order.controller';
import { StockOrderService } from './stock-order.service';

@Module({
  imports: [PrismaModule, BudgetModule],
  controllers: [StockOrderController],
  providers: [StockOrderService],
  exports: [StockOrderService],
})
export class StockOrderModule {}
