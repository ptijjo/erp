import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Notification' })
  findMine(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findMine(viewer, {
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
    });
  }

  @Patch(':id/read')
  @CheckPolicies({ action: 'update', subject: 'Notification' })
  markRead(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.notificationService.markRead(id, viewer);
  }

  @Post('read-all')
  @CheckPolicies({ action: 'update', subject: 'Notification' })
  markAllRead(@CurrentUser() viewer: AuthenticatedUser) {
    return this.notificationService.markAllRead(viewer);
  }
}
