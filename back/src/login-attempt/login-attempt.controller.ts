import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
  findByUser(@Param('userId') userId: string) {
    return this.loginAttemptService.findByUserId(userId);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'LoginAttempt' })
  findOne(@Param('id') id: string) {
    return this.loginAttemptService.findOne(id);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'LoginAttempt' })
  findAll() {
    return this.loginAttemptService.findAll();
  }
}
