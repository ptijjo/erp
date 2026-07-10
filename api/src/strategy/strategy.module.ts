import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';

@Module({
  imports: [PrismaModule],
  controllers: [StrategyController],
  providers: [StrategyService],
})
export class StrategyModule {}
