import {
  Body,
  Controller,
  Delete,
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
import { CreateStrategyProjectDto, UpdateStrategyProjectDto } from './dto/strategy.dto';
import { StrategyService } from './strategy.service';

@Controller('strategy/projects')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'StrategyProject' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.strategyService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'StrategyProject' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.strategyService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'StrategyProject' })
  create(@Body() dto: CreateStrategyProjectDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.strategyService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'StrategyProject' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyProjectDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.strategyService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'StrategyProject' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.strategyService.remove(id, viewer);
  }
}
