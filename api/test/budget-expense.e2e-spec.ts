import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eSubsidiaryUserRow,
  E2E_SUBSIDIARY_EMAIL,
  E2E_SUBSIDIARY_ORG_ID,
  E2E_SUBSIDIARY_ROLE_ID,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock } from './helpers/auth-prisma.mock';
import { createAuthE2eApp, type E2eAppContext } from './helpers/create-e2e-app';
import { BudgetStatus } from '../src/generated/prisma/client';

describe('BudgetExpense (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  const budgetId = 'e2e-budget-approved';
  const lineId = 'e2e-line-loyer';
  const spentAt = new Date('2026-05-15T10:00:00.000Z');

  const expenseFixture = {
    id: 'e2e-expense-1',
    budgetLineId: lineId,
    amount: 250,
    label: 'Loyer mai',
    spentAt,
    recordedByUserId: 'e2e-subsidiary-user-id',
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
    updatedAt: new Date('2026-05-15T10:00:00.000Z'),
    budgetLine: {
      id: lineId,
      label: 'Loyer siège',
      category: 'LOYER',
      budgetId,
    },
    recordedBy: {
      id: 'e2e-subsidiary-user-id',
      email: E2E_SUBSIDIARY_EMAIL,
    },
  };

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);

    const prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [
          { permission: { name: 'read:Budget' } },
          { permission: { name: 'read:BudgetExpense' } },
          { permission: { name: 'create:BudgetExpense' } },
          { permission: { name: 'delete:BudgetExpense' } },
        ],
      },
    });

    prismaMock.budgetLine = {
      findUnique: jest.fn().mockResolvedValue({
        id: lineId,
        budgetId,
        category: 'LOYER',
        nature: 'FIXED',
        label: 'Loyer siège',
        amountPlanned: 1000,
        budget: {
          id: budgetId,
          status: BudgetStatus.APPROVED,
          subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
        },
      }),
    };

    prismaMock.budgetExpense = {
      create: jest.fn().mockResolvedValue(expenseFixture),
      findMany: jest.fn().mockResolvedValue([expenseFixture]),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 'e2e-expense-1' }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    };

    prismaMock.budget = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: budgetId,
        status: BudgetStatus.APPROVED,
        subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
      }),
    };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST sortie retourne 401 sans session', async () => {
    await request(app.getHttpServer())
      .post(`/budget/${budgetId}/lines/${lineId}/expenses`)
      .send({ amount: 250, label: 'Loyer mai' })
      .expect(401);
  });

  it('POST sortie enregistre une dépense pour la filiale authentifiée', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .post(`/budget/${budgetId}/lines/${lineId}/expenses`)
      .send({ amount: 250, label: 'Loyer mai', spentAt: spentAt.toISOString() })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 'e2e-expense-1',
      budgetLineId: lineId,
      amount: 250,
      label: 'Loyer mai',
      recordedByUserId: 'e2e-subsidiary-user-id',
    });
    expect(ctx.prisma.budgetExpense?.create).toHaveBeenCalled();
  });

  it('GET /budget/:id/expenses liste les sorties pour la filiale', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get(`/budget/${budgetId}/expenses`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'e2e-expense-1',
      label: 'Loyer mai',
    });
    expect(res.body[0].spentAt).toBe(spentAt.toISOString());
  });

  it('DELETE /budget/expenses/:id refuse une sortie liée à une commande stock', async () => {
    const stockLinkedExpense = {
      ...expenseFixture,
      id: 'e2e-expense-stock',
      stockOrderId: 'e2e-order-1',
    };
    ctx.prisma.budgetExpense!.findUnique = jest
      .fn()
      .mockResolvedValue({
        id: stockLinkedExpense.id,
        stockOrderId: stockLinkedExpense.stockOrderId,
        budgetLine: {
          budget: {
            subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
            status: BudgetStatus.APPROVED,
          },
        },
      });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .delete(`/budget/expenses/${stockLinkedExpense.id}`)
      .expect(400);

    expect(res.body.message).toContain('commande stock');
    expect(ctx.prisma.budgetExpense?.delete).not.toHaveBeenCalled();
  });

  it('DELETE /budget/expenses/:id supprime une sortie manuelle', async () => {
    ctx.prisma.budgetExpense!.findUnique = jest.fn().mockResolvedValue({
      id: expenseFixture.id,
      stockOrderId: null,
      budgetLine: {
        budget: {
          subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
          status: BudgetStatus.APPROVED,
        },
      },
    });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    await agent.delete(`/budget/expenses/${expenseFixture.id}`).expect(200);
    expect(ctx.prisma.budgetExpense?.delete).toHaveBeenCalledWith({
      where: { id: expenseFixture.id },
    });
  });
});
