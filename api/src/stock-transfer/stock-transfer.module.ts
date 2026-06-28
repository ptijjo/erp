import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockTransferController } from './stock-transfer.controller';
import { StockTransferService } from './stock-transfer.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockTransferController],
  providers: [StockTransferService],
})
export class StockTransferModule {}
