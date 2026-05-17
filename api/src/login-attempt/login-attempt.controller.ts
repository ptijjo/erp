import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { LoginAttemptService } from './login-attempt.service';

@Controller('login-attempt')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class LoginAttemptController {
  constructor(private readonly loginAttemptService: LoginAttemptService) {}

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'LoginAttempt' })
  findByUser(
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.loginAttemptService.findByUserId(userId, viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'LoginAttempt' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.loginAttemptService.findOne(id, viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'LoginAttempt' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.loginAttemptService.findAll(viewer);
  }
}
