import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockMovementController],
  providers: [StockMovementService],
  exports: [StockMovementService],
})
export class StockMovementModule {}
