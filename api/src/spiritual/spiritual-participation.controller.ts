import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { RespondSpiritualParticipationDto } from './dto/spiritual-participation.dto';
import { SpiritualParticipationService } from './spiritual-participation.service';

@Controller('spiritual')
@UseGuards(JwtAuthGuard)
export class SpiritualParticipationController {
  constructor(
    private readonly participationService: SpiritualParticipationService,
  ) {}

  /** Self-service invitation : accès contrôlé dans le service (pas CASL update). */
  @Get('my-invitations')
  listMyInvitations(@CurrentUser() viewer: AuthenticatedUser) {
    return this.participationService.listMyInvitations(viewer);
  }

  @Patch('participations/:id/response')
  respond(
    @Param('id') id: string,
    @Body() dto: RespondSpiritualParticipationDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.participationService.respond(id, dto, viewer);
  }
}

@Controller('spiritual/events')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SpiritualEventParticipationController {
  constructor(
    private readonly participationService: SpiritualParticipationService,
  ) {}

  @Post(':id/publish')
  @CheckPolicies({ action: 'update', subject: 'SpiritualEvent' })
  publish(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.participationService.publishEvent(id, viewer);
  }

  @Get(':id/participations')
  @CheckPolicies({ action: 'read', subject: 'SpiritualEvent' })
  listParticipations(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.participationService.listEventParticipations(id, viewer);
  }

  @Post(':id/sync-invitations')
  @CheckPolicies({ action: 'update', subject: 'SpiritualEvent' })
  syncInvitations(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.participationService.syncInvitations(id, viewer);
  }
}
