import { Module } from '@nestjs/common';
import { HrModule } from '../hr/hr.module';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';

@Module({
  imports: [HrModule],
  controllers: [CronController],
  providers: [CronSecretGuard],
})
export class CronModule {}
