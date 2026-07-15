import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { SpiritualController } from './spiritual.controller';
import { SpiritualService } from './spiritual.service';
import { SpiritualParticipationService } from './spiritual-participation.service';
import {
  SpiritualEventParticipationController,
  SpiritualParticipationController,
} from './spiritual-participation.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [
    SpiritualController,
    SpiritualParticipationController,
    SpiritualEventParticipationController,
  ],
  providers: [SpiritualService, SpiritualParticipationService],
})
export class SpiritualModule {}
