import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eUserRow,
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock } from './helpers/auth-prisma.mock';
import { createAuthE2eApp, type E2eAppContext } from './helpers/create-e2e-app';
import { BudgetStatus } from '../src/generated/prisma/client';

describe('Budget workflow (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  const budgetId = 'budget-pending';
  const budgetFixture = {
    id: budgetId,
    subsidiaryOrganizationId: 'org-sub',
    year: 2026,
    month: 5,
    status: BudgetStatus.PENDING_APPROVAL,
    financeNote: 'Proposition finance',
    lines: [{ id: 'line-1', category: 'STOCK', nature: 'VARIABLE' }],
  };

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);

    prismaMock.budget = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === budgetId) {
          return Promise.resolve(budgetFixture);
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ ...budgetFixture, ...data }),
      ),
    };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /budget/:id/approve retourne 401 sans session', async () => {
    await request(app.getHttpServer())
      .post(`/budget/${budgetId}/approve`)
      .expect(401);
  });

  it('POST /budget/:id/approve valide un budget en attente (ADMIN)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.post(`/budget/${budgetId}/approve`).expect(201);
    expect(res.body.status).toBe(BudgetStatus.APPROVED);
    expect(ctx.prisma.budget?.update).toHaveBeenCalled();
  });
});
