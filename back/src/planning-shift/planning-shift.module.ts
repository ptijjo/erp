import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanningShiftController } from './planning-shift.controller';
import { PlanningShiftService } from './planning-shift.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlanningShiftController],
  providers: [PlanningShiftService],
  exports: [PlanningShiftService],
})
export class PlanningShiftModule {}
