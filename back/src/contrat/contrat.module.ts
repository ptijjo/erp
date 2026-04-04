import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContratController } from './contrat.controller';
import { ContratService } from './contrat.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContratController],
  providers: [ContratService],
  exports: [ContratService],
})
export class ContratModule {}
