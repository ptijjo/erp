import { Module } from '@nestjs/common';
import { HrModule } from '../hr/hr.module';
import { MessagingModule } from '../messaging/messaging.module';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';

@Module({
  imports: [HrModule, MessagingModule],
  controllers: [CronController],
  providers: [CronSecretGuard],
})
export class CronModule {}
