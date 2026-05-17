import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreatePoleDto } from './dto/create-pole.dto';
import { PoleService } from './pole.service';

@Controller('poles')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PoleController {
  constructor(private readonly poleService: PoleService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Pole' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.poleService.findAll(viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Pole' })
  create(
    @Body() dto: CreatePoleDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.poleService.create(dto, viewer);
  }
}
