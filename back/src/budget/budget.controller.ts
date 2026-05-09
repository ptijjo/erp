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
import { BudgetService } from './budget.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@Controller('budget')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Budget' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.budgetService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Budget' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Budget' })
  create(
    @Body() dto: CreateBudgetDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.update(id, dto, viewer);
  }

  @Post(':id/approve')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  approve(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.approve(id, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Budget' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.remove(id, viewer);
  }
}
