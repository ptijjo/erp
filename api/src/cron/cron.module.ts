import { Module } from '@nestjs/common';
import { HrModule } from '../hr/hr.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';

@Module({
  imports: [HrModule, MessagingModule, PrismaModule],
  controllers: [CronController],
  providers: [CronSecretGuard],
})
export class CronModule {}
