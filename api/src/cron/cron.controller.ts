import { Controller, Post, UseGuards } from '@nestjs/common';
import { LeaveBalanceService } from '../hr/leave-balance.service';
import { MessagingAttachmentService } from '../messaging/messaging-attachment.service';
import {
  clearRlsBypass,
  enableRlsBypass,
} from '../prisma/rls-bypass';
import { PrismaService } from '../prisma/prisma.service';
import { CronSecretGuard } from './cron-secret.guard';

@Controller('cron')
export class CronController {
  constructor(
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly messagingAttachmentService: MessagingAttachmentService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Renouvellement des soldes de congés (exercice mai).
   * Appeler avec l’en-tête `X-Cron-Secret` (voir docs/cron-jobs.md).
   */
  @Post('leave-renew-exercise')
  @UseGuards(CronSecretGuard)
  async renewLeaveExercise() {
    await enableRlsBypass(this.prisma);
    try {
      return await this.leaveBalanceService.renewExerciseScheduled();
    } finally {
      await clearRlsBypass(this.prisma);
    }
  }

  /** Purge les pièces jointes uploadées mais jamais envoyées (> 24 h). */
  @Post('messaging-purge-orphan-attachments')
  @UseGuards(CronSecretGuard)
  async purgeMessagingOrphanAttachments() {
    await enableRlsBypass(this.prisma);
    try {
      return await this.messagingAttachmentService.purgeOrphanAttachments();
    } finally {
      await clearRlsBypass(this.prisma);
    }
  }
}
