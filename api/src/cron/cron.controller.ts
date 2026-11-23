import { Controller, Post, UseGuards } from '@nestjs/common';
import { LeaveBalanceService } from '../hr/leave-balance.service';
import { MessagingAttachmentService } from '../messaging/messaging-attachment.service';
import { withRlsBypass } from '../prisma/rls-bypass';
import { CronSecretGuard } from './cron-secret.guard';

@Controller('cron')
export class CronController {
  constructor(
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly messagingAttachmentService: MessagingAttachmentService,
  ) {}

  /**
   * Renouvellement des soldes de congés (exercice mai).
   * Appeler avec l’en-tête `X-Cron-Secret` (voir docs/cron-jobs.md).
   */
  @Post('leave-renew-exercise')
  @UseGuards(CronSecretGuard)
  async renewLeaveExercise() {
    return withRlsBypass(() =>
      this.leaveBalanceService.renewExerciseScheduled(),
    );
  }

  /** Purge les pièces jointes uploadées mais jamais envoyées (> 24 h). */
  @Post('messaging-purge-orphan-attachments')
  @UseGuards(CronSecretGuard)
  async purgeMessagingOrphanAttachments() {
    return withRlsBypass(() =>
      this.messagingAttachmentService.purgeOrphanAttachments(),
    );
  }
}
