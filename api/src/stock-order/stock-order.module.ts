import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockOrderController } from './stock-order.controller';
import { StockOrderService } from './stock-order.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockOrderController],
  providers: [StockOrderService],
  exports: [StockOrderService],
})
export class StockOrderModule {}
