import { Controller, Post, UseGuards } from '@nestjs/common';
import { LeaveBalanceService } from '../hr/leave-balance.service';
import { CronSecretGuard } from './cron-secret.guard';

@Controller('cron')
export class CronController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  /**
   * Renouvellement des soldes de congés (exercice mai).
   * Appeler avec l’en-tête `X-Cron-Secret` (voir docs/cron-jobs.md).
   */
  @Post('leave-renew-exercise')
  @UseGuards(CronSecretGuard)
  renewLeaveExercise() {
    return this.leaveBalanceService.renewExerciseScheduled();
  }
}
