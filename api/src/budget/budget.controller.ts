import {
  Body,
  Controller,
  Delete,
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
import { BudgetService } from './budget.service';
import { BudgetExpenseService } from './budget-expense.service';
import { BudgetSupplementService } from './budget-supplement.service';
import { BudgetOverviewService } from './budget-overview.service';
import {
  BudgetOverviewQueryDto,
  ListBudgetQueryDto,
} from './dto/budget-query.dto';
import {
  CreateBudgetDto,
  RejectBudgetDto,
  SubmitBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';
import { CreateBudgetExpenseDto } from './dto/budget-expense.dto';
import {
  CreateBudgetSupplementDto,
  RejectBudgetSupplementDto,
  ReviewBudgetSupplementDto,
} from './dto/budget-supplement.dto';

@Controller('budget')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BudgetController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly budgetExpenseService: BudgetExpenseService,
    private readonly budgetSupplementService: BudgetSupplementService,
    private readonly budgetOverviewService: BudgetOverviewService,
  ) {}

  @Get('overview')
  @CheckPolicies({ action: 'read', subject: 'Budget' })
  getOverview(
    @Query() query: BudgetOverviewQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetOverviewService.getOverview(viewer, query);
  }

  @Get('expenses/ledger')
  @CheckPolicies({ action: 'read', subject: 'BudgetExpense' })
  findExpenseLedger(@CurrentUser() viewer: AuthenticatedUser) {
    return this.budgetExpenseService.findExpenseLedger(viewer);
  }

  @Get('supplement-requests')
  @CheckPolicies({ action: 'read', subject: 'BudgetSupplementRequest' })
  findAllSupplements(@CurrentUser() viewer: AuthenticatedUser) {
    return this.budgetSupplementService.findAll(viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Budget' })
  findAll(
    @Query() query: ListBudgetQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.findAll(viewer, query);
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

  @Post(':id/submit')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitBudgetDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.submitForApproval(id, dto, viewer);
  }

  @Post(':id/approve')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  approve(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.approve(id, viewer);
  }

  @Post(':id/reject')
  @CheckPolicies({ action: 'update', subject: 'Budget' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectBudgetDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetService.reject(id, dto, viewer);
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
  @CheckPolicies({ action: 'read', subject: 'BudgetExpense' })
  findExpenses(
    @Param('budgetId') budgetId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetExpenseService.findByBudget(budgetId, viewer);
  }

  @Post(':budgetId/supplement-requests')
  @CheckPolicies({ action: 'create', subject: 'BudgetSupplementRequest' })
  createSupplement(
    @Param('budgetId') budgetId: string,
    @Body() dto: CreateBudgetSupplementDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetSupplementService.create(budgetId, dto, viewer);
  }

  @Post(':budgetId/lines/:lineId/expenses')
  @CheckPolicies({ action: 'create', subject: 'BudgetExpense' })
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

  @Post('supplement-requests/:id/submit')
  @CheckPolicies({ action: 'update', subject: 'BudgetSupplementRequest' })
  submitSupplement(
    @Param('id') id: string,
    @Body() dto: ReviewBudgetSupplementDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetSupplementService.submitToDirectors(id, dto, viewer);
  }

  @Post('supplement-requests/:id/approve')
  @CheckPolicies({ action: 'update', subject: 'BudgetSupplementRequest' })
  approveSupplement(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetSupplementService.approve(id, viewer);
  }

  @Post('supplement-requests/:id/reject')
  @CheckPolicies({ action: 'update', subject: 'BudgetSupplementRequest' })
  rejectSupplement(
    @Param('id') id: string,
    @Body() dto: RejectBudgetSupplementDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetSupplementService.reject(id, dto, viewer);
  }

  @Delete('expenses/:expenseId')
  @CheckPolicies({ action: 'delete', subject: 'BudgetExpense' })
  removeExpense(
    @Param('expenseId') expenseId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.budgetExpenseService.remove(expenseId, viewer);
  }
}
