import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PointageController } from './pointage.controller';
import { PointageService } from './pointage.service';

@Module({
  imports: [PrismaModule],
  controllers: [PointageController],
  providers: [PointageService],
  exports: [PointageService],
})
export class PointageModule {}
