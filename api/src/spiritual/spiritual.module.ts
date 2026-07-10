import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { StorageModule } from '../storage/storage.module';
import { SpiritualController } from './spiritual.controller';
import { SpiritualService } from './spiritual.service';
import { SpiritualParticipationService } from './spiritual-participation.service';
import { SpiritualArticleService } from './spiritual-article.service';
import {
  SpiritualEventParticipationController,
  SpiritualParticipationController,
} from './spiritual-participation.controller';
import { SpiritualArticleController } from './spiritual-article.controller';

@Module({
  imports: [PrismaModule, NotificationModule, StorageModule],
  controllers: [
    SpiritualController,
    SpiritualParticipationController,
    SpiritualEventParticipationController,
    SpiritualArticleController,
  ],
  providers: [
    SpiritualService,
    SpiritualParticipationService,
    SpiritualArticleService,
  ],
})
export class SpiritualModule {}
