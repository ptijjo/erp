import { Test, TestingModule } from '@nestjs/testing';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { BudgetExpenseService } from './budget-expense.service';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';
import type { AuthenticatedUser } from '../auth/auth.types';

const viewer: AuthenticatedUser = {
  sub: 'u-main',
  email: 'dg@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'ADMIN',
    description: null,
    poleCode: null,
  },
};

describe('BudgetController', () => {
  let controller: BudgetController;
  let budgetService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    remove: jest.Mock;
  };
  let budgetExpenseService: {
    findByBudget: jest.Mock;
    recordExpense: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    budgetService = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'budget-1' }),
      create: jest.fn().mockResolvedValue({ id: 'budget-new' }),
      update: jest.fn().mockResolvedValue({ id: 'budget-1' }),
      approve: jest.fn().mockResolvedValue({ id: 'budget-1', status: 'APPROVED' }),
      remove: jest.fn().mockResolvedValue({ ok: true }),
    };
    budgetExpenseService = {
      findByBudget: jest.fn().mockResolvedValue([]),
      recordExpense: jest.fn().mockResolvedValue({ id: 'exp-1' }),
      remove: jest.fn().mockResolvedValue({ id: 'exp-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        { provide: BudgetService, useValue: budgetService },
        { provide: BudgetExpenseService, useValue: budgetExpenseService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<BudgetController>(BudgetController);
  });

  it('délègue findAll au service', async () => {
    await controller.findAll(viewer);
    expect(budgetService.findAll).toHaveBeenCalledWith(viewer);
  });

  it('délègue findOne au service', async () => {
    await controller.findOne('budget-1', viewer);
    expect(budgetService.findOne).toHaveBeenCalledWith('budget-1', viewer);
  });

  it('délègue create au service', async () => {
    const dto = {
      subsidiaryOrganizationId: 'org-sub',
      year: 2026,
      month: 1,
      lines: [{ category: 'LOYER' as const, label: 'Loyer', amountPlanned: 100 }],
    };
    await controller.create(dto, viewer);
    expect(budgetService.create).toHaveBeenCalledWith(dto, viewer);
  });

  it('délègue update au service', async () => {
    const dto = {
      lines: [{ category: 'LOYER' as const, label: 'Loyer', amountPlanned: 100 }],
    };
    await controller.update('budget-1', dto, viewer);
    expect(budgetService.update).toHaveBeenCalledWith('budget-1', dto, viewer);
  });

  it('délègue approve au service', async () => {
    await controller.approve('budget-1', viewer);
    expect(budgetService.approve).toHaveBeenCalledWith('budget-1', viewer);
  });

  it('délègue remove au service', async () => {
    await controller.remove('budget-1', viewer);
    expect(budgetService.remove).toHaveBeenCalledWith('budget-1', viewer);
  });

  it('délègue findExpenses au service', async () => {
    await controller.findExpenses('budget-1', viewer);
    expect(budgetExpenseService.findByBudget).toHaveBeenCalledWith(
      'budget-1',
      viewer,
    );
  });

  it('délègue recordExpense au service', async () => {
    const dto = { amount: 100, label: 'Loyer' };
    await controller.recordExpense('budget-1', 'line-1', dto, viewer);
    expect(budgetExpenseService.recordExpense).toHaveBeenCalledWith(
      'budget-1',
      'line-1',
      dto,
      viewer,
    );
  });

  it('délègue removeExpense au service', async () => {
    await controller.removeExpense('exp-1', viewer);
    expect(budgetExpenseService.remove).toHaveBeenCalledWith('exp-1', viewer);
  });
});
