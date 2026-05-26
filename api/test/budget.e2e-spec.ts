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

describe('Budget (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  const budgetsFixture = [
    {
      id: 'budget-1',
      subsidiaryOrganizationId: 'org-main',
      year: 2026,
      month: 5,
      status: BudgetStatus.DRAFT,
      financeNote: null,
      submittedAt: null,
      submittedByUserId: null,
      submittedBy: null,
      approvedAt: null,
      approvedByUserId: null,
      approvedBy: null,
      rejectedAt: null,
      rejectedByUserId: null,
      rejectedBy: null,
      rejectionReason: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      subsidiaryOrganization: {
        id: 'org-sub',
        name: 'Filiale test',
        slug: 'filiale-test',
        organizationType: 'SUBSIDIARY' as const,
      },
      lines: [],
    },
  ];

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);
    prismaMock.budget = {
      findMany: jest.fn().mockResolvedValue(budgetsFixture),
      count: jest.fn().mockResolvedValue(budgetsFixture.length),
    };
    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /budget retourne 401 sans session', async () => {
    await request(app.getHttpServer()).get('/budget').expect(401);
  });

  it('GET /budget retourne la liste pour un ADMIN authentifié', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/budget').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      id: budgetsFixture[0].id,
      year: 2026,
      month: 5,
    });
  });
});
