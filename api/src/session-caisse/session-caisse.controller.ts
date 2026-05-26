import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CloseSessionCaisseDto,
  OpenSessionCaisseDto,
} from './dto/session-caisse.dto';
import { SessionCaisseService } from './session-caisse.service';

@Controller('session-caisse')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SessionCaisseController {
  constructor(private readonly sessionCaisseService: SessionCaisseService) {}

  @Post('open')
  @CheckPolicies({ action: 'create', subject: 'SessionCaisse' })
  open(
    @Body() dto: OpenSessionCaisseDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.sessionCaisseService.open(dto, viewer);
  }

  @Get('current')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  getCurrent(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sessionCaisseService.getCurrent(viewer);
  }

  @Get('mine')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  findMine(@CurrentUser() viewer: AuthenticatedUser) {
    return this.sessionCaisseService.findMine(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'SessionCaisse' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.sessionCaisseService.findOne(id, viewer);
  }

  @Post(':id/close')
  @CheckPolicies({ action: 'update', subject: 'SessionCaisse' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseSessionCaisseDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.sessionCaisseService.close(id, dto, viewer);
  }
}
