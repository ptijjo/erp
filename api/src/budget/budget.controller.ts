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
import { BudgetExpenseService } from './budget-expense.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { CreateBudgetExpenseDto } from './dto/budget-expense.dto';

@Controller('budget')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BudgetController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly budgetExpenseService: BudgetExpenseService,
  ) {}

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

  @Get(':budgetId/expenses')
  @CheckPolicies({ action: 'read', subject: 'Budget' })
  findExpenses(
    @Param('budgetId') budgetId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetExpenseService.findByBudget(budgetId, viewer);
  }

  @Post(':budgetId/lines/:lineId/expenses')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  recordExpense(
    @Param('budgetId') budgetId: string,
    @Param('lineId') lineId: string,
    @Body() dto: CreateBudgetExpenseDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetExpenseService.recordExpense(
      budgetId,
      lineId,
      dto,
      viewer,
    );
  }

  @Delete('expenses/:expenseId')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  removeExpense(
    @Param('expenseId') expenseId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetExpenseService.remove(expenseId, viewer);
  }
}
